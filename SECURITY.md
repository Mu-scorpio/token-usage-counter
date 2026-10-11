# Permission and compatibility boundaries

The Bundle is an R1 Host + Client extension. It reads provider-reported usage
from the public DSH session store and optional session persistence service,
and writes aggregate counters through the official storage-domain service in
the plugin-owned `dsh_token_usage_counter` domain. The legacy settings adapter
uses only `dsh-token-usage-counter`. The Web settings section reads a read-only
aggregate endpoint authenticated by the existing DSH Connection authority.

The runtime does not open files directly, send telemetry, make provider
requests, spawn processes, or read API credentials. Its own Web endpoint serves
only authenticated same-origin aggregate reads; the Client polls it every five
seconds while mounted, cancels in-flight reads on disposal, and never sends data
to an external service. DSH owns the underlying
session/settings files and Web transport; this is persistent file access,
not a `files: none` permission. Model/provider/session identifiers and numeric
usage totals are stored; prompts, responses and credentials are not copied
into the counter snapshot. The optional `/tokens` command displays totals;
it does not execute shell commands.

Only `token-usage-counter` is inserted by the Bundle. Official usage entries
and the official `usage-stats` settings namespace remain owned by DSH. Optional
host peers are supplied by DSH; plugin installation must not add a second set
of official packages. The shipped `lib` bundles require no install/prepare
script or runtime dependency download.

Compatibility smoke checks use a freshly created `DSH_HOME` and
`DSH_AGENTS_HOME`, filter credential environment variables, bind Web to loopback,
and remove all fixture state in `finally`. They test composition, authenticated
HTTP, public counter service, synthetic usage and uninstall. Synthetic events
are fixtures, not a real provider-call test. Browser UI acceptance, real user
Profile behavior, upgrade rollback and an independent security audit remain
separate evidence gates.

The existing Host + Client design is retained because it supports both durable
accounting and a settings page using public APIs. A Host-only rewrite would
remove the existing page and would not address the Store's historical Catalog
identity mismatch. Restoring the old official-entry override would violate the
Bundle contract. The Catalog therefore needs a targeted baseline migration
and `user-reviewed` updates, with runtime/security evidence scoped to the
checks actually performed.
