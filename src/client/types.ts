/** Browser-side view of the durable usage snapshot written by the host plugin. */

export interface UsageDailyStat {
  /** Local calendar date in YYYY-MM-DD form. */
  readonly date: string
  /** Uncached input tokens consumed that day. */
  readonly inputTokens?: number
  /** Output tokens consumed that day. */
  readonly outputTokens?: number
  /** Prompt cache read tokens consumed that day. */
  readonly cacheReadTokens?: number
  /** Prompt cache write tokens consumed that day. */
  readonly cacheWriteTokens?: number
  /** Total provider-reported tokens consumed that day. */
  readonly tokens: number
  /** Number of provider calls that reported usage that day. */
  readonly calls: number
}

export interface UsageTotals {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cacheReadTokens: number
  readonly cacheWriteTokens: number
  readonly totalTokens: number
  readonly calls: number
}

export interface UsageModelStat {
  readonly provider: string
  readonly model: string
  readonly counters: Omit<UsageTotals, 'calls'>
  readonly calls: number
}

export interface UsageStatsSnapshot {
  readonly totals: UsageTotals
  readonly daily: readonly UsageDailyStat[]
  readonly models?: readonly UsageModelStat[]
}

export interface UsageStatsScope {
  subscribe(callback: () => void): () => void
  getSnapshot(): { status: 'loading' | 'ready' | 'unavailable'; value?: UsageStatsSnapshot }
}
