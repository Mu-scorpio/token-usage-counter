import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Only accepts an already installed official CLI and an immutable packed Bundle.
const [cliArg, tarballArg] = process.argv.slice(2)
assert.ok(cliArg && tarballArg, 'Usage: node scripts/test-disposable.mjs CLI TARBALL')
const cli = resolve(cliArg)
const tarball = resolve(tarballArg)
const root = await mkdtemp(join(tmpdir(), 'token-counter-e3-'))
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/TOKEN|SECRET|PASSWORD|API_KEY/i.test(key)))
Object.assign(env, { DSH_HOME: join(root, 'home'), DSH_AGENTS_HOME: join(root, 'agents'), DSH_TELEMETRY_DISABLED: '1', CI: 'true' })
const run = args => new Promise((done, reject) => execFile(process.execPath, [cli, ...args], {
  cwd: root, env, timeout: 180_000, maxBuffer: 8 * 1024 * 1024,
}, (error, stdout, stderr) => {
  // Do not print CLI output: startup/authentication output can contain tokens.
  if (error) reject(new Error(`Official CLI failed at ${args.slice(0, 4).join(' ')}: ${error.code}`))
  else done(stdout)
}))
let child
try {
  await mkdir(env.DSH_HOME)
  const version = (await run(['--version'])).trim()
  const baseline = await run(['--profile', 'web', '--dump-config'])
  const manifestPath = join(env.DSH_HOME, 'profiles/web/package.json')
  const baselineManifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  await run(['plugin', '--profile', 'web', 'add', '-w', '--ignore-scripts', tarball])
  const config = await run(['--profile', 'web', '--dump-config'])
  assert.equal((config.match(/id: token-usage-counter\b/g) ?? []).length, 1)
  assert.ok(config.includes('name: dsh-token-usage-counter'))
  // Every official row in the baseline must still exist in the same order.
  const rows = text => text.split('\n').filter(line => /^\s*(?:- )?(?:id|name):/.test(line))
  assert.deepEqual(rows(config).filter(line => !/token-usage-counter/.test(line)), rows(baseline))
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  assert.deepEqual(Object.keys(manifest.dependencies ?? {}).filter(name => name.startsWith('@deepseek-ai/')),
    Object.keys(baselineManifest.dependencies ?? {}).filter(name => name.startsWith('@deepseek-ai/')))
  const server = createServer()
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  const port = server.address().port
  await new Promise(done => server.close(done))
  const probe = join(root, 'probe.mjs')
  const probeResult = join(root, 'probe.json')
  await writeFile(probe, `import { writeFile } from 'node:fs/promises'
export const inject = ['tokenUsageCounter']
export async function apply(ctx) {
  // Synthetic successful events exercise both supported history readers.
  // These contain no provider credentials and make no provider requests.
  const events = [{ seq: 0, time: 1791676800000, type: 'assistant/message', data: {
    turn: 1, step: 1, message: { role: 'assistant', content: [], source: { provider: 'fixture', model: 'fixture' } },
    usage: { inputTokens: 10, outputTokens: 3, cacheReadTokens: 5, cacheWriteTokens: 2 },
  } }]
  if (process.env.DSH_TEST_BOOT === '1') for (const [id, history] of [['modern', { snapshotEvents: () => events }], ['legacy', { events }]]) {
    const session = { id, header: { createdAt: 1791676800000 }, ...history }
    ctx.tokenUsageCounter.adoptSession(session)
    ctx.tokenUsageCounter.adoptSession(session)
  }
  await writeFile(${JSON.stringify(probeResult)}, JSON.stringify(ctx.tokenUsageCounter.getSummary()))
}
`)
  const probePatch = join(root, 'probe.yml')
  await writeFile(probePatch, `- insert:\n    - id: token-counter-e3-probe\n      name: ${JSON.stringify(probe)}\n`)
  for (const boot of [1, 2]) {
  let output = ''
  child = spawn(process.execPath, [cli, '--profile', 'web', '--patch', probePatch, '--no-open', '--port', String(port)], { cwd: root, env: { ...env, DSH_TEST_BOOT: String(boot) }, stdio: ['ignore', 'pipe', 'pipe'] })
  const launch = await new Promise((done, reject) => {
    const timer = setTimeout(() => reject(new Error('Startup timed out')), 90_000)
    const append = chunk => {
      output = (output + chunk).slice(-128_000)
      const match = /dsh web: (http:\/\/[^\s]+)/.exec(output)
      if (match) { clearTimeout(timer); done(match[1]) }
    }
    child.stdout.on('data', append)
    child.stderr.on('data', append)
    child.once('error', () => { clearTimeout(timer); reject(new Error('Startup spawn failed')) })
    child.once('exit', code => {
      clearTimeout(timer)
      const diagnostics = output.split('\n').filter(line => /\[E\]|Error:|ERR_|Cannot |failed/i.test(line))
        .map(line => line.replace(/https?:\/\/\S+/g, '[URL]').replace(/(?:token|secret|password|authorization)\s*[:=]\s*\S+/gi, '[redacted]')).join('\n')
      reject(new Error(`Startup exited: ${code}\n${diagnostics}`))
    })
  })
  const login = await fetch(launch, { redirect: 'manual', signal: AbortSignal.timeout(10_000) })
  assert.ok([302, 303].includes(login.status))
  const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
  const page = await fetch(new URL(login.headers.get('location'), launch), { headers: { cookie }, signal: AbortSignal.timeout(10_000) })
  assert.equal(page.status, 200)
  assert.match(await page.text(), /<html/i)
  await new Promise(done => setTimeout(done, 2_000))
  assert.equal(child.exitCode, null, 'DSH must stay running')
  if (/\[E\]|Error:|cannot resolve|failed to (?:load|apply)/i.test(output)) throw new Error(output.replace(/https?:\/\/\S+/g, '[URL]'))
  let summary
  try { summary = JSON.parse(await readFile(probeResult, 'utf8')) }
  catch { throw new Error('Host probe unavailable:\n' + output.replace(/https?:\/\/\S+/g, '[URL]')) }
  assert.deepEqual(summary.totals, { inputTokens: 20, outputTokens: 6, cacheReadTokens: 10, cacheWriteTokens: 4, totalTokens: 40 })
  assert.equal(summary.calls, 2, 'Replaying the same histories must not double count')
  const endpoint = `http://127.0.0.1:${port}/api2/dsh-token-usage-counter/snapshot`
  const request = options => fetch(endpoint, { ...options, signal: AbortSignal.timeout(10_000) })
  assert.equal((await request()).status, 401)
  assert.equal((await request({ headers: { cookie, origin: 'https://evil.invalid' } })).status, 403)
  assert.equal((await request({ method: 'POST', headers: { cookie } })).status, 405)
  const response = await request({ headers: { cookie } })
  assert.equal(response.status, 200)
  const snapshot = await response.json()
  assert.equal(snapshot.totals.totalTokens, 40)
  assert.equal(snapshot.totals.calls, 2)
  assert.equal(snapshot.sessions, undefined, 'The Web projection must omit session records')
  const stopped = once(child, 'exit')
  child.kill('SIGTERM')
  await stopped
  child = undefined
  }
  await run(['plugin', '--profile', 'web', 'remove', '-w', 'dsh-token-usage-counter'])
  assert.equal(await run(['--profile', 'web', '--dump-config']), baseline,
    'Uninstall must restore the exact official composition')
  const after = JSON.parse(await readFile(manifestPath, 'utf8'))
  assert.equal(after.dependencies?.['dsh-token-usage-counter'], undefined)
  console.log(JSON.stringify({ version, install: 'passed', composition: 'passed', start: 'passed', hostService: 'passed', syntheticUsage: 'passed', restartPersistence: 'passed', authenticatedHttp: 200, unauthenticatedHttp: 401, crossOriginHttp: 403,
    uninstall: 'passed', rollback: 'unknown', realProfile: 'unchanged' }))
} finally {
  if (child?.exitCode === null) {
    const stopped = once(child, 'exit')
    child.kill('SIGKILL')
    await stopped
  }
  await rm(root, { recursive: true, force: true })
}
