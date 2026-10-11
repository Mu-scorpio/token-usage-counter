import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageDailyStat, UsageStatsScope } from './types.ts'
import type { UsageStatsLocaleKey } from './locales.ts'

export interface UsageStatsSectionInjected {
  scope: UsageStatsScope
  t: (key: UsageStatsLocaleKey, params?: Record<string, string | number>) => string
}

export type UsageStatsSectionProps = PropsRuntime<'settings.section'> & InjectFace<UsageStatsSectionInjected>

const HEATMAP_MIN_WEEKS = 12
const HEATMAP_MAX_WEEKS = 52
const HEATMAP_TARGET_CELL_SIZE = 18
const HEATMAP_GAP = 4

const css = {
  section: 'dsh-token-usage-section',
  status: 'dsh-token-usage-status',
  card: 'dsh-token-usage-card',
  cardTitle: 'dsh-token-usage-card-title',
  totalRows: 'dsh-token-usage-total-rows',
  totalItem: 'dsh-token-usage-total-item',
  totalItemPrimary: 'dsh-token-usage-total-item-primary',
  totalRow: 'dsh-token-usage-total-row',
  totalValue: 'dsh-token-usage-total-value',
  totalLabel: 'dsh-token-usage-total-label',
  heatmapHeader: 'dsh-token-usage-heatmap-header',
  heatmapPeriod: 'dsh-token-usage-heatmap-period',
  heatmapLayout: 'dsh-token-usage-heatmap-layout',
  weekdayLabels: 'dsh-token-usage-weekday-labels',
  heatmapGraph: 'dsh-token-usage-heatmap-graph',
  monthLabels: 'dsh-token-usage-month-labels',
  heatmap: 'dsh-token-usage-heatmap',
  day: 'dsh-token-usage-day',
  legend: 'dsh-token-usage-legend',
  legendSwatch: 'dsh-token-usage-legend-swatch',
  modelTableWrap: 'dsh-token-usage-model-table-wrap',
  modelTable: 'dsh-token-usage-model-table',
} as const

interface MetricValues {
  totalTokens: number
  inputTokens: number
  cacheReadTokens: number
  outputTokens: number
  calls: number
}

interface HeatmapCell {
  key: string
  stat: UsageDailyStat | undefined
  level: number
}

function dateKeyOf(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfWeek(date: Date): Date {
  const mondayIndex = (date.getDay() + 6) % 7
  return addDays(date, -mondayIndex)
}

function heatmapWeeksForWidth(width: number): number {
  if (width <= 0) return HEATMAP_MIN_WEEKS
  const estimatedWeeks = Math.floor((width + HEATMAP_GAP) / (HEATMAP_TARGET_CELL_SIZE + HEATMAP_GAP))
  return Math.min(HEATMAP_MAX_WEEKS, Math.max(HEATMAP_MIN_WEEKS, estimatedWeeks))
}

function levelFor(tokens: number, minTokens: number, maxTokens: number): number {
  if (tokens <= 0 || maxTokens <= 0) return 0
  if (minTokens === maxTokens) return 3
  const ratio = (Math.log(tokens) - Math.log(minTokens)) / (Math.log(maxTokens) - Math.log(minTokens))
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

function metricsFromDaily(stat: UsageDailyStat | undefined): MetricValues {
  return {
    totalTokens: stat?.tokens ?? 0,
    inputTokens: stat?.inputTokens ?? 0,
    cacheReadTokens: stat?.cacheReadTokens ?? 0,
    outputTokens: stat?.outputTokens ?? 0,
    calls: stat?.calls ?? 0,
  }
}

function MetricItem({
  value,
  label,
  formatNumber,
  primary = false,
}: {
  value: number
  label: string
  formatNumber: (number: number) => string
  primary?: boolean
}): ReactNode {
  return (
    <div className={primary ? `${css.totalItem} ${css.totalItemPrimary}` : css.totalItem}>
      <strong className={css.totalValue}>{formatNumber(value)}</strong>
      <span className={css.totalLabel}>{label}</span>
    </div>
  )
}

function MetricRows({
  metrics,
  formatNumber,
  t,
}: {
  metrics: MetricValues
  formatNumber: (number: number) => string
  t: UsageStatsSectionInjected['t']
}): ReactNode {
  return (
    <div className={css.totalRows}>
      <MetricItem value={metrics.totalTokens} label={t('totalTokens')} formatNumber={formatNumber} primary />
      <div className={css.totalRow}>
        <MetricItem value={metrics.inputTokens} label={t('inputTokens')} formatNumber={formatNumber} />
        <MetricItem value={metrics.cacheReadTokens} label={t('cacheReadTokens')} formatNumber={formatNumber} />
      </div>
      <div className={css.totalRow}>
        <MetricItem value={metrics.outputTokens} label={t('outputTokens')} formatNumber={formatNumber} />
        <MetricItem value={metrics.calls} label={t('calls')} formatNumber={formatNumber} />
      </div>
    </div>
  )
}

/** Render the plugin-owned usage section in Web Settings. */
export function UsageStatsSection({ scope, t }: UsageStatsSectionProps): ReactNode {
  const subscribe = (callback: () => void): (() => void) => scope.subscribe(callback)
  const getSnapshot = (): ReturnType<UsageStatsScope['getSnapshot']> => scope.getSnapshot()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot)
  const heatmapGraphRef = useRef<HTMLDivElement>(null)
  const [heatmapWidth, setHeatmapWidth] = useState(0)

  useEffect(() => {
    const graph = heatmapGraphRef.current
    if (graph === null) return
    const updateWidth = (): void => {
      const nextWidth = graph.getBoundingClientRect().width
      setHeatmapWidth(previous => Math.abs(previous - nextWidth) < 0.5 ? previous : nextWidth)
    }
    updateWidth()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateWidth)
    observer.observe(graph)
    return () => observer.disconnect()
  }, [snapshot.status])

  if (snapshot.status === 'unavailable') {
    return (
      <div className={css.card}>
        <h3 className={css.cardTitle}>{t('unavailableTitle')}</h3>
        <p className={css.status}>{t('unavailableReason')}</p>
        <ul className={css.status}>
          <li>{t('unavailableFixInstall')}</li>
          <li>{t('unavailableFixRestart')}</li>
          <li>{t('unavailableFixLog')}</li>
        </ul>
      </div>
    )
  }
  if (snapshot.status === 'loading' || snapshot.value === undefined) {
    return (
      <div className={css.card}>
        <p className={css.status}>{t('loading')}</p>
        <p className={css.status}>{t('loadingHint')}</p>
      </div>
    )
  }

  const value = snapshot.value
  const daily = new Map(value.daily.map(day => [day.date, day] as const))
  const formatNumber = (number: number): string => number.toLocaleString()
  const heatmapWeeks = heatmapWeeksForWidth(heatmapWidth)
  const heatmapDays = heatmapWeeks * 7
  const heatmapCellSize = heatmapWidth > 0
    ? Math.max(10, (heatmapWidth - HEATMAP_GAP * (heatmapWeeks - 1)) / heatmapWeeks)
    : 14
  const heatmapStyle = {
    '--dsh-token-usage-weeks': heatmapWeeks,
    '--dsh-token-usage-cell-size': `${heatmapCellSize}px`,
  } as CSSProperties
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = dateKeyOf(today)
  const start = addDays(startOfWeek(today), -(heatmapWeeks - 1) * 7)
  const cells: HeatmapCell[] = Array.from({ length: heatmapDays }, (_, index) => {
    const date = addDays(start, index)
    const key = dateKeyOf(date)
    return { key, stat: daily.get(key), level: 0 }
  })
  const weekStarts = Array.from({ length: heatmapWeeks }, (_, index) => addDays(start, index * 7))
  const positiveTokens = cells.map(cell => cell.stat?.tokens ?? 0).filter(tokens => tokens > 0)
  const minTokens = positiveTokens.length > 0 ? Math.min(...positiveTokens) : 0
  const maxTokens = positiveTokens.length > 0 ? Math.max(...positiveTokens) : 0
  for (const cell of cells) cell.level = levelFor(cell.stat?.tokens ?? 0, minTokens, maxTokens)
  const hasVisibleData = cells.some(cell => (cell.stat?.tokens ?? 0) > 0 || (cell.stat?.calls ?? 0) > 0)
  const todayStat = daily.get(todayKey)
  const models = [...(value.models ?? [])].sort((a, b) => b.counters.totalTokens - a.counters.totalTokens)

  return (
    <div className={css.section}>
      <section className={css.card}>
        <h3 className={css.cardTitle}>{t('totalTitle')}</h3>
        <MetricRows metrics={{
          totalTokens: value.totals.totalTokens,
          inputTokens: value.totals.inputTokens,
          cacheReadTokens: value.totals.cacheReadTokens,
          outputTokens: value.totals.outputTokens,
          calls: value.totals.calls,
        }} formatNumber={formatNumber} t={t} />
      </section>

      <section className={css.card}>
        <h3 className={css.cardTitle}>{t('todayTitle')}</h3>
        <MetricRows metrics={metricsFromDaily(todayStat)} formatNumber={formatNumber} t={t} />
      </section>

      <section className={css.card}>
        <h3 className={css.cardTitle}>{t('heatmapTitle')}</h3>
        <div className={css.heatmapHeader}>
          <p className={css.status}>{t('heatmapHint', { weeks: heatmapWeeks })}</p>
          <span className={css.heatmapPeriod}>{t('heatmapPeriod', { weeks: heatmapWeeks })}</span>
        </div>
        <div className={css.heatmapLayout} style={heatmapStyle}>
          <div className={css.weekdayLabels} aria-hidden="true">
            <span>{t('weekdayMon')}</span>
            <span>{t('weekdayWed')}</span>
            <span>{t('weekdayFri')}</span>
          </div>
          <div className={css.heatmapGraph} ref={heatmapGraphRef}>
            <div className={css.monthLabels} aria-hidden="true">
              {weekStarts.map((weekStart, index) => {
                const previous = index === 0 ? undefined : weekStarts[index - 1]
                const monthChanged = previous === undefined || weekStart.getMonth() !== previous.getMonth()
                return <span key={dateKeyOf(weekStart)}>{monthChanged ? t('monthLabel', { month: weekStart.getMonth() + 1 }) : ''}</span>
              })}
            </div>
            <div className={css.heatmap} role="img" aria-label={t('heatmapTitle')}>
              {cells.map(cell => {
                const label = t('dayLabel', {
                  date: cell.key,
                  tokens: formatNumber(cell.stat?.tokens ?? 0),
                  calls: formatNumber(cell.stat?.calls ?? 0),
                })
                return (
                  <span
                    key={cell.key}
                    className={css.day}
                    data-level={cell.level}
                    data-today={cell.key === todayKey ? 'true' : undefined}
                    data-tooltip={label}
                    title={label}
                    aria-label={label}
                    tabIndex={0}
                  />
                )
              })}
            </div>
          </div>
        </div>
        {!hasVisibleData && <p className={css.status}>{t('noData')}</p>}
        <div className={css.legend}>
          <span>{t('heatmapLess')}</span>
          <span className={css.legendSwatch} data-level={0} />
          <span className={css.legendSwatch} data-level={1} />
          <span className={css.legendSwatch} data-level={2} />
          <span className={css.legendSwatch} data-level={3} />
          <span className={css.legendSwatch} data-level={4} />
          <span>{t('heatmapMore')}</span>
        </div>
      </section>

      {value.models !== undefined && (
        <section className={css.card}>
          <h3 className={css.cardTitle}>{t('modelTitle')}</h3>
          {models.length === 0 ? <p className={css.status}>{t('noModels')}</p> : (
            <div className={css.modelTableWrap}>
              <table className={css.modelTable}>
                <thead><tr>
                  <th>{t('modelProvider')}</th><th>{t('modelName')}</th><th>{t('modelTokens')}</th>
                  <th>{t('modelInput')}</th><th>{t('modelOutput')}</th><th>{t('modelCacheRead')}</th>
                  <th>{t('modelCacheWrite')}</th><th>{t('modelCalls')}</th>
                </tr></thead>
                <tbody>{models.map(model => <tr key={`${model.provider}\u0000${model.model}`}>
                  <td>{model.provider}</td><td>{model.model}</td><td>{formatNumber(model.counters.totalTokens)}</td>
                  <td>{formatNumber(model.counters.inputTokens)}</td><td>{formatNumber(model.counters.outputTokens)}</td>
                  <td>{formatNumber(model.counters.cacheReadTokens)}</td><td>{formatNumber(model.counters.cacheWriteTokens)}</td>
                  <td>{formatNumber(model.calls)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
