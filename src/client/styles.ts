/** Small self-contained stylesheet for the browser half of the plugin. */

const STYLE_ID = 'dsh-token-usage-counter-styles'

const CSS = `
.dsh-token-usage-section{display:flex;flex-direction:column;gap:24px;width:100%;min-width:0;padding:0}
.dsh-token-usage-status{margin:0;color:var(--dsw-text-secondary,#6b7280);font-size:14px;line-height:1.5}
.dsh-token-usage-card{box-sizing:border-box;width:100%;min-width:0;border:1px solid var(--dsw-border-color,#e5e7eb);border-radius:12px;padding:20px 24px}
.dsh-token-usage-card-title{margin:0 0 16px;font-size:16px;line-height:1.4;font-weight:600}
.dsh-token-usage-total-rows{display:flex;flex-direction:column;gap:14px}
.dsh-token-usage-total-item{display:flex;flex-direction:column;min-width:0;gap:4px}
.dsh-token-usage-total-item-primary{padding-bottom:12px;border-bottom:1px solid var(--dsw-border-color,#e5e7eb)}
.dsh-token-usage-total-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:24px}
.dsh-token-usage-total-value{display:block;min-width:0;overflow:hidden;font-size:clamp(17px,1.7vw,20px);line-height:1.15;font-weight:650;font-variant-numeric:tabular-nums;letter-spacing:-.02em;text-overflow:ellipsis;white-space:nowrap}
.dsh-token-usage-total-item-primary .dsh-token-usage-total-value{font-size:clamp(20px,2vw,24px)}
.dsh-token-usage-total-label{font-size:12px;line-height:1.4;color:var(--dsw-text-secondary,#6b7280);text-wrap:pretty}
.dsh-token-usage-heatmap-header{display:flex;align-items:baseline;justify-content:space-between;gap:16px}
.dsh-token-usage-heatmap-period{flex:0 0 auto;color:var(--dsw-text-tertiary,#9ca3af);font-size:11px;line-height:1.4}
.dsh-token-usage-heatmap-layout{display:grid;grid-template-columns:20px minmax(0,1fr);column-gap:10px;align-items:start;width:100%;min-width:0;margin-top:18px;padding-bottom:2px}
.dsh-token-usage-weekday-labels{display:grid;grid-template-rows:repeat(7,var(--dsh-token-usage-cell-size));row-gap:4px;padding-top:20px;color:var(--dsw-text-tertiary,#9ca3af);font-size:10px;line-height:var(--dsh-token-usage-cell-size);text-align:right}
.dsh-token-usage-weekday-labels span{display:flex;align-items:center;justify-content:flex-end}
.dsh-token-usage-weekday-labels span:nth-child(1){grid-row:1}.dsh-token-usage-weekday-labels span:nth-child(2){grid-row:3}.dsh-token-usage-weekday-labels span:nth-child(3){grid-row:5}
.dsh-token-usage-heatmap-graph{width:100%;min-width:0}
.dsh-token-usage-month-labels{display:grid;grid-template-columns:repeat(var(--dsh-token-usage-weeks),minmax(0,1fr));column-gap:4px;width:100%;height:14px;margin-bottom:6px;color:var(--dsw-text-tertiary,#9ca3af);font-size:11px;line-height:14px}
.dsh-token-usage-month-labels span{overflow:visible;white-space:nowrap}
.dsh-token-usage-heatmap{display:grid;grid-auto-flow:column;grid-template-columns:repeat(var(--dsh-token-usage-weeks),minmax(0,1fr));grid-template-rows:repeat(7,var(--dsh-token-usage-cell-size));gap:4px;width:100%;min-width:0}
.dsh-token-usage-day{box-sizing:border-box;position:relative;width:100%;height:var(--dsh-token-usage-cell-size);min-width:0;border:0;border-radius:4px;padding:0;background:var(--dsw-usage-day-empty,#eef0f3);cursor:default}
.dsh-token-usage-day[data-level='1']{background:var(--dsw-usage-day-1,#d6e4ff)}.dsh-token-usage-day[data-level='2']{background:var(--dsw-usage-day-2,#9ec5fe)}.dsh-token-usage-day[data-level='3']{background:var(--dsw-usage-day-3,#4d8df6)}.dsh-token-usage-day[data-level='4']{background:var(--dsw-usage-day-4,#1d5fd0)}
.dsh-token-usage-day[data-today='true']{outline:1px solid var(--dsw-text-secondary,#6b7280);outline-offset:2px}
.dsh-token-usage-day::after{content:attr(data-tooltip);position:absolute;z-index:10;left:50%;bottom:calc(100% + 8px);width:max-content;max-width:240px;padding:7px 9px;border-radius:6px;background:#111827;color:#fff;font-size:12px;font-weight:400;line-height:1.4;white-space:normal;text-align:left;pointer-events:none;opacity:0;transform:translate(-50%,4px);transition:opacity .12s ease,transform .12s ease}
.dsh-token-usage-day:hover::after,.dsh-token-usage-day:focus-visible::after{opacity:1;transform:translate(-50%,0)}
.dsh-token-usage-legend{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:16px 0 0;font-size:12px;line-height:1.4;color:var(--dsw-text-secondary,#6b7280)}
.dsh-token-usage-legend-swatch{flex:0 0 auto;width:12px;height:12px;border-radius:3px;background:var(--dsw-usage-day-empty,#eef0f3)}
.dsh-token-usage-legend-swatch[data-level='1']{background:var(--dsw-usage-day-1,#d6e4ff)}.dsh-token-usage-legend-swatch[data-level='2']{background:var(--dsw-usage-day-2,#9ec5fe)}.dsh-token-usage-legend-swatch[data-level='3']{background:var(--dsw-usage-day-3,#4d8df6)}.dsh-token-usage-legend-swatch[data-level='4']{background:var(--dsw-usage-day-4,#1d5fd0)}
.dsh-token-usage-model-table-wrap{box-sizing:border-box;width:100%;min-width:0;overflow-x:auto;margin-top:0;border:1px solid var(--dsw-border-color,#e5e7eb);border-radius:8px;scrollbar-gutter:stable}
.dsh-token-usage-model-table{width:100%;min-width:760px;table-layout:fixed;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
.dsh-token-usage-model-table th,.dsh-token-usage-model-table td{box-sizing:border-box;max-width:0;overflow:hidden;padding:10px 12px;border-bottom:1px solid var(--dsw-border-color,#e5e7eb);text-align:right;white-space:nowrap;text-overflow:ellipsis}
.dsh-token-usage-model-table th:first-child,.dsh-token-usage-model-table td:first-child,.dsh-token-usage-model-table th:nth-child(2),.dsh-token-usage-model-table td:nth-child(2){text-align:left}
.dsh-token-usage-model-table th{color:var(--dsw-text-secondary,#6b7280);font-weight:600;background:var(--dsw-surface-secondary,#f9fafb);line-height:1.35;white-space:normal}.dsh-token-usage-model-table tbody tr:hover{background:var(--dsw-surface-hover,#f3f4f6)}.dsh-token-usage-model-table tbody tr:last-child td{border-bottom:0}
.dsh-token-usage-model-table th:first-child,.dsh-token-usage-model-table td:first-child{width:14%}.dsh-token-usage-model-table th:nth-child(2),.dsh-token-usage-model-table td:nth-child(2){width:21%}.dsh-token-usage-model-table th:nth-child(n+3),.dsh-token-usage-model-table td:nth-child(n+3){width:10.8333%}
@media (max-width:720px){.dsh-token-usage-card{padding:16px}.dsh-token-usage-total-row{column-gap:16px}.dsh-token-usage-total-value{font-size:18px}.dsh-token-usage-total-item-primary .dsh-token-usage-total-value{font-size:22px}}
`

export function installUsageStatsStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.dataset.plugin = 'dsh-token-usage-counter'
  style.textContent = CSS
  document.head.appendChild(style)
  return () => { style.remove() }
}
