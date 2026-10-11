# DSH Store remediation (2026-10-11)

The upstream package is additive. Do not restore the old `usage-stats`
override to satisfy the Store's identity comparison.

## Remaining Catalog blocker

The [Catalog](https://github.com/AI-Scarlett/DSH-Store/blob/main/registry/catalog.json)
still pins version 0.1.1 at `d9353a9dfb031f5d868e3c1b866f57147d428374`,
with `entryIds: ["usage-stats", "token-usage-counter"]`.
The current Bundle inserts only `token-usage-counter`. The old `usage-stats`
row modified an official entry; it was not a plugin-owned insertion.

[catalogUpdateIdentityMatches](https://github.com/AI-Scarlett/DSH-Store/blob/main/src/catalog-update-review.mjs)
requires exact equality of the sorted entry ID arrays. Consequently the Store
rejects this correction before it can import the newer compatibility matrix.
This explains the identity blocker in
[issue 285](https://github.com/AI-Scarlett/DSH-Store/issues/285).

The Store maintainer must re-review the corrected additive Bundle and refresh
the Catalog baseline to the new fixed commit, version and sole entry ID
`token-usage-counter`. Preserve independent runtime/security evidence as
unknown unless separately verified; the Catalog's old `files: none` claim
also needs review because this plugin reads retained session history and persists
plugin-owned usage through the official storage domain. The aggregate Web
endpoint is authenticated and same-origin. Updates require user review.
This is a Catalog migration, not permission to weaken identity checks for all
plugins. A normal upstream push alone cannot pass the current comparison.

## Upstream correction

- 0.5.0 adapts persistent storage, retained history and the Browser Client to
  the public DSH 0.2 APIs. Earlier settings APIs no longer exist on these hosts.
- The live official latest-three window is 0.2.0-rc.2, 0.2.1-alpha.1 and
  0.2.1-alpha.2. All three passed isolated install, startup, synthetic usage,
  replay deduplication, cold restart persistence, authenticated HTTP and uninstall.
- The manifest declares those exact releases compatible and includes operation
  records. Historical declarations and upgrade rollback remain unknown.
- A pinned Linux CI matrix reproduces the isolated checks for future changes.
- See [VERIFICATION.md](VERIFICATION.md) for actual smoke-check scope.

Publishing this upstream release does not modify the Store Catalog or post
a comment to the Store issue. The Catalog migration remains a separate step.
