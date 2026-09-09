# Verification

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
