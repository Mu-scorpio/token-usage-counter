# Token 用量统计插件

为 DeepSeek Harness 提供持久、准确的 Provider 用量统计。插件将输入（未命中）、
输入（命中）、缓存写入和输出分开保存，并提供累计数据、每日数据、会话数据以及
Provider / 模型数据。

## 功能

| 能力 | 说明 |
| --- | --- |
| 精确分桶 | 保持四类 Provider 用量相互独立。 |
| 持久化累计 | 数据写入 Harness 的 usage-stats settings 命名空间，重启不会归零。 |
| 多维查看 | 支持全局、会话、Provider / 模型三个维度。 |
| 每日数据 | 统计本地日 Token 总量和调用次数。 |
| 自带设置页 | 提供 Web 设置视图和热力图。 |
| 安全提交 | 只有成功完成的锚点才会计入用量。 |
| 交互命令 | 挂载 commands 服务时提供 /tokens。 |

## 安装

将已发布的 DSH Bundle 安装到 web profile：

    dsh plugin --profile web add -w --config.auto-install-peers=false dsh-token-usage-counter
    dsh web

Bundle 会先禁用 Harness 内置的 usage 累加器和页面，再挂载本插件，避免重复注册
同一个 settings 命名空间。

## 本地开发

在本仓库目录执行：

    dsh web --patch ./cordis.yml

本地 overlay 会禁用内置 usage 累加器并挂载 src/index.ts。手动组合时，请同时禁用
内置 usage-stats loader：

    - id: usage-stats
      disabled: true

    - insert:
        - id: token-usage-counter
          name: './src/index.ts'

## 构建

    pnpm install --config.auto-install-peers=false
    pnpm build

生成的宿主端和浏览器端 Bundle 位于 lib 目录，并随仓库提交。

## 统计规则

插件监听持久化的 session 事件流：

- assistant/message.usage 只计入一次；
- compaction/summary.usage 作为一次 Provider 调用计入；
- 单独的 assistant/chunk 会等待匹配的 assistant/message；
- 同一个 turn 和 step 同时出现 chunk 与最终消息时，以最终值替换早期样本；
- 失败请求、重试请求和 fork 会话的种子历史不会重复计入。

## API

插件提供 ctx.tokenUsageCounter：

    ctx.tokenUsageCounter.getSummary()
    ctx.tokenUsageCounter.getSession(sessionId)
    ctx.tokenUsageCounter.getModel(provider, model)
    ctx.tokenUsageCounter.formatSummary()

## 许可证

MIT
