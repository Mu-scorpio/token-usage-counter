/**
 * Token usage counter plugin for DeepSeek Harness.
 *
 * This plugin watches the durable session event stream and accumulates
 * provider-reported token usage for every session in the process. It sums the
 * four disjoint TokenUsage buckets (uncached input, output, cache read, cache
 * write) and keeps per-session, per-model, and global totals.
 *
 * Usage is committed only on successful completion anchors: `assistant/message`
 * and `compaction/summary`. A usage-only `assistant/chunk` is kept as a pending
 * sample and committed only when the matching `assistant/message` arrives, so
 * failed or retried model attempts are not counted.
 *
 * It is intentionally independent of ctx.tokenMeter so it works in headless
 * compositions that mount the session store and settings. It also exposes the
 * totals as a small Cordis service (ctx.tokenUsageCounter) and, when the
 * commands service is present, registers /tokens for interactive display.
 *
 * @module token-usage-counter
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence'
import { settingsNamespace, type SettingsScope } from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-commands'

export interface TokenCounters {
  /** Uncached input tokens reported by the provider. */
  inputTokens: number
  /** Output tokens reported by the provider. */
  outputTokens: number
  /** Prompt cache read tokens reported by the provider. */
  cacheReadTokens: number
  /** Prompt cache write tokens reported by the provider. */
  cacheWriteTokens: number
  /** Sum of the four disjoint buckets. */
  totalTokens: number
}

export interface ModelTokenStats {
  /** Provider route that produced the usage. */
  provider: string
  /** Provider model id that produced the usage. */
  model: string
  /** Provider-reported token totals for this model. */
  counters: TokenCounters
  /** Number of provider calls that reported usage for this model. */
  calls: number
}

export interface SessionTokenStats {
  /** Durable session id. */
  sessionId: string
  /** Provider-reported token totals for this session. */
  counters: TokenCounters
  /** Number of provider calls that reported usage. */
  calls: number
  /** Per-model totals for this session. */
  models: ModelTokenStats[]
}

export interface TokenUsageSummary {
  /** Per-session totals, including sessions that have already been disposed. */
  sessions: SessionTokenStats[]
  /** Per-model totals across all observed sessions. */
  models: ModelTokenStats[]
  /** Global totals across all observed sessions. */
  totals: TokenCounters
  /** Total provider calls that reported usage. */
  calls: number
}

interface PersistedSessionRecord {
  sessionId: string
  consumedSeq: number
  counters: TokenCounters
  calls: number
  models: ModelTokenStats[]
  pending?: PersistedPendingUsage
  last?: PersistedStepUsage
}

interface PersistedDailyStat {
  date: string
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  tokens: number
  calls: number
}

interface PersistedPendingUsage {
  turn: number
  step: number
  counters: TokenCounters
}

interface PersistedStepUsage {
  turn: number
  step: number
  counters: TokenCounters
  provider: string
  model: string
  dateKey: string
}

interface PersistedSnapshot {
  totals: TokenCounters & { calls: number }
  calls: number
  daily: PersistedDailyStat[]
  models: ModelTokenStats[]
  sessions: PersistedSessionRecord[]
}

const COUNTERS_SCHEMA = z.object({
  inputTokens: z.number().step(1).min(0).default(0),
  outputTokens: z.number().step(1).min(0).default(0),
  cacheReadTokens: z.number().step(1).min(0).default(0),
  cacheWriteTokens: z.number().step(1).min(0).default(0),
  totalTokens: z.number().step(1).min(0).default(0),
})

const TOTALS_SCHEMA = z.object({
  inputTokens: z.number().step(1).min(0).default(0),
  outputTokens: z.number().step(1).min(0).default(0),
  cacheReadTokens: z.number().step(1).min(0).default(0),
  cacheWriteTokens: z.number().step(1).min(0).default(0),
  totalTokens: z.number().step(1).min(0).default(0),
  calls: z.number().step(1).min(0).default(0),
})

const DAILY_SCHEMA = z.object({
  date: z.string(),
  inputTokens: z.number().step(1).min(0).default(0),
  outputTokens: z.number().step(1).min(0).default(0),
  cacheReadTokens: z.number().step(1).min(0).default(0),
  cacheWriteTokens: z.number().step(1).min(0).default(0),
  tokens: z.number().step(1).min(0).default(0),
  calls: z.number().step(1).min(0).default(0),
})

const PENDING_USAGE_SCHEMA = z.object({
  turn: z.number().step(1).min(0),
  step: z.number().step(1).min(0),
  counters: COUNTERS_SCHEMA,
})

const STEP_USAGE_SCHEMA = z.object({
  turn: z.number().step(1).min(0),
  step: z.number().step(1).min(0),
  counters: COUNTERS_SCHEMA,
  provider: z.string(),
  model: z.string(),
  dateKey: z.string(),
})

const MODEL_SCHEMA = z.object({
  provider: z.string(),
  model: z.string(),
  counters: COUNTERS_SCHEMA,
  calls: z.number().step(1).min(0).default(0),
})

const SESSION_SCHEMA = z.object({
  sessionId: z.string(),
  consumedSeq: z.number().step(1).min(0).default(0),
  counters: COUNTERS_SCHEMA,
  calls: z.number().step(1).min(0).default(0),
  models: z.array(MODEL_SCHEMA).default([]),
  // Schemastery object fields are optional when they have no default; missing
  // values resolve to undefined and are omitted from the normalized object.
  pending: PENDING_USAGE_SCHEMA,
  last: STEP_USAGE_SCHEMA,
})

const TOKEN_USAGE_COUNTER_SCHEMA = z.object({
  totals: TOTALS_SCHEMA,
  calls: z.number().step(1).min(0).default(0),
  daily: z.array(DAILY_SCHEMA).default([]),
  models: z.array(MODEL_SCHEMA).default([]),
  sessions: z.array(SESSION_SCHEMA).default([]),
}) as unknown as z<PersistedSnapshot>

const TOKEN_USAGE_COUNTER_NAMESPACE = settingsNamespace('usage-stats')

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Read cumulative token usage tracked by this plugin. */
    tokenUsageCounter: TokenUsageCounter
  }
}

function emptyCounters(): TokenCounters {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0,
  }
}

function countersFromUsage(usage: TokenUsage): TokenCounters {
  const inputTokens = usage.inputTokens
  const outputTokens = usage.outputTokens
  const cacheReadTokens = usage.cacheReadTokens ?? 0
  const cacheWriteTokens = usage.cacheWriteTokens ?? 0
  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
  }
}

function normalizeCounters(counters: TokenCounters): TokenCounters {
  const inputTokens = counters.inputTokens
  const outputTokens = counters.outputTokens
  const cacheReadTokens = counters.cacheReadTokens
  const cacheWriteTokens = counters.cacheWriteTokens
  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
  }
}

function addCounters(left: TokenCounters, right: TokenCounters): TokenCounters {
  const inputTokens = left.inputTokens + right.inputTokens
  const outputTokens = left.outputTokens + right.outputTokens
  const cacheReadTokens = left.cacheReadTokens + right.cacheReadTokens
  const cacheWriteTokens = left.cacheWriteTokens + right.cacheWriteTokens
  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
  }
}

function subtractCounters(left: TokenCounters, right: TokenCounters): TokenCounters {
  const inputTokens = left.inputTokens - right.inputTokens
  const outputTokens = left.outputTokens - right.outputTokens
  const cacheReadTokens = left.cacheReadTokens - right.cacheReadTokens
  const cacheWriteTokens = left.cacheWriteTokens - right.cacheWriteTokens
  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
  }
}

function countersEqual(left: TokenCounters, right: TokenCounters): boolean {
  return left.inputTokens === right.inputTokens
    && left.outputTokens === right.outputTokens
    && left.cacheReadTokens === right.cacheReadTokens
    && left.cacheWriteTokens === right.cacheWriteTokens
    && left.totalTokens === right.totalTokens
}

function modelKey(provider: string, model: string): string {
  return `${provider}\u0000${model}`
}

function toDateKey(time: number): string {
  const date = new Date(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function snapshotModels(models: ReadonlyMap<string, ModelTokenStats>): ModelTokenStats[] {
  const result: ModelTokenStats[] = []
  for (const record of models.values()) {
    result.push({
      provider: record.provider,
      model: record.model,
      counters: { ...record.counters },
      calls: record.calls,
    })
  }
  result.sort((a, b) => a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model))
  return result
}

interface StepUsage {
  turn: number
  step: number
  counters: TokenCounters
  provider: string
  model: string
  dateKey: string
}

interface PendingUsage {
  turn: number
  step: number
  counters: TokenCounters
}

interface SessionRecord {
  /** Next session event seq this plugin has consumed. */
  consumedSeq: number
  /** Whether the initial history cursor has been chosen for this session. */
  initialized: boolean
  /** Last usage sample for the current (turn, step), to replace instead of double count. */
  last: StepUsage | null
  /** Latest usage-only chunk for a step that has not yet been confirmed by assistant/message. */
  pending: PendingUsage | null
  /** Provider-reported totals for this session. */
  counters: TokenCounters
  /** Provider calls that reported usage. */
  calls: number
  /** Per-model totals for this session. */
  models: Map<string, ModelTokenStats>
}

interface DailyRecord {
  counters: TokenCounters
  calls: number
}

interface SessionHistory {
  sessionId: string
  header: Session['header']
  events: readonly SessionEvent[]
  firstLiveSeq?: number
}

function addDailyRecord(
  daily: Map<string, DailyRecord>,
  dateKey: string,
  counters: TokenCounters,
  calls: number,
): void {
  const day = daily.get(dateKey)
  if (day === undefined) {
    daily.set(dateKey, { counters: { ...counters }, calls })
    return
  }
  day.counters.inputTokens += counters.inputTokens
  day.counters.outputTokens += counters.outputTokens
  day.counters.cacheReadTokens += counters.cacheReadTokens
  day.counters.cacheWriteTokens += counters.cacheWriteTokens
  day.counters.totalTokens += counters.totalTokens
  day.calls += calls
}

function removeDailyRecord(
  daily: Map<string, DailyRecord>,
  dateKey: string,
  counters: TokenCounters,
  calls: number,
): void {
  const day = daily.get(dateKey)
  if (day === undefined) return
  day.counters.inputTokens = Math.max(0, day.counters.inputTokens - counters.inputTokens)
  day.counters.outputTokens = Math.max(0, day.counters.outputTokens - counters.outputTokens)
  day.counters.cacheReadTokens = Math.max(0, day.counters.cacheReadTokens - counters.cacheReadTokens)
  day.counters.cacheWriteTokens = Math.max(0, day.counters.cacheWriteTokens - counters.cacheWriteTokens)
  day.counters.totalTokens = Math.max(0, day.counters.totalTokens - counters.totalTokens)
  day.calls = Math.max(0, day.calls - calls)
  if (day.counters.totalTokens === 0 && day.calls === 0) daily.delete(dateKey)
}

function historyFromSession(session: Session): SessionHistory {
  return {
    sessionId: session.id,
    header: session.header,
    events: session.events,
    firstLiveSeq: session.firstLiveSeq,
  }
}

function seedEndFor(history: SessionHistory): number {
  const boundary = history.firstLiveSeq ?? history.header.seedLength ?? 0
  return history.events[boundary]?.type === 'session/end-seed' ? boundary + 1 : boundary
}

export const name = 'token-usage-counter'
/** The plugin needs the session store and settings to persist across restarts. */
export const inject = ['sessions', 'settings']

export function apply(ctx: Context): void {
  ctx.plugin(TokenUsageCounter)
}

/**
 * Cordis service that owns the cumulative token accounting.
 *
 * The accounting is persisted through the settings document, so restarting the
 * harness does not reset the counters. It reflects every session this harness
 * process has observed, plus any state restored from the previous run.
 */
export class TokenUsageCounter extends Service {
  static inject = ['sessions', 'settings']

  private readonly records = new Map<string, SessionRecord>()
  private readonly modelRecords = new Map<string, ModelTokenStats>()
  private readonly daily = new Map<string, DailyRecord>()
  private totals = emptyCounters()
  private calls = 0
  private legacyBaseline = false
  private dailyNeedsBackfill = false
  private scope: SettingsScope<PersistedSnapshot> | undefined
  private persistTimer: ReturnType<typeof setTimeout> | undefined
  private persistChain: Promise<void> = Promise.resolve()

  constructor(ctx: Context) {
    super(ctx, 'tokenUsageCounter')

    // Restore cumulative counters from the settings document before adopting
    // live sessions, so restarting the harness does not reset or double count.
    const scope = ctx.settings.register(
      TOKEN_USAGE_COUNTER_NAMESPACE,
      TOKEN_USAGE_COUNTER_SCHEMA,
    )
    this.scope = scope
    this.hydrate(scope.get())

    // Hot reload / late mount: sessions that already exist do not re-emit
    // session/created, so adopt them from the store.
    const liveSessions = ctx.sessions.list()
    for (const session of liveSessions) this.adoptSession(session)
    if (this.dailyNeedsBackfill) {
      this.backfillDailyBreakdown(liveSessions.map(historyFromSession))
    }
    this.schedulePersist(0)

    // A cold web boot may have no live sessions yet. Read the durable session
    // index so a cleared snapshot can be rebuilt from all persisted history,
    // and so legacy daily totals can receive their field breakdown.
    ctx.inject(['sessionPersistence'], (persistenceCtx) => {
      void this.hydrateFromPersistence(persistenceCtx.sessionPersistence)
    })

    ctx.on('session/created', (session) => {
      this.adoptSession(session)
      this.schedulePersist()
    })

    ctx.on('session/event', (session) => {
      this.adoptSession(session)
      this.schedulePersist()
    })

    ctx.on('session/disposed', (session) => {
      const record = this.records.get(session.id)
      if (record === undefined) return
      this.ctx.logger.info(
        '[token-usage-counter] session %s closed; session total=%d, harness total=%d',
        session.id,
        record.counters.totalTokens,
        this.totals.totalTokens,
      )
      this.schedulePersist(0)
    })

    // Optional interactive display when a command adapter is mounted.
    ctx.inject(['commands'], (commandCtx) => {
      commandCtx.commands.register({
        name: 'tokens',
        description: 'Show cumulative DeepSeek Harness token usage by session and model',
        handler: () => ({
          kind: 'success',
          text: this.formatSummary(),
        }),
      })
    })

    ctx.effect(() => () => {
      if (this.persistTimer !== undefined) {
        clearTimeout(this.persistTimer)
        this.persistTimer = undefined
      }
      return this.persist()
    }, 'token-usage-counter: shutdown persist')
  }

  private async hydrateFromPersistence(persistence: SessionPersistence): Promise<void> {
    try {
      const headers = await persistence.list()
      const histories = new Map<string, SessionHistory>()
      for (const header of headers) {
        const inspection = await persistence.inspect(header.id)
        histories.set(String(header.id), {
          sessionId: String(header.id),
          header: inspection.meta,
          events: inspection.events,
        })
      }
      for (const session of this.ctx.sessions.list()) {
        histories.set(session.id, historyFromSession(session))
      }

      const ordered = [...histories.values()].sort((left, right) => (
        (left.header.seedLength ?? 0) - (right.header.seedLength ?? 0)
        || left.header.createdAt - right.header.createdAt
      ))
      const shouldAdoptColdHistory = this.records.size === 0
        && this.totals.totalTokens === 0
        && this.calls === 0
      if (shouldAdoptColdHistory) {
        for (const history of ordered) this.adoptHistory(history)
      }
      if (this.dailyNeedsBackfill) this.backfillDailyBreakdown(ordered)
      this.schedulePersist(0)
    } catch (error) {
      this.ctx.logger.warn('[token-usage-counter] failed to backfill persisted sessions: %o', error)
    }
  }

  private hydrate(snapshot: PersistedSnapshot): void {
    this.totals = normalizeCounters(snapshot.totals)
    // Older snapshots carried the call count in both places. Keep the larger
    // value when a partially-written snapshot left one copy stale.
    this.calls = Math.max(snapshot.totals.calls, snapshot.calls)
    this.legacyBaseline = snapshot.sessions.length === 0
      && (snapshot.totals.totalTokens > 0 || snapshot.calls > 0)
    this.daily.clear()
    this.dailyNeedsBackfill = false
    for (const day of snapshot.daily) {
      const counters = {
        inputTokens: day.inputTokens ?? 0,
        outputTokens: day.outputTokens ?? 0,
        cacheReadTokens: day.cacheReadTokens ?? 0,
        cacheWriteTokens: day.cacheWriteTokens ?? 0,
        totalTokens: day.tokens,
      }
      this.daily.set(day.date, { counters, calls: day.calls })
      if (day.tokens > 0
        && counters.inputTokens + counters.outputTokens + counters.cacheReadTokens + counters.cacheWriteTokens === 0) {
        this.dailyNeedsBackfill = true
      }
    }
    this.modelRecords.clear()
    for (const model of snapshot.models) {
      this.modelRecords.set(modelKey(model.provider, model.model), {
        provider: model.provider,
        model: model.model,
        counters: normalizeCounters(model.counters),
        calls: model.calls,
      })
    }

    this.records.clear()
    for (const session of snapshot.sessions) {
      const models = new Map<string, ModelTokenStats>()
      for (const model of session.models) {
        models.set(modelKey(model.provider, model.model), {
          provider: model.provider,
          model: model.model,
          counters: normalizeCounters(model.counters),
          calls: model.calls,
        })
      }
      this.records.set(session.sessionId, {
        consumedSeq: session.consumedSeq,
        initialized: true,
        last: session.last === undefined
          ? null
          : {
            turn: session.last.turn,
            step: session.last.step,
            counters: normalizeCounters(session.last.counters),
            provider: session.last.provider,
            model: session.last.model,
            dateKey: session.last.dateKey,
          },
        pending: session.pending === undefined
          ? null
          : {
            turn: session.pending.turn,
            step: session.pending.step,
            counters: normalizeCounters(session.pending.counters),
          },
        counters: normalizeCounters(session.counters),
        calls: session.calls,
        models,
      })
    }
  }

  private snapshot(): PersistedSnapshot {
    const sessions: PersistedSessionRecord[] = []
    for (const [sessionId, record] of this.records) {
      sessions.push({
        sessionId,
        consumedSeq: record.consumedSeq,
        counters: { ...record.counters },
        calls: record.calls,
        models: snapshotModels(record.models),
        ...record.pending === null
          ? {}
          : {
            pending: {
              turn: record.pending.turn,
              step: record.pending.step,
              counters: { ...record.pending.counters },
            },
          },
        ...record.last === null
          ? {}
          : {
            last: {
              turn: record.last.turn,
              step: record.last.step,
              counters: { ...record.last.counters },
              provider: record.last.provider,
              model: record.last.model,
              dateKey: record.last.dateKey,
            },
          },
      })
    }
    sessions.sort((a, b) => a.sessionId.localeCompare(b.sessionId))
    const daily = [...this.daily.entries()]
      .map(([date, day]) => ({
        date,
        inputTokens: day.counters.inputTokens,
        outputTokens: day.counters.outputTokens,
        cacheReadTokens: day.counters.cacheReadTokens,
        cacheWriteTokens: day.counters.cacheWriteTokens,
        tokens: day.counters.totalTokens,
        calls: day.calls,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
    return {
      totals: { ...this.totals, calls: this.calls },
      calls: this.calls,
      daily,
      models: snapshotModels(this.modelRecords),
      sessions,
    }
  }

  private schedulePersist(delayMs = 2_000): void {
    if (this.scope === undefined) return
    if (this.persistTimer !== undefined) clearTimeout(this.persistTimer)
    this.persistTimer = setTimeout(() => {
      this.persistTimer = undefined
      void this.persist()
    }, delayMs)
  }

  private persist(): Promise<void> {
    const scope = this.scope
    if (scope === undefined) return Promise.resolve()
    this.persistChain = this.persistChain
      .then(() => scope.replace(this.snapshot()))
      .catch(() => {})
    return this.persistChain
  }

  /**
   * Adopt a session and fold all events this plugin has not consumed yet.
   *
   * Sessions created from a persisted seed (resume/fork) carry their full
   * history in session.events; session/event only fires for events appended
   * after construction. The seq watermark lets a resumed session continue from
   * where a previous live instance of the same id stopped without double
   * counting its seed history.
   */
  private adoptHistory(history: SessionHistory): void {
    const record = this.recordFor(history.sessionId)
    const events = history.events
    if (!record.initialized) {
      // When replacing the old usage-stats plugin, its persisted snapshot has
      // totals but no per-session watermarks. The live session history has
      // already contributed to that aggregate, including an empty session
      // that may receive new events after this plugin mounts.
      if (this.legacyBaseline) {
        record.consumedSeq = events.length
      } else {
        const seedEnd = seedEndFor(history)
        // A fork copies provider events from its parent. The parent record is
        // the durable proof that this seed has already been counted, so start
        // the child at its first live event instead of charging the copy.
        if (seedEnd > 0
          && history.header.parentSession !== undefined
          && this.records.has(history.header.parentSession)) {
          record.consumedSeq = seedEnd
        }
      }
      record.initialized = true
    }
    while (record.consumedSeq < events.length) {
      // Contiguous session seqs mean array index and event.seq match.
      const event = events[record.consumedSeq]
      if (event === undefined) break
      this.consumeEvent(session.id, event)
      record.consumedSeq += 1
    }
  }

  adoptSession(session: Session): void {
    this.adoptHistory(historyFromSession(session))
  }

  /** Total usage summary, detached from internal mutable state. */
  getSummary(): TokenUsageSummary {
    const sessions: SessionTokenStats[] = []
    for (const [sessionId, record] of this.records) {
      sessions.push({
        sessionId,
        counters: { ...record.counters },
        calls: record.calls,
        models: snapshotModels(record.models),
      })
    }
    sessions.sort((a, b) => a.sessionId.localeCompare(b.sessionId))
    return {
      sessions,
      models: snapshotModels(this.modelRecords),
      totals: { ...this.totals },
      calls: this.calls,
    }
  }

  /** Per-session usage for one session id, or undefined when never observed. */
  getSession(sessionId: string): SessionTokenStats | undefined {
    const record = this.records.get(sessionId)
    if (record === undefined) return undefined
    return {
      sessionId,
      counters: { ...record.counters },
      calls: record.calls,
      models: snapshotModels(record.models),
    }
  }

  /** Per-model usage for a provider/model pair, or undefined when never observed. */
  getModel(provider: string, model: string): ModelTokenStats | undefined {
    const record = this.modelRecords.get(modelKey(provider, model))
    if (record === undefined) return undefined
    return {
      provider: record.provider,
      model: record.model,
      counters: { ...record.counters },
      calls: record.calls,
    }
  }

  /** Render a human-readable summary including per-model totals. */
  formatSummary(): string {
    const t = this.totals
    const lines = [
      `total tokens: ${t.totalTokens} (input ${t.inputTokens}, output ${t.outputTokens}, cache-read ${t.cacheReadTokens}, cache-write ${t.cacheWriteTokens}); ${this.calls} model calls across ${this.records.size} sessions`,
    ]
    for (const model of snapshotModels(this.modelRecords)) {
      const c = model.counters
      lines.push(
        `  ${model.provider}/${model.model}: ${c.totalTokens} tokens (input ${c.inputTokens}, output ${c.outputTokens}, cache-read ${c.cacheReadTokens}, cache-write ${c.cacheWriteTokens}); ${model.calls} calls`,
      )
    }
    return lines.join('\n')
  }

  private recordFor(sessionId: string): SessionRecord {
    let record = this.records.get(sessionId)
    if (record === undefined) {
      record = {
        consumedSeq: 0,
        initialized: false,
        last: null,
        pending: null,
        counters: emptyCounters(),
        calls: 0,
        models: new Map(),
      }
      this.records.set(sessionId, record)
    }
    return record
  }

  private modelRecordFor(
    models: Map<string, ModelTokenStats>,
    provider: string,
    model: string,
  ): ModelTokenStats {
    const key = modelKey(provider, model)
    let record = models.get(key)
    if (record === undefined) {
      record = {
        provider,
        model,
        counters: emptyCounters(),
        calls: 0,
      }
      models.set(key, record)
    }
    return record
  }

  private addDaily(dateKey: string, counters: TokenCounters, calls = 1): void {
    addDailyRecord(this.daily, dateKey, counters, calls)
  }

  private removeDaily(dateKey: string, counters: TokenCounters, calls = 1): void {
    removeDailyRecord(this.daily, dateKey, counters, calls)
  }

  /**
   * Reconstruct the per-day buckets for snapshots written before daily
   * breakdowns were persisted. The cumulative counters remain authoritative;
   * this pass only rebuilds the daily projection and verifies that it covers
   * the same usage before replacing the old total-only projection.
   */
  private backfillDailyBreakdown(histories: readonly SessionHistory[]): void {
    if (!this.dailyNeedsBackfill || histories.length === 0) return

    const rebuilt = new Map<string, DailyRecord>()
    const sessionIds = new Set(histories.map(history => history.sessionId))
    let rebuiltTotals = emptyCounters()
    let rebuiltCalls = 0

    const add = (time: number, counters: TokenCounters): void => {
      addDailyRecord(rebuilt, toDateKey(time), counters, 1)
      rebuiltTotals = addCounters(rebuiltTotals, counters)
      rebuiltCalls += 1
    }

    const remove = (timeKey: string, counters: TokenCounters): void => {
      removeDailyRecord(rebuilt, timeKey, counters, 1)
      rebuiltTotals = subtractCounters(rebuiltTotals, counters)
      rebuiltCalls = Math.max(0, rebuiltCalls - 1)
    }

    for (const history of histories) {
      const events = history.events
      const seedEnd = seedEndFor(history)
      const skipSeed = seedEnd > 0
        && history.header.parentSession !== undefined
        && (sessionIds.has(history.header.parentSession) || this.records.has(history.header.parentSession))
      const start = skipSeed ? seedEnd : 0
      let pending: PendingUsage | null = null
      let last: StepUsage | null = null

      for (let index = start; index < events.length; index += 1) {
        const event = events[index]
        if (event === undefined) continue

        const compaction = event as unknown as {
          type: 'compaction/summary'
          data: { usage?: TokenUsage }
        }
        if (compaction.type === 'compaction/summary') {
          if (compaction.data.usage !== undefined) add(event.time, countersFromUsage(compaction.data.usage))
          continue
        }

        if (event.type === 'assistant/chunk' && event.data.chunk.type === 'usage') {
          pending = {
            turn: event.data.turn,
            step: event.data.step,
            counters: countersFromUsage(event.data.chunk.usage),
          }
          continue
        }

        if (event.type === 'assistant/message') {
          const { turn, step, usage } = event.data
          const matchingPending = pending !== null && pending.turn === turn && pending.step === step
            ? pending
            : undefined
          const counters = usage === undefined
            ? matchingPending?.counters
            : countersFromUsage(usage)
          if (counters === undefined) {
            if (matchingPending !== undefined) pending = null
            continue
          }
          pending = null

          const previous = last !== null && last.turn === turn && last.step === step ? last : undefined
          if (previous !== undefined) {
            if (countersEqual(previous.counters, counters)) continue
            remove(previous.dateKey, previous.counters)
          }
          add(event.time, counters)
          last = {
            turn,
            step,
            counters,
            provider: 'unknown',
            model: 'unknown',
            dateKey: toDateKey(event.time),
          }
          continue
        }

        if (event.type === 'step/end' || event.type === 'turn/end') pending = null
      }
    }

    if (rebuiltCalls !== this.calls || !countersEqual(rebuiltTotals, this.totals)) {
      this.ctx.logger.warn(
        '[token-usage-counter] skipped daily breakdown migration: rebuilt usage does not match cumulative totals',
      )
      return
    }

    this.daily.clear()
    for (const [dateKey, day] of rebuilt) this.daily.set(dateKey, day)
    this.dailyNeedsBackfill = false
  }

  private addModelUsage(
    sessionModels: Map<string, ModelTokenStats>,
    provider: string,
    model: string,
    counters: TokenCounters,
  ): void {
    const sessionModel = this.modelRecordFor(sessionModels, provider, model)
    sessionModel.counters = addCounters(sessionModel.counters, counters)
    sessionModel.calls += 1
    const globalModel = this.modelRecordFor(this.modelRecords, provider, model)
    globalModel.counters = addCounters(globalModel.counters, counters)
    globalModel.calls += 1
  }

  private addUsage(
    record: SessionRecord,
    provider: string,
    model: string,
    counters: TokenCounters,
    time: number,
  ): void {
    record.counters = addCounters(record.counters, counters)
    this.totals = addCounters(this.totals, counters)
    record.calls += 1
    this.calls += 1
    this.addModelUsage(record.models, provider, model, counters)
    this.addDaily(toDateKey(time), counters, 1)
  }

  private replaceUsage(
    record: SessionRecord,
    previous: StepUsage,
    provider: string,
    model: string,
    counters: TokenCounters,
    time: number,
  ): void {
    const delta = subtractCounters(counters, previous.counters)
    record.counters = addCounters(record.counters, delta)
    this.totals = addCounters(this.totals, delta)
    this.removeDaily(previous.dateKey, previous.counters, 1)
    const dateKey = toDateKey(time)
    this.addDaily(dateKey, counters, 1)

    if (previous.provider === provider && previous.model === model) {
      const sessionModel = this.modelRecordFor(record.models, provider, model)
      sessionModel.counters = addCounters(sessionModel.counters, delta)
      const globalModel = this.modelRecordFor(this.modelRecords, provider, model)
      globalModel.counters = addCounters(globalModel.counters, delta)
    } else {
      const previousSessionModel = this.modelRecordFor(record.models, previous.provider, previous.model)
      previousSessionModel.counters = subtractCounters(previousSessionModel.counters, previous.counters)
      previousSessionModel.calls -= 1
      const previousGlobalModel = this.modelRecordFor(this.modelRecords, previous.provider, previous.model)
      previousGlobalModel.counters = subtractCounters(previousGlobalModel.counters, previous.counters)
      previousGlobalModel.calls -= 1
      this.addModelUsage(record.models, provider, model, counters)
    }

    record.last = {
      turn: previous.turn,
      step: previous.step,
      counters,
      provider,
      model,
      dateKey,
    }
  }

  private consumeEvent(sessionId: string, event: SessionEvent): void {
    // compaction/summary is declared by the optional compaction package; keep
    // this plugin dependency-free by observing its shape structurally.
    const compaction = event as unknown as {
      type: 'compaction/summary'
      data: { usage?: TokenUsage; provider?: string; model?: string }
    }
    if (compaction.type === 'compaction/summary') {
      if (compaction.data.usage === undefined) return
      const counters = countersFromUsage(compaction.data.usage)
      const record = this.recordFor(sessionId)
      this.addUsage(
        record,
        compaction.data.provider ?? 'unknown',
        compaction.data.model ?? 'unknown',
        counters,
        event.time,
      )
      return
    }

    if (event.type === 'assistant/chunk' && event.data.chunk.type === 'usage') {
      const { turn, step } = event.data
      const record = this.recordFor(sessionId)
      record.pending = {
        turn,
        step,
        counters: countersFromUsage(event.data.chunk.usage),
      }
      return
    }

    if (event.type === 'assistant/message') {
      const { turn, step, message, usage } = event.data
      const record = this.recordFor(sessionId)
      const pending = record.pending !== null
        && record.pending.turn === turn
        && record.pending.step === step
        ? record.pending
        : undefined
      const counters = usage !== undefined
        ? countersFromUsage(usage)
        : pending?.counters
      if (counters === undefined) {
        if (pending !== undefined) record.pending = null
        return
      }
      record.pending = null

      const provider = message.source?.provider ?? 'unknown'
      const model = message.source?.model ?? 'unknown'
      const previous = record.last !== null
        && record.last.turn === turn
        && record.last.step === step
        ? record.last
        : undefined

      if (previous !== undefined) {
        if (previous.provider === provider
          && previous.model === model
          && countersEqual(previous.counters, counters)) return
        this.replaceUsage(record, previous, provider, model, counters, event.time)
        return
      }

      this.addUsage(record, provider, model, counters, event.time)
      record.last = { turn, step, counters, provider, model, dateKey: toDateKey(event.time) }
      return
    }

    // A step/turn that closes without an assistant/message did not complete a
    // successful model call. Drop any pending usage-only chunk so it cannot be
    // accidentally attributed to a later step.
    if (event.type === 'step/end' || event.type === 'turn/end') {
      const record = this.records.get(sessionId)
      if (record !== undefined && record.pending !== null) {
        record.pending = null
      }
    }
  }
}

export default TokenUsageCounter
