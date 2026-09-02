import { access, readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const allowedReleaseStatuses = new Set(['compatible', 'incompatible', 'unknown'])
const requiredDshReleases = ['0.1.2-alpha.3', '0.1.2-alpha.4', '0.1.2-alpha.5']

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function fail(message) {
  console.error(`Package verification failed: ${message}`)
  process.exitCode = 1
}

const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const patchPath = packageJson.dsh?.bundle?.patch

if (typeof patchPath !== 'string' || patchPath.length === 0 || isAbsolute(patchPath) || patchPath.includes('..')) {
  fail('package.json must declare a safe package-local dsh.bundle.patch')
} else {
  const resolvedPatch = resolve(root, patchPath)
  if (relative(root, resolvedPatch).startsWith('..')) fail(`bundle patch leaves the repository: ${patchPath}`)
  else if (!(await exists(resolvedPatch))) fail(`bundle patch does not exist: ${patchPath}`)
  else {
    const patch = await readFile(resolvedPatch, 'utf8')
    const entryIds = [...patch.matchAll(/(?:^|\n)\s*- id:\s*['"]?([A-Za-z0-9][A-Za-z0-9._-]{0,95})['"]?\s*(?:\n|$)/g)]
      .map(match => match[1])
    if (patch.includes('disabled: true')) fail('bundle patch must not disable existing DSH entries')
    if (patch.includes('@deepseek-ai/')) fail('bundle patch must not replace protected DSH packages')
    if (entryIds.length !== 1 || entryIds[0] !== 'token-usage-counter') {
      fail(`bundle patch must add only token-usage-counter; found: ${entryIds.join(', ') || 'none'}`)
    }
  }
}

if (packageJson.engines?.node !== '>=22.13.0') fail('engines.node must declare >=22.13.0')
if (packageJson.dsh?.compatibility?.dsh !== '>=0.1.2-alpha.3 <=0.1.2-alpha.5') {
  fail('dsh.compatibility.dsh must match the tested release window')
}
const releases = packageJson.dsh?.compatibility?.dshReleases ?? {}
for (const release of requiredDshReleases) {
  if (!allowedReleaseStatuses.has(releases[release])) {
    fail(`dsh.compatibility.dshReleases.${release} must be compatible, incompatible, or unknown`)
  }
}
if (!Object.values(releases).includes('compatible')) {
  fail('at least one exact DSH release must have verified compatible status')
}

const hostSource = await readFile(resolve(root, 'src/index.ts'), 'utf8')
const clientSource = await readFile(resolve(root, 'src/client/index.tsx'), 'utf8')
for (const [label, source] of [['host', hostSource], ['client', clientSource]]) {
  if (!source.includes('dsh-token-usage-counter')) fail(`${label} must use the plugin-owned settings namespace`)
  if (source.includes('settingsNamespace') || source.includes("USAGE_STATS_NAMESPACE = 'usage-stats'")) {
    fail(`${label} still uses the built-in usage-stats settings namespace`)
  }
}

const builtHost = await readFile(resolve(root, 'lib/index.js'), 'utf8')
const builtClient = await readFile(resolve(root, 'lib/client.js'), 'utf8')
for (const [label, bundle] of [['host bundle', builtHost], ['client bundle', builtClient]]) {
  if (!bundle.includes('dsh-token-usage-counter')) fail(`${label} is stale or lacks the plugin-owned namespace`)
  if (bundle.includes('settingsNamespace')) fail(`${label} still imports the removed settingsNamespace helper`)
}

for (const path of [
  'lib/index.js',
  'lib/client.js',
  'lib/client.js.map',
  'README.md',
  'README.zh.md',
  'docs/VERIFICATION.md',
  'LICENSE',
]) {
  if (!(await exists(resolve(root, path)))) fail(`required file does not exist: ${path}`)
}

if (process.exitCode !== 1) console.log('Package contract, additive Bundle patch, and compatibility declarations are valid.')
