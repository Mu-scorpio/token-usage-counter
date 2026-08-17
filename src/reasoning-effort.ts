/**
 * Provider-aware reasoning effort configuration for the token usage plugin.
 *
 * This module does not replace the Harness LLM adapter. It only fills missing
 * `reasoningEfforts` declarations in the `llm-pi-ai` settings namespace so
 * Harness can expose the effort selector for custom providers and models.
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace, type SettingsPathOp } from '@deepseek-ai/dsh-settings'
import {
  defaultEffortsFor,
  mergeEfforts,
  REASONING_LEVELS,
  type ReasoningEfforts,
  type ReasoningLevel,
} from './reasoning-protocols.ts'

export interface ModelReasoningConfig {
  /** Override the provider/protocol default wire map for this model. */
  efforts?: ReasoningEfforts
  /** Explicitly mark this model as non-reasoning. */
  disabled?: boolean
}

export interface ProviderReasoningConfig {
  /** Provider protocol used to select the default wire map. */
  api?: string
  /** Optional provider-level default reasoning level. */
  reasoning?: ReasoningLevel
  /** Provider-wide override of the protocol default wire map. */
  efforts?: ReasoningEfforts
  /** Per-model overrides keyed by model id. */
  models?: Record<string, ModelReasoningConfig>
}

export interface ReasoningConfig {
  providers?: Record<string, ProviderReasoningConfig>
}

const reasoningEfforts = z.dict(
  z.union([z.string(), z.const(null)]),
  z.union(REASONING_LEVELS),
) as unknown as z<ReasoningEfforts>

const modelReasoningConfig = z.object({
  efforts: reasoningEfforts,
  disabled: z.boolean(),
})

const providerReasoningConfig = z.object({
  api: z.string(),
  reasoning: z.union(REASONING_LEVELS),
  efforts: reasoningEfforts,
  models: z.dict(modelReasoningConfig),
})

/** Schema for the combined plugin's `config` section. */
export const reasoningConfigSchema: z<ReasoningConfig> = z.object({
  providers: z.dict(providerReasoningConfig),
})

const PI_AI_NAMESPACE = settingsNamespace('llm-pi-ai')

function atPath(source: unknown, path: readonly string[]): unknown {
  let current = source
  for (const key of path) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringAt(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function effectiveEfforts(
  api: string | undefined,
  providerEfforts: ReasoningEfforts | undefined,
  modelEfforts: ReasoningEfforts | undefined,
): ReasoningEfforts {
  return mergeEfforts(mergeEfforts(defaultEffortsFor(api), providerEfforts), modelEfforts)
}

function buildProviderOps(
  provider: string,
  providerConfig: ProviderReasoningConfig,
  current: unknown,
): SettingsPathOp[] {
  const ops: SettingsPathOp[] = []
  const providers = isRecord(current) ? atPath(current, ['providers']) : undefined
  const existingProvider = isRecord(providers) ? providers[provider] : undefined
  const profile = isRecord(existingProvider) ? existingProvider : undefined

  // The combined plugin enhances providers that already exist. It never
  // recreates a provider the user removed from llm-pi-ai settings.
  if (profile === undefined) return ops

  const api = providerConfig.api ?? stringAt(profile.api)
  const wantsReasoning = providerConfig.reasoning !== undefined
    || providerConfig.efforts !== undefined
    || (providerConfig.models !== undefined && Object.keys(providerConfig.models).length > 0)
  if (!wantsReasoning) return ops

  if (providerConfig.reasoning !== undefined && profile.reasoning === undefined) {
    ops.push({
      op: 'set',
      path: ['providers', provider, 'reasoning'],
      value: providerConfig.reasoning,
    })
  }

  // Settings path operations do not address array elements. Replacing the
  // array once lets us preserve every existing model field while adding only
  // the missing reasoning declaration.
  const models = profile.models
  if (Array.isArray(models)) {
    let modelsChanged = false
    const nextModels = models.map((entry) => {
      if (!isRecord(entry)) return entry
      const modelId = entry.id
      if (typeof modelId !== 'string' || modelId.length === 0) return entry

      const modelConfig = providerConfig.models?.[modelId]
      if (modelConfig?.disabled === true) {
        if (entry.reasoningEfforts === undefined) {
          modelsChanged = true
          return { ...entry, reasoningEfforts: false }
        }
        return entry
      }
      if (entry.reasoningEfforts !== undefined) return entry

      modelsChanged = true
      return {
        ...entry,
        reasoningEfforts: effectiveEfforts(api, providerConfig.efforts, modelConfig?.efforts),
      }
    })

    if (modelsChanged) {
      ops.push({
        op: 'set',
        path: ['providers', provider, 'models'],
        value: nextModels,
      })
    }
  }

  const overrides = profile.modelOverrides
  if (isRecord(overrides)) {
    for (const [modelId, override] of Object.entries(overrides)) {
      if (!isRecord(override)) continue
      const modelConfig = providerConfig.models?.[modelId]

      if (modelConfig?.disabled === true) {
        if (override.reasoningEfforts === undefined) {
          ops.push({
            op: 'set',
            path: ['providers', provider, 'modelOverrides', modelId, 'reasoningEfforts'],
            value: false,
          })
        }
        continue
      }
      if (override.reasoningEfforts !== undefined) continue

      ops.push({
        op: 'set',
        path: ['providers', provider, 'modelOverrides', modelId, 'reasoningEfforts'],
        value: effectiveEfforts(api, providerConfig.efforts, modelConfig?.efforts),
      })
    }
  }

  return ops
}

async function syncReasoningSettings(ctx: Context, config: ReasoningConfig): Promise<void> {
  const current = ctx.settings.get(PI_AI_NAMESPACE)
  if (current === undefined) return

  const ops: SettingsPathOp[] = []
  for (const [provider, providerConfig] of Object.entries(config.providers ?? {})) {
    ops.push(...buildProviderOps(provider, providerConfig, current))
  }
  if (ops.length === 0) return

  try {
    await ctx.settings.mutate(PI_AI_NAMESPACE, ops)
    ctx.logger.info(
      '[token-usage-counter] wrote %d reasoning-effort setting(s)',
      ops.length,
    )
  } catch (error) {
    ctx.logger.warn('[token-usage-counter] could not update llm-pi-ai settings')
    ctx.logger.warn(error)
  }
}

/** Start the reasoning-effort synchronizer inside the combined plugin. */
export function applyReasoningEffort(ctx: Context, config: ReasoningConfig = {}): void {
  const sync = (): void => {
    void syncReasoningSettings(ctx, config)
  }

  // llm-pi-ai may register its settings namespace later in the composition.
  setTimeout(sync, 0)
  ctx.on('settings/updated', (namespace: unknown) => {
    if (namespace === PI_AI_NAMESPACE) sync()
  })
}

