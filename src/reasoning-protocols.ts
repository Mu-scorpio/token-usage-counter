/**
 * Protocol-aware defaults for model reasoning effort settings.
 *
 * The generic keys are the levels shown by Harness. Values are the strings
 * sent through the provider adapter. Gateways with a different vocabulary
 * can override these maps in the plugin configuration.
 */

export type ReasoningLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type ReasoningEfforts = Partial<Record<ReasoningLevel, string | null>>

export const REASONING_LEVELS: readonly ReasoningLevel[] = [
  'off',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
]

const FIVE_LEVEL_EFFORTS: ReasoningEfforts = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'xhigh',
  max: 'max',
}

/** Defaults for protocols supported by the Harness pi-ai adapter. */
export const DEFAULT_EFFORTS_BY_API: Readonly<Record<string, ReasoningEfforts>> = {
  'openai-completions': FIVE_LEVEL_EFFORTS,
  'openai-responses': FIVE_LEVEL_EFFORTS,
  deepseek: FIVE_LEVEL_EFFORTS,
  openrouter: FIVE_LEVEL_EFFORTS,
  together: FIVE_LEVEL_EFFORTS,
  zai: FIVE_LEVEL_EFFORTS,
  qwen: FIVE_LEVEL_EFFORTS,
  'string-thinking': FIVE_LEVEL_EFFORTS,
  'ant-ling': FIVE_LEVEL_EFFORTS,
  anthropic: FIVE_LEVEL_EFFORTS,
}

/** Fallback for an omitted or unknown provider API. */
export const DEFAULT_EFFORTS: ReasoningEfforts = { ...FIVE_LEVEL_EFFORTS }

export function defaultEffortsFor(api: string | undefined): ReasoningEfforts {
  if (api !== undefined) {
    const found = DEFAULT_EFFORTS_BY_API[api]
    if (found !== undefined) return { ...found }
  }
  return { ...DEFAULT_EFFORTS }
}

/** Merge a user override over the protocol defaults. */
export function mergeEfforts(
  base: ReasoningEfforts,
  override: ReasoningEfforts | undefined,
): ReasoningEfforts {
  return override === undefined ? { ...base } : { ...base, ...override }
}

