/** Browser half of dsh-token-usage-counter: the Settings page shipped with the plugin. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { UsageStatsSection, type UsageStatsSectionInjected } from './UsageStatsSection.tsx'
import type { UsageStatsSnapshot } from './types.ts'
import { en, zh, type UsageStatsLocaleKey } from './locales.ts'
import { installUsageStatsStyles } from './styles.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.usageStats': UsageStatsLocaleKey
  }
}

const NS = 'settings.usageStats'
const USAGE_STATS_NAMESPACE = 'usage-stats'

export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-token-usage-counter: dictionaries')
  ctx.effect(() => installUsageStatsStyles(), 'dsh-token-usage-counter: styles')

  const scope = ctx.settingsScope.bind<UsageStatsSnapshot>({ namespace: USAGE_STATS_NAMESPACE })
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
