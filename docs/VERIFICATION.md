# Verification

## 0.5.0 — current DSH API compatibility — 2026-10-11

Environment: macOS arm64, Node.js 24.16.0, pnpm 9.15.9. Each official npm
DSH version was installed independently with install scripts disabled. The
packed 0.5.0 Bundle was installed through the official CLI into a fresh
`DSH_HOME` and `DSH_AGENTS_HOME`; provider credential environment variables
were removed. No real user Profile was read or modified.

| DSH release | Install | Start/service | Restart persistence | Uninstall | Upgrade rollback |
| --- | --- | --- | --- | --- | --- |
| 0.2.0-rc.2 | passed | passed | passed | passed | unknown |
| 0.2.1-alpha.1 | passed | passed | passed | passed | unknown |
| 0.2.1-alpha.2 | passed | passed | passed | passed | unknown |

Reproduce against an independently installed exact official release:

    npm install --ignore-scripts --legacy-peer-deps --no-package-lock
    npm run build
    npm run verify
    npm pack --ignore-scripts
    node scripts/test-disposable.mjs /path/to/dsh/lib/bin.js /path/to/plugin.tgz

The same matrix runs in `.github/workflows/compatibility.yml` on Linux, Node 24.
The matrix is deliberately pinned: future DSH releases need new checks before
adding compatible declarations. Machine-readable local results are in
[evidence/0.5.0-smoke.json](evidence/0.5.0-smoke.json).

Each test asserts:

- Exactly one plugin-owned entry is added; every official row remains in the
  original order; no official package is added to the Profile dependencies.
- The public counter service consumes synthetic successful usage through both
  modern snapshotEvents() and legacy events readers. Two sessions total 40
  tokens (20 uncached input, 6 output, 10 cache read, 4 cache write), with two
  calls even after the same history is adopted again.
- A second cold boot without synthetic replay restores the same totals and
  calls from the official storage domain.
- The authenticated Web document and read-only aggregate endpoint return 200;
  unauthenticated requests return 401, cross-origin requests 403, writes 405.
  The Web projection omits per-session records.
- Uninstall removes the dependency and restores the exact baseline composed
  configuration. Fixture homes and processes are removed in finally.

Browser acceptance on 0.2.1-alpha.2: Playwright opened the isolated Web app,
skipped API-key onboarding, opened Settings → 用量统计, and read back cumulative
and daily counters, the heatmap and model section. The empty-data page rendered
with zero browser errors or warnings. [Screenshot](evidence/0.5.0-settings.png).

The test reproduced a real pre-fix failure: settings.register() no longer exists
in DSH 0.2. The 0.5.0 Host now persists via storageDomain and reads session
history through read-only handles; the Client no longer waits for the removed
settingsScope service. The legacy settings adapter remains for older hosts,
but historical compatible declarations are reset to unknown for this changed
source until separately retested.

These checks establish isolated install/runtime evidence. They do not exercise
a real provider call, a real user Profile, old-settings snapshot migration,
upgrade rollback or an independent security audit. They do not prove the Store
Catalog migration has merged or that the public marketplace has relisted it.

## Static audit interpretation

The build-dsh-plugin audit was run. Its generic regex treats CSS field
`card: 'dsh-token-usage-card'` as a Tool-card discriminant and log text mentioning
numeric token totals as credential logging. Source review confirms these are a
CSS class map and numeric usage logs; the plugin does not register a model Tool
or log API credentials. These findings require contextual review, not disabling
the scanner. The Store proposal uses conservative persistent-data permissions
and user-reviewed updates. See SECURITY.md for the permission boundaries.

## 0.4.3 DSH 0.1.6 session compatibility — 2026-09-15

- macOS arm64, Node.js 24.16.0, pnpm 9.15.9.
- DSH: local 0.1.6-alpha.1 source checkout at `0a15e36e7f`.
- Reproduced workspace selection rollback during `session/create`: DSH 0.1.6
  no longer exposes the legacy public `session.events` array.
- Updated the plugin to read `snapshotEvents()` on DSH 0.1.6 while retaining
  the `events` fallback for older supported DSH releases.
- Installed the packed plugin into the real web Profile and restarted DSH.
- A fresh isolated browser session selected `obsidian plugin`, created the
  initial session, and retained the selection with zero console errors or warnings.
- `pnpm build` and `pnpm verify`: passed.

The DSH source checkout was not modified; only the plugin package and the local
web Profile installation were changed for this regression test.

## 0.4.2 packaging regression — 2026-09-15

- macOS arm64, Node.js 24.16.0, pnpm 9.15.9.
- A packed 0.4.2 artifact installed into an empty consumer project with plain
  `pnpm add <tarball>`. Only `dsh-token-usage-counter` was installed; none of
  the DSH host packages were fetched as peer dependencies.
- An isolated DSH 0.1.5-rc.1 Profile passed add, composition, and remove using
  plain `dsh plugin --profile web add -w <tarball>`, without the former
  `--config.auto-install-peers=false` workaround.
- `pnpm build` and `pnpm verify`: passed.

This regression check covers packaging and plugin installation behavior only.
It does not add a runtime compatibility claim for DSH 0.1.5-rc.1.

## 0.4.1 — 2026-09-09

- macOS arm64, Node.js 24.16.0, pnpm 9.15.9.
- DSH: npm `@deepseek-ai/dsh@0.1.5-alpha.2`, installed into a temporary directory.
- Plugin: `npm pack --ignore-scripts` output for 0.4.1.
- Profile: isolated `DSH_HOME`, no real user Profile or provider credentials.
- Install: passed using `dsh plugin --profile web add -w --config.auto-install-peers=false <tarball>`.
- Composition: the Bundle adds `token-usage-counter` without editing official entries.
- Start: passed; authenticated URL redirected to the web document with HTTP 200
  (follow redirects and retain cookies). No startup error was logged.
- Uninstall: passed using `dsh plugin --profile web remove -w dsh-token-usage-counter`;
  both the dependency and composed Bundle entry were absent afterward.
- `npm run build` and `npm run verify`: passed.

This is an install/start/uninstall smoke check, not a provider-call or browser UI
functional test. The runtime bundles are unchanged from 0.4.0. Historical
0.1.2-alpha.3–alpha.5 results below apply to the 0.4.0 package; their compatible
source declarations are retained because host/client runtime code is unchanged.
0.1.2-rc.1, 0.1.3-alpha.1, 0.1.3-alpha.2 and 0.1.5-alpha.1 remain explicitly
`unknown`; the broad range is not evidence for those releases.

## Historical 0.4.0 verification

This file records disposable-profile compatibility checks for release 0.4.0.
Each result below was produced from the packaged 0.4.0 tarball, not directly
from source files.

## Environment

- Verification date: 2026-09-03
- Operating system: Windows
- Node.js: 24.16.0
- Profile: disposable `web` profile under an isolated `DSH_HOME`

## Results

| DSH release | Install | Start | Uninstall | Result |
| --- | --- | --- | --- | --- |
| 0.1.2-alpha.3 | passed | HTTP 200 | passed | compatible |
| 0.1.2-alpha.4 | passed | HTTP 200 | passed | compatible |
| 0.1.2-alpha.5 | passed | HTTP 200 | passed | compatible |

For every release, the verification procedure was:

1. Set `DSH_HOME` to a new directory under the system temporary directory.
2. Create the release tarball with `npm pack`.
3. Install it with
   `dsh plugin --profile web add --config.auto-install-peers=false <tarball>`.
4. Run `dsh --profile web --dump-config`, confirm the additive
   `token-usage-counter` entry is present, and confirm the package does not
   disable a stock usage entry.
5. Start `dsh --profile web --no-open --port <ephemeral-port>` and request the
   token-bearing URL printed by DSH; the response was HTTP 200.
6. Run `dsh plugin --profile web remove dsh-token-usage-counter`, then confirm
   the dependency and Bundle were absent from the Profile manifest.
7. Delete the isolated `DSH_HOME`.

The DSH processes emitted no startup error for these checks. The procedure
does not exercise a real provider call or claim compatibility outside the
three listed releases.
