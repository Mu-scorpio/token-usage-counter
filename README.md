# Token Usage Counter for DeepSeek Harness

Persistent provider-reported token usage statistics for DeepSeek Harness. The
plugin keeps uncached input, cache read, cache write, and output usage in
separate buckets, and exposes cumulative, daily, per-session, and per-model
views.

## Features

| Capability | Description |
| --- | --- |
| Accurate buckets | Keeps the four provider-reported usage buckets separate. |
| Persistent totals | Stores data in the plugin-owned dsh-token-usage-counter settings namespace. |
| Multiple views | Provides global, session, and provider/model summaries. |
| Daily activity | Tracks local-day token totals and call counts. |
| Built-in settings page | Ships its own Web settings view and heatmap. |
| Safe commits | Counts usage only after a successful completion anchor. |
| Interactive command | Registers /tokens when the commands service is mounted. |

## Install

Install the published DSH Bundle into the web profile:

    dsh plugin --profile web add -w --config.auto-install-peers=false dsh-token-usage-counter
    dsh web

The Bundle is additive: it mounts only the plugin-owned token-usage-counter
entry and leaves the built-in usage accumulator and page enabled.

Version 0.4.0 moves persistence from the shared usage-stats namespace to the
plugin-owned dsh-token-usage-counter namespace. Existing 0.3.x totals are not
silently migrated because the shared namespace belongs to the built-in plugin;
the new counter starts with an independent snapshot after the upgrade.

## Local development

From this checkout:

    dsh web --patch ./cordis.yml

The local overlay mounts src/index.ts without replacing built-in components.
For a manual composition, add only the plugin-owned entry:

    - insert:
        - id: token-usage-counter
          name: './src/index.ts'

## Compatibility

- Node.js: 22.13.0 or newer.
- DSH: 0.1.2-alpha.3 through 0.1.2-alpha.5.
- Profile: web.
- Exact per-release results and disposable-profile evidence are recorded in
  docs/VERIFICATION.md.

## Build

    npm install --ignore-scripts --legacy-peer-deps --no-package-lock
    npm run build
    npm run verify

The generated host and client bundles are committed under lib.

## Counting rules

The plugin listens to the durable session event stream:

- assistant/message.usage is counted once.
- compaction/summary.usage is counted as one provider call.
- A usage-only assistant/chunk is held until its matching assistant/message.
- When a chunk and final message describe the same turn and step, the final
  value replaces the early sample.
- Failed requests, retries, and fork seed history are not counted twice.

## API

The plugin provides ctx.tokenUsageCounter:

    ctx.tokenUsageCounter.getSummary()
    ctx.tokenUsageCounter.getSession(sessionId)
    ctx.tokenUsageCounter.getModel(provider, model)
    ctx.tokenUsageCounter.formatSummary()

## Links

- npm: https://www.npmjs.com/package/dsh-token-usage-counter
- GitHub: https://github.com/Mu-scorpio/token-usage-counter
- DSH Bundle documentation: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md

## License

MIT
