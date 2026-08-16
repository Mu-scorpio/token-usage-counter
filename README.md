# Token 用量统计插件

为 DeepSeek Harness 提供持久、准确的 Token 用量统计。插件读取 provider
上报的真实用量，区分输入（未命中）、输入（命中）、缓存写入和输出，并提供
累计统计、今日数据、热力图、分模型统计以及 `/tokens` 命令。

<p align="center">
  <img src="assets/usage-stats-overview.png" alt="DeepSeek Harness 中的 Token 用量统计" width="860">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-token-usage-counter"><img src="https://img.shields.io/npm/v/dsh-token-usage-counter?color=2563eb&label=npm" alt="npm version"></a>
  <a href="https://github.com/Mu-scorpio/token-usage-counter"><img src="https://img.shields.io/badge/DeepSeek%20Harness-plugin-2563eb" alt="DeepSeek Harness plugin"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a" alt="MIT license"></a>
  <a href="README.zh.md"><img src="https://img.shields.io/badge/docs-中文-ef4444" alt="Chinese documentation"></a>
</p>

## 功能

| 能力 | 说明 |
| --- | --- |
| **精确分桶** | 输入（未命中）、输入（命中）、缓存写入和输出保持独立。 |
| **持久化累计** | 数据写入 Harness 的 `usage-stats` settings 命名空间，重启不会归零。 |
| **多维统计** | 支持全局、会话、Provider / 模型三个维度。 |
| **今日数据** | 单独展示当前本地日的 Token 用量和调用次数。 |
| **动态热力图** | 根据容器宽度在 12–52 周之间调整，避免右侧留下大片空白。 |
| **悬停详情** | 悬停或键盘聚焦热力图单元格，查看日期、总 Token 和调用次数。 |
| **安全提交** | 只在成功消息确认后提交 usage-only chunk，避免失败请求和重试重复计数。 |
| **交互命令** | 挂载 `commands` 服务时提供 `/tokens`，随时查看累计摘要。 |

<p align="center">
  <img src="assets/usage-stats-hover.png" alt="热力图显示每日总 Token 和调用次数" width="620">
</p>

## 安装

推荐安装已经发布到 npm 的 DSH Bundle。下面的命令会把插件安装到 `web`
profile，并自动维护 profile 的 Bundle 列表：

```sh
dsh plugin --profile web add dsh-token-usage-counter
```

安装后可以先检查最终配置，再启动 Web：

```sh
dsh --profile web --dump-config
dsh web
```

如果 pnpm 提示不能把依赖添加到 workspace 根目录，在当前 DSH 版本中加上
`-w`：

```sh
dsh plugin --profile web add -w dsh-token-usage-counter
```

Bundle 内含 `dsh.bundle` manifest 和 `cordis.patch.yml`。安装时会禁用内置的
host-side `usage-stats` 累加器，再挂载本插件；这样两套累加逻辑不会同时写入
同一个 settings 命名空间。

> Web 设置页的展示组件属于 Harness 自带的 `ui-usage-stats`，本插件提供的是
> 数据统计与持久化服务，不会重复安装一套前端页面。界面语言跟随 Harness 的
> 当前语言设置；本仓库默认 README 使用中文。

### 本地开发

直接使用 checkout 中的源码时，在仓库根目录执行：

```sh
dsh web --patch ./cordis.yml
```

或者在自己的 `cordis.yml` 中加入：

```yaml
- id: usage-stats
  disabled: true

- insert:
    - id: token-usage-counter
      name: './src/index.ts'
```

手动挂载时不要同时启用 `@deepseek-ai/dsh-usage-stats`，否则会产生 settings
命名空间冲突。

### 从源码构建

仓库提交了生成后的 `lib/index.js`，从 npm 或 GitHub 安装时不需要安装阶段的
构建授权。修改源码后，在仓库根目录执行：

```sh
pnpm install
pnpm build
```

## 统计规则

插件监听持久化的 `session/event` 事件流，并在加载时接管已经存在的会话。只有
成功完成的锚点才会提交用量：

- `assistant/message.usage` 只计入一次；
- `compaction/summary.usage` 也会作为一次 provider 调用计入；
- 单独的 `assistant/chunk` 会等待匹配的 `assistant/message` 到达；
- 同一个 `(turn, step)` 同时出现 chunk 和最终消息时，以最终值替换早期样本；
- 失败请求、重试请求和 fork 会话的种子历史不会重复计入。

因此页面展示的是已完成的 provider 工作量，而不是原始流事件数量。

## API

插件提供 `ctx.tokenUsageCounter`：

```ts
ctx.tokenUsageCounter.getSummary()
ctx.tokenUsageCounter.getSession(sessionId)
ctx.tokenUsageCounter.getModel(provider, model)
ctx.tokenUsageCounter.formatSummary()
```

摘要包含全局、Provider / 模型、会话三个层级的统计。每个计数器都保留四个互不
重叠的 provider 用量分桶，以及 `totalTokens` 和 `calls`。

## 搜索关键词

DeepSeek Harness 插件 · DSH plugin · Token 用量统计 · Token analytics · LLM
用量分析 · AI 用量统计 · Prompt Cache 追踪 · 模型用量仪表盘 · 每日 Token 热力图 ·
TypeScript Cordis 插件 · 本地优先可观测性 · Provider Token 计费

## 相关链接

- [npm 包](https://www.npmjs.com/package/dsh-token-usage-counter)
- [GitHub 仓库](https://github.com/Mu-scorpio/token-usage-counter)
- [DSH Bundle 安装文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)
- [DSH 社区插件目录 PR](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/896)

## 许可证

MIT
