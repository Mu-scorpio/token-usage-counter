/** Browser half of dsh-token-usage-counter: the Settings page shipped with the plugin. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { UsageStatsSection, type UsageStatsSectionInjected } from './UsageStatsSection.tsx'
import type { UsageStatsSnapshot, UsageStatsScope } from './types.ts'
import { en, zh, type UsageStatsLocaleKey } from './locales.ts'
import { installUsageStatsStyles } from './styles.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.tokenUsageCounter': UsageStatsLocaleKey
  }
}

const NS = 'settings.tokenUsageCounter'
const USAGE_STATS_NAMESPACE = 'dsh-token-usage-counter'

export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-token-usage-counter: dictionaries')
  ctx.effect(() => installUsageStatsStyles(), 'dsh-token-usage-counter: styles')

  // Configuration forms no longer provide a persistent SettingsScope in DSH
  // 0.2. Read the plugin's authenticated aggregate endpoint instead.
  let state: ReturnType<UsageStatsScope['getSnapshot']> = { status: 'loading' }
  const listeners = new Set<() => void>()
  const scope: UsageStatsScope = {
    getSnapshot: () => state,
    subscribe: callback => { listeners.add(callback); return () => { listeners.delete(callback) } },
  }
  ctx.effect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async (): Promise<void> => {
      try {
        const response = await fetch(`/api2/${USAGE_STATS_NAMESPACE}/snapshot`, { credentials: 'same-origin', signal: controller.signal })
        if (!response.ok) throw new Error('Usage snapshot unavailable')
        const value = await response.json() as UsageStatsSnapshot
        state = { status: 'ready', value }
      } catch {
        if (controller.signal.aborted) return
        state = { status: 'unavailable' }
      }
      for (const listener of listeners) listener()
      timer = setTimeout(() => { void refresh() }, 5_000)
    }
    void refresh()
    return () => { controller.abort(); if (timer !== undefined) clearTimeout(timer); listeners.clear() }
  }, 'dsh-token-usage-counter: snapshot polling')
  const t = ctx.locale.bind(NS) as UsageStatsSectionInjected['t']
  const injected = (): UsageStatsSectionInjected => ({ scope, t })

  ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'token-usage-counter',
      order: 30,
      label: () => t('nav'),
      locale: NS,
      inject: injected,
    }, UsageStatsSection))
}
