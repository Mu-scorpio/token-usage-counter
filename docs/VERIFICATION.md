# Verification

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
