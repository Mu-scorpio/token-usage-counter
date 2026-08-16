# Token Usage Counter

English | [中文](README.zh.md)

<div align="center">
  <h2>Know where every token goes.</h2>
  <p>A persistent, accurate usage counter for DeepSeek Harness.</p>
  <p>
    <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>
    · TypeScript · Cordis plugin · local-first analytics
  </p>
</div>

<p align="center">
  <img src="assets/usage-stats-overview.png" alt="Token usage dashboard in DeepSeek Harness" width="860">
</p>

<p align="center">
  <a href="https://github.com/Mu-scorpio/token-usage-counter"><img src="https://img.shields.io/badge/DeepSeek%20Harness-plugin-2563eb" alt="DeepSeek Harness plugin"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a" alt="MIT license"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-ready-3178c6" alt="TypeScript"></a>
</p>

`token-usage-counter` is a DeepSeek Harness plugin for accurate LLM token
analytics. It persists provider-reported usage across restarts and makes the
numbers available globally, by session, and by model—without counting failed
or retried attempts twice.

## Why this counter is different

| Capability | What you get |
| --- | --- |
| **Accurate buckets** | Uncached input, cache-hit input, cache writes, and output remain separate. |
| **Durable totals** | Statistics are persisted in the Harness `usage-stats` settings namespace. Restarting the harness does not reset them. |
| **Useful dimensions** | Inspect totals globally, per session, or per provider/model. |
| **Daily activity** | Feed the Web Settings summary and responsive heatmap with local-calendar-day data. |
| **Safe finalization** | Usage-only chunks are held until the matching successful message confirms them. |
| **Interactive command** | When `commands` is mounted, `/tokens` prints a readable live summary. |

## The dashboard

The companion Web Settings view is designed for quick scanning without hiding
the details:

- a three-row cumulative card for total tokens, uncached input, cached input,
  output tokens, and total calls;
- a dedicated **today** card for the current local day;
- a responsive 12–52 week activity heatmap that uses the available width;
- hover or keyboard focus for the exact daily total-token count and call count;
- an optional provider/model breakdown when model details are present.

<p align="center">
  <img src="assets/usage-stats-hover.png" alt="Daily total token tooltip on the usage heatmap" width="620">
</p>

Hover or focus a cell to see the exact local date, total tokens consumed, and
number of calls reported for that day.

## Install

Copy this directory into a location available to your Harness project, then
apply the included overlay:

```sh
dsh web --patch token-usage-counter/cordis.yml
```

Or add the plugin to your own `cordis.yml`:

```yaml
- name: './token-usage-counter/token-usage-counter.ts'
```

The plugin requires the `sessions` and `settings` services. The `/tokens`
command is enabled when the `commands` service is available.

> The included overlay disables the stock `usage-stats` row before mounting
> this plugin, because both components own the same settings namespace. If you
> mount the plugin manually, do not enable `@deepseek-ai/dsh-usage-stats` at
> the same time.

## API

The plugin exposes `ctx.tokenUsageCounter`:

```ts
ctx.tokenUsageCounter.getSummary()
ctx.tokenUsageCounter.getSession(sessionId)
ctx.tokenUsageCounter.getModel(provider, model)
ctx.tokenUsageCounter.formatSummary()
```

The summary contains global totals, provider/model totals, and session totals.
Each counter keeps the four disjoint provider-reported buckets plus
`totalTokens` and `calls`.

## Counting rules

The counter listens to the durable `session/event` stream and adopts sessions
that already exist when it loads. It commits usage on successful completion
anchors:

- `assistant/message.usage` is counted once;
- `compaction/summary.usage` is counted as a provider call too;
- a usage-only `assistant/chunk` stays pending until its matching
  `assistant/message` arrives;
- if a chunk and its final message both report usage for the same `(turn,
  step)`, the final value replaces the earlier sample;
- failed attempts, retries, and forked-session seed history are excluded from
  the totals.

This makes the numbers line up with completed provider work instead of raw
stream traffic.

## Keywords

DeepSeek Harness plugin · token usage counter · LLM token analytics · AI usage
statistics · prompt cache tracking · model usage dashboard · daily token
heatmap · TypeScript Cordis plugin · local-first observability · provider token
accounting

## License

MIT
