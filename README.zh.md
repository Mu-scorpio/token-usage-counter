# Token 用量统计插件

为 DeepSeek Harness 提供持久、准确的 Provider 用量统计。插件将输入（未命中）、
输入（命中）、缓存写入和输出分开保存，并提供累计数据、每日数据、会话数据以及
Provider / 模型数据。

## 功能

| 能力 | 说明 |
| --- | --- |
| 精确分桶 | 保持四类 Provider 用量相互独立。 |
| 持久化累计 | 数据写入插件自有的 DSH storage domain，重启不会归零。 |
| 多维查看 | 支持全局、会话、Provider / 模型三个维度。 |
| 每日数据 | 统计本地日 Token 总量和调用次数。 |
| 自带设置页 | 提供 Web 设置视图和热力图。 |
| 安全提交 | 只有成功完成的锚点才会计入用量。 |
| 交互命令 | 挂载 commands 服务时提供 /tokens。 |

## 安装

在 npm 发布前安装本次 0.5.0 源码，请将 COMMIT 替换为已审核版本的完整
40 位提交哈希：

    dsh plugin --profile web add -w github:Mu-scorpio/token-usage-counter#COMMIT

以下 npm 命令安装独立发布的最新版本，可能与本次源码版本不同：

    dsh plugin --profile web add -w dsh-token-usage-counter
    dsh web

Bundle 现在只新增插件自有的 token-usage-counter 入口，不再禁用或替换 Harness
内置的 usage 累加器和页面。

0.4.0 将持久化数据从共享的 usage-stats 命名空间迁移到插件自有的
dsh-token-usage-counter 命名空间。由于原命名空间属于内置插件，旧版 0.3.x 的
累计数据不会被静默搬移；升级后本插件会从独立快照开始统计。

0.5.0 使用官方 storage-domain 服务，将统计保存在插件自有的
`dsh_token_usage_counter` domain；页面通过 DSH 浏览器鉴权读取汇总数据，
统计数据不再写入 Profile 配置表单。旧版插件自有 settings 数据不会自动复制；
DSH 仍保留的持久化会话历史可用于重建统计。权限说明见 [SECURITY.md](SECURITY.md)。

## 本地开发

在本仓库目录执行：

    dsh web --patch ./cordis.yml

本地 overlay 只挂载 src/index.ts，不替换任何内置组件。手动组合时只需新增插件
自有入口：

    - insert:
        - id: token-usage-counter
          name: './src/index.ts'

## 兼容性

- Node.js：22.13.0 或更高版本；
- DSH：0.5.0 Bundle 已在 0.2.0-rc.2、0.2.1-alpha.1、0.2.1-alpha.2 完成隔离安装、启动、持久化、鉴权和卸载检查；本次源码对旧版兼容性标为 unknown；
- Profile：web；
- 逐版本结果和一次性 Profile 的验证证据见 docs/VERIFICATION.md。


商城旧入口记录仍需重新审核，详见 [整改说明](docs/STORE-REMEDIATION.md)。

## 构建

    npm install --ignore-scripts --legacy-peer-deps --no-package-lock
    npm run build
    npm run verify

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
