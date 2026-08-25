# Token Usage Counter for DeepSeek Harness

Persistent provider-reported token usage statistics for DeepSeek Harness. The
plugin keeps uncached input, cache read, cache write, and output usage in
separate buckets, and exposes cumulative, daily, per-session, and per-model
views.

## Features

| Capability | Description |
| --- | --- |
| Accurate buckets | Keeps the four provider-reported usage buckets separate. |
| Persistent totals | Stores data in the Harness usage-stats settings namespace. |
| Multiple views | Provides global, session, and provider/model summaries. |
| Daily activity | Tracks local-day token totals and call counts. |
| Built-in settings page | Ships its own Web settings view and heatmap. |
| Safe commits | Counts usage only after a successful completion anchor. |
| Interactive command | Registers /tokens when the commands service is mounted. |

## Install

Install the published DSH Bundle into the web profile:

    dsh plugin --profile web add -w --config.auto-install-peers=false dsh-token-usage-counter
    dsh web

The Bundle disables the built-in usage accumulator and usage page before
mounting this plugin, avoiding duplicate settings registration.

## Local development

From this checkout:

    dsh web --patch ./cordis.yml

The local overlay disables the built-in usage accumulator and mounts
src/index.ts. For a manual composition, insert the plugin and disable the
stock usage-stats loader:

    - id: usage-stats
      disabled: true

    - insert:
        - id: token-usage-counter
          name: './src/index.ts'

## Build

    npm install --ignore-scripts --legacy-peer-deps --no-package-lock
    npm run build

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
