import { Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
//#region src/reasoning-protocols.ts
const REASONING_LEVELS = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max"
];
const FIVE_LEVEL_EFFORTS = {
	low: "low",
	medium: "medium",
	high: "high",
	xhigh: "xhigh",
	max: "max"
};
/** Defaults for protocols supported by the Harness pi-ai adapter. */
const DEFAULT_EFFORTS_BY_API = {
	"openai-completions": FIVE_LEVEL_EFFORTS,
	"openai-responses": FIVE_LEVEL_EFFORTS,
	deepseek: FIVE_LEVEL_EFFORTS,
	openrouter: FIVE_LEVEL_EFFORTS,
	together: FIVE_LEVEL_EFFORTS,
	zai: FIVE_LEVEL_EFFORTS,
	qwen: FIVE_LEVEL_EFFORTS,
	"string-thinking": FIVE_LEVEL_EFFORTS,
	"ant-ling": FIVE_LEVEL_EFFORTS,
	anthropic: FIVE_LEVEL_EFFORTS
};
/** Fallback for an omitted or unknown provider API. */
const DEFAULT_EFFORTS = { ...FIVE_LEVEL_EFFORTS };
function defaultEffortsFor(api) {
	if (api !== void 0) {
		const found = DEFAULT_EFFORTS_BY_API[api];
		if (found !== void 0) return { ...found };
	}
	return { ...DEFAULT_EFFORTS };
}
/** Merge a user override over the protocol defaults. */
function mergeEfforts(base, override) {
	return override === void 0 ? { ...base } : {
		...base,
		...override
	};
}
//#endregion
//#region src/reasoning-effort.ts
const reasoningEfforts = z.dict(z.union([z.string(), z.const(null)]), z.union(REASONING_LEVELS));
const modelReasoningConfig = z.object({
	efforts: reasoningEfforts,
	disabled: z.boolean()
});
const providerReasoningConfig = z.object({
	api: z.string(),
	reasoning: z.union(REASONING_LEVELS),
	efforts: reasoningEfforts,
	models: z.dict(modelReasoningConfig)
});
/** Schema for the combined plugin's `config` section. */
const reasoningConfigSchema = z.object({ providers: z.dict(providerReasoningConfig) });
const PI_AI_NAMESPACE = settingsNamespace("llm-pi-ai");
function atPath(source, path) {
	let current = source;
	for (const key of path) {
		if (typeof current !== "object" || current === null || Array.isArray(current)) return void 0;
		current = current[key];
	}
	return current;
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringAt(value) {
	return typeof value === "string" ? value : void 0;
}
function effectiveEfforts(api, providerEfforts, modelEfforts) {
	return mergeEfforts(mergeEfforts(defaultEffortsFor(api), providerEfforts), modelEfforts);
}
function buildProviderOps(provider, providerConfig, current) {
	const ops = [];
	const providers = isRecord(current) ? atPath(current, ["providers"]) : void 0;
	const existingProvider = isRecord(providers) ? providers[provider] : void 0;
	const profile = isRecord(existingProvider) ? existingProvider : void 0;
	if (profile === void 0) return ops;
	const api = providerConfig.api ?? stringAt(profile.api);
	if (!(providerConfig.reasoning !== void 0 || providerConfig.efforts !== void 0 || providerConfig.models !== void 0 && Object.keys(providerConfig.models).length > 0)) return ops;
	if (providerConfig.reasoning !== void 0 && profile.reasoning === void 0) ops.push({
		op: "set",
		path: [
			"providers",
			provider,
			"reasoning"
		],
		value: providerConfig.reasoning
	});
	const models = profile.models;
	if (Array.isArray(models)) {
		let modelsChanged = false;
		const nextModels = models.map((entry) => {
			if (!isRecord(entry)) return entry;
			const modelId = entry.id;
			if (typeof modelId !== "string" || modelId.length === 0) return entry;
			const modelConfig = providerConfig.models?.[modelId];
			if (modelConfig?.disabled === true) {
				if (entry.reasoningEfforts === void 0) {
					modelsChanged = true;
					return {
						...entry,
						reasoningEfforts: false
					};
				}
				return entry;
			}
			if (entry.reasoningEfforts !== void 0) return entry;
			modelsChanged = true;
			return {
				...entry,
				reasoningEfforts: effectiveEfforts(api, providerConfig.efforts, modelConfig?.efforts)
			};
		});
		if (modelsChanged) ops.push({
			op: "set",
			path: [
				"providers",
				provider,
				"models"
			],
			value: nextModels
		});
	}
	const overrides = profile.modelOverrides;
	if (isRecord(overrides)) for (const [modelId, override] of Object.entries(overrides)) {
		if (!isRecord(override)) continue;
		const modelConfig = providerConfig.models?.[modelId];
		if (modelConfig?.disabled === true) {
			if (override.reasoningEfforts === void 0) ops.push({
				op: "set",
				path: [
					"providers",
					provider,
					"modelOverrides",
					modelId,
					"reasoningEfforts"
				],
				value: false
			});
			continue;
		}
		if (override.reasoningEfforts !== void 0) continue;
		ops.push({
			op: "set",
			path: [
				"providers",
				provider,
				"modelOverrides",
				modelId,
				"reasoningEfforts"
			],
			value: effectiveEfforts(api, providerConfig.efforts, modelConfig?.efforts)
		});
	}
	return ops;
}
async function syncReasoningSettings(ctx, config) {
	const current = ctx.settings.get(PI_AI_NAMESPACE);
	if (current === void 0) return;
	const ops = [];
	for (const [provider, providerConfig] of Object.entries(config.providers ?? {})) ops.push(...buildProviderOps(provider, providerConfig, current));
	if (ops.length === 0) return;
	try {
		await ctx.settings.mutate(PI_AI_NAMESPACE, ops);
		ctx.logger.info("[token-usage-counter] wrote %d reasoning-effort setting(s)", ops.length);
	} catch (error) {
		ctx.logger.warn("[token-usage-counter] could not update llm-pi-ai settings");
		ctx.logger.warn(error);
	}
}
/** Start the reasoning-effort synchronizer inside the combined plugin. */
function applyReasoningEffort(ctx, config = {}) {
	const sync = () => {
		syncReasoningSettings(ctx, config);
	};
	setTimeout(sync, 0);
	ctx.on("settings/updated", (namespace) => {
		if (namespace === PI_AI_NAMESPACE) sync();
	});
}
//#endregion
//#region src/index.ts
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
const COUNTERS_SCHEMA = z.object({
	inputTokens: z.number().step(1).min(0).default(0),
	outputTokens: z.number().step(1).min(0).default(0),
	cacheReadTokens: z.number().step(1).min(0).default(0),
	cacheWriteTokens: z.number().step(1).min(0).default(0),
	totalTokens: z.number().step(1).min(0).default(0)
});
const TOTALS_SCHEMA = z.object({
	inputTokens: z.number().step(1).min(0).default(0),
	outputTokens: z.number().step(1).min(0).default(0),
	cacheReadTokens: z.number().step(1).min(0).default(0),
	cacheWriteTokens: z.number().step(1).min(0).default(0),
	totalTokens: z.number().step(1).min(0).default(0),
	calls: z.number().step(1).min(0).default(0)
});
const DAILY_SCHEMA = z.object({
	date: z.string(),
	inputTokens: z.number().step(1).min(0).default(0),
	outputTokens: z.number().step(1).min(0).default(0),
	cacheReadTokens: z.number().step(1).min(0).default(0),
	cacheWriteTokens: z.number().step(1).min(0).default(0),
	tokens: z.number().step(1).min(0).default(0),
	calls: z.number().step(1).min(0).default(0)
});
const PENDING_USAGE_SCHEMA = z.object({
	turn: z.number().step(1).min(0),
	step: z.number().step(1).min(0),
	counters: COUNTERS_SCHEMA
});
const STEP_USAGE_SCHEMA = z.object({
	turn: z.number().step(1).min(0),
	step: z.number().step(1).min(0),
	counters: COUNTERS_SCHEMA,
	provider: z.string(),
	model: z.string(),
	dateKey: z.string()
});
const MODEL_SCHEMA = z.object({
	provider: z.string(),
	model: z.string(),
	counters: COUNTERS_SCHEMA,
	calls: z.number().step(1).min(0).default(0)
});
const SESSION_SCHEMA = z.object({
	sessionId: z.string(),
	consumedSeq: z.number().step(1).min(0).default(0),
	counters: COUNTERS_SCHEMA,
	calls: z.number().step(1).min(0).default(0),
	models: z.array(MODEL_SCHEMA).default([]),
	pending: PENDING_USAGE_SCHEMA,
	last: STEP_USAGE_SCHEMA
});
const TOKEN_USAGE_COUNTER_SCHEMA = z.object({
	totals: TOTALS_SCHEMA,
	calls: z.number().step(1).min(0).default(0),
	daily: z.array(DAILY_SCHEMA).default([]),
	models: z.array(MODEL_SCHEMA).default([]),
	sessions: z.array(SESSION_SCHEMA).default([])
});
const TOKEN_USAGE_COUNTER_NAMESPACE = settingsNamespace("usage-stats");
function emptyCounters() {
	return {
		inputTokens: 0,
		outputTokens: 0,
		cacheReadTokens: 0,
		cacheWriteTokens: 0,
		totalTokens: 0
	};
}
function countersFromUsage(usage) {
	const inputTokens = usage.inputTokens;
	const outputTokens = usage.outputTokens;
	const cacheReadTokens = usage.cacheReadTokens ?? 0;
	const cacheWriteTokens = usage.cacheWriteTokens ?? 0;
	return {
		inputTokens,
		outputTokens,
		cacheReadTokens,
		cacheWriteTokens,
		totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens
	};
}
function normalizeCounters(counters) {
	const inputTokens = counters.inputTokens;
	const outputTokens = counters.outputTokens;
	const cacheReadTokens = counters.cacheReadTokens;
	const cacheWriteTokens = counters.cacheWriteTokens;
	return {
		inputTokens,
		outputTokens,
		cacheReadTokens,
		cacheWriteTokens,
		totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens
	};
}
function addCounters(left, right) {
	const inputTokens = left.inputTokens + right.inputTokens;
	const outputTokens = left.outputTokens + right.outputTokens;
	const cacheReadTokens = left.cacheReadTokens + right.cacheReadTokens;
	const cacheWriteTokens = left.cacheWriteTokens + right.cacheWriteTokens;
	return {
		inputTokens,
		outputTokens,
		cacheReadTokens,
		cacheWriteTokens,
		totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens
	};
}
function subtractCounters(left, right) {
	const inputTokens = left.inputTokens - right.inputTokens;
	const outputTokens = left.outputTokens - right.outputTokens;
	const cacheReadTokens = left.cacheReadTokens - right.cacheReadTokens;
	const cacheWriteTokens = left.cacheWriteTokens - right.cacheWriteTokens;
	return {
		inputTokens,
		outputTokens,
		cacheReadTokens,
		cacheWriteTokens,
		totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens
	};
}
function countersEqual(left, right) {
	return left.inputTokens === right.inputTokens && left.outputTokens === right.outputTokens && left.cacheReadTokens === right.cacheReadTokens && left.cacheWriteTokens === right.cacheWriteTokens && left.totalTokens === right.totalTokens;
}
function modelKey(provider, model) {
	return `${provider}\u0000${model}`;
}
function toDateKey(time) {
	const date = new Date(time);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function snapshotModels(models) {
	const result = [];
	for (const record of models.values()) result.push({
		provider: record.provider,
		model: record.model,
		counters: { ...record.counters },
		calls: record.calls
	});
	result.sort((a, b) => a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model));
	return result;
}
function addDailyRecord(daily, dateKey, counters, calls) {
	const day = daily.get(dateKey);
	if (day === void 0) {
		daily.set(dateKey, {
			counters: { ...counters },
			calls
		});
		return;
	}
	day.counters.inputTokens += counters.inputTokens;
	day.counters.outputTokens += counters.outputTokens;
	day.counters.cacheReadTokens += counters.cacheReadTokens;
	day.counters.cacheWriteTokens += counters.cacheWriteTokens;
	day.counters.totalTokens += counters.totalTokens;
	day.calls += calls;
}
function removeDailyRecord(daily, dateKey, counters, calls) {
	const day = daily.get(dateKey);
	if (day === void 0) return;
	day.counters.inputTokens = Math.max(0, day.counters.inputTokens - counters.inputTokens);
	day.counters.outputTokens = Math.max(0, day.counters.outputTokens - counters.outputTokens);
	day.counters.cacheReadTokens = Math.max(0, day.counters.cacheReadTokens - counters.cacheReadTokens);
	day.counters.cacheWriteTokens = Math.max(0, day.counters.cacheWriteTokens - counters.cacheWriteTokens);
	day.counters.totalTokens = Math.max(0, day.counters.totalTokens - counters.totalTokens);
	day.calls = Math.max(0, day.calls - calls);
	if (day.counters.totalTokens === 0 && day.calls === 0) daily.delete(dateKey);
}
function historyFromSession(session) {
	return {
		sessionId: session.id,
		header: session.header,
		events: session.events,
		firstLiveSeq: session.firstLiveSeq
	};
}
function seedEndFor(history) {
	const boundary = history.firstLiveSeq ?? history.header.seedLength ?? 0;
	return history.events[boundary]?.type === "session/end-seed" ? boundary + 1 : boundary;
}
const name = "token-usage-counter";
/** The plugin needs the session store and settings to persist across restarts. */
const inject = ["sessions", "settings"];
/** Configuration schema for provider/model reasoning effort synchronization. */
const Config = reasoningConfigSchema;
function apply(ctx, config = {}) {
	ctx.plugin(TokenUsageCounter);
	applyReasoningEffort(ctx, config);
}
/**
* Cordis service that owns the cumulative token accounting.
*
* The accounting is persisted through the settings document, so restarting the
* harness does not reset the counters. It reflects every session this harness
* process has observed, plus any state restored from the previous run.
*/
var TokenUsageCounter = class extends Service {
	static inject = ["sessions", "settings"];
	records = /* @__PURE__ */ new Map();
	modelRecords = /* @__PURE__ */ new Map();
	daily = /* @__PURE__ */ new Map();
	totals = emptyCounters();
	calls = 0;
	legacyBaseline = false;
	dailyNeedsBackfill = false;
	scope;
	persistTimer;
	persistChain = Promise.resolve();
	constructor(ctx) {
		super(ctx, "tokenUsageCounter");
		const scope = ctx.settings.register(TOKEN_USAGE_COUNTER_NAMESPACE, TOKEN_USAGE_COUNTER_SCHEMA);
		this.scope = scope;
		this.hydrate(scope.get());
		const liveSessions = ctx.sessions.list();
		for (const session of liveSessions) this.adoptSession(session);
		if (this.dailyNeedsBackfill) this.backfillDailyBreakdown(liveSessions.map(historyFromSession));
		this.schedulePersist(0);
		ctx.inject(["sessionPersistence"], (persistenceCtx) => {
			this.hydrateFromPersistence(persistenceCtx.sessionPersistence);
		});
		ctx.on("session/created", (session) => {
			this.adoptSession(session);
			this.schedulePersist();
		});
		ctx.on("session/event", (session) => {
			this.adoptSession(session);
			this.schedulePersist();
		});
		ctx.on("session/disposed", (session) => {
			const record = this.records.get(session.id);
			if (record === void 0) return;
			this.ctx.logger.info("[token-usage-counter] session %s closed; session total=%d, harness total=%d", session.id, record.counters.totalTokens, this.totals.totalTokens);
			this.schedulePersist(0);
		});
		ctx.inject(["commands"], (commandCtx) => {
			commandCtx.commands.register({
				name: "tokens",
				description: "Show cumulative DeepSeek Harness token usage by session and model",
				handler: () => ({
					kind: "success",
					text: this.formatSummary()
				})
			});
		});
		ctx.effect(() => () => {
			if (this.persistTimer !== void 0) {
				clearTimeout(this.persistTimer);
				this.persistTimer = void 0;
			}
			return this.persist();
		}, "token-usage-counter: shutdown persist");
	}
	async hydrateFromPersistence(persistence) {
		try {
			const headers = await persistence.list();
			const histories = /* @__PURE__ */ new Map();
			for (const header of headers) {
				const inspection = await persistence.inspect(header.id);
				histories.set(String(header.id), {
					sessionId: String(header.id),
					header: inspection.meta,
					events: inspection.events
				});
			}
			for (const session of this.ctx.sessions.list()) histories.set(session.id, historyFromSession(session));
			const ordered = [...histories.values()].sort((left, right) => (left.header.seedLength ?? 0) - (right.header.seedLength ?? 0) || left.header.createdAt - right.header.createdAt);
			if (this.records.size === 0 && this.totals.totalTokens === 0 && this.calls === 0) for (const history of ordered) this.adoptHistory(history);
			if (this.dailyNeedsBackfill) this.backfillDailyBreakdown(ordered);
			this.schedulePersist(0);
		} catch (error) {
			this.ctx.logger.warn("[token-usage-counter] failed to backfill persisted sessions: %o", error);
		}
	}
	hydrate(snapshot) {
		this.totals = normalizeCounters(snapshot.totals);
		this.calls = Math.max(snapshot.totals.calls, snapshot.calls);
		this.legacyBaseline = snapshot.sessions.length === 0 && (snapshot.totals.totalTokens > 0 || snapshot.calls > 0);
		this.daily.clear();
		this.dailyNeedsBackfill = false;
		for (const day of snapshot.daily) {
			const counters = {
				inputTokens: day.inputTokens ?? 0,
				outputTokens: day.outputTokens ?? 0,
				cacheReadTokens: day.cacheReadTokens ?? 0,
				cacheWriteTokens: day.cacheWriteTokens ?? 0,
				totalTokens: day.tokens
			};
			this.daily.set(day.date, {
				counters,
				calls: day.calls
			});
			if (day.tokens > 0 && counters.inputTokens + counters.outputTokens + counters.cacheReadTokens + counters.cacheWriteTokens === 0) this.dailyNeedsBackfill = true;
		}
		this.modelRecords.clear();
		for (const model of snapshot.models) this.modelRecords.set(modelKey(model.provider, model.model), {
			provider: model.provider,
			model: model.model,
			counters: normalizeCounters(model.counters),
			calls: model.calls
		});
		this.records.clear();
		for (const session of snapshot.sessions) {
			const models = /* @__PURE__ */ new Map();
			for (const model of session.models) models.set(modelKey(model.provider, model.model), {
				provider: model.provider,
				model: model.model,
				counters: normalizeCounters(model.counters),
				calls: model.calls
			});
			this.records.set(session.sessionId, {
				consumedSeq: session.consumedSeq,
				initialized: true,
				last: session.last === void 0 ? null : {
					turn: session.last.turn,
					step: session.last.step,
					counters: normalizeCounters(session.last.counters),
					provider: session.last.provider,
					model: session.last.model,
					dateKey: session.last.dateKey
				},
				pending: session.pending === void 0 ? null : {
					turn: session.pending.turn,
					step: session.pending.step,
					counters: normalizeCounters(session.pending.counters)
				},
				counters: normalizeCounters(session.counters),
				calls: session.calls,
				models
			});
		}
	}
	snapshot() {
		const sessions = [];
		for (const [sessionId, record] of this.records) sessions.push({
			sessionId,
			consumedSeq: record.consumedSeq,
			counters: { ...record.counters },
			calls: record.calls,
			models: snapshotModels(record.models),
			...record.pending === null ? {} : { pending: {
				turn: record.pending.turn,
				step: record.pending.step,
				counters: { ...record.pending.counters }
			} },
			...record.last === null ? {} : { last: {
				turn: record.last.turn,
				step: record.last.step,
				counters: { ...record.last.counters },
				provider: record.last.provider,
				model: record.last.model,
				dateKey: record.last.dateKey
			} }
		});
		sessions.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
		const daily = [...this.daily.entries()].map(([date, day]) => ({
			date,
			inputTokens: day.counters.inputTokens,
			outputTokens: day.counters.outputTokens,
			cacheReadTokens: day.counters.cacheReadTokens,
			cacheWriteTokens: day.counters.cacheWriteTokens,
			tokens: day.counters.totalTokens,
			calls: day.calls
		})).sort((a, b) => a.date.localeCompare(b.date));
		return {
			totals: {
				...this.totals,
				calls: this.calls
			},
			calls: this.calls,
			daily,
			models: snapshotModels(this.modelRecords),
			sessions
		};
	}
	schedulePersist(delayMs = 2e3) {
		if (this.scope === void 0) return;
		if (this.persistTimer !== void 0) clearTimeout(this.persistTimer);
		this.persistTimer = setTimeout(() => {
			this.persistTimer = void 0;
			this.persist();
		}, delayMs);
	}
	persist() {
		const scope = this.scope;
		if (scope === void 0) return Promise.resolve();
		this.persistChain = this.persistChain.then(() => scope.replace(this.snapshot())).catch(() => {});
		return this.persistChain;
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
	adoptHistory(history) {
		const record = this.recordFor(history.sessionId);
		const events = history.events;
		if (!record.initialized) {
			if (this.legacyBaseline) record.consumedSeq = events.length;
			else {
				const seedEnd = seedEndFor(history);
				if (seedEnd > 0 && history.header.parentSession !== void 0 && this.records.has(history.header.parentSession)) record.consumedSeq = seedEnd;
			}
			record.initialized = true;
		}
		while (record.consumedSeq < events.length) {
			const event = events[record.consumedSeq];
			if (event === void 0) break;
			this.consumeEvent(history.sessionId, event);
			record.consumedSeq += 1;
		}
	}
	adoptSession(session) {
		this.adoptHistory(historyFromSession(session));
	}
	/** Total usage summary, detached from internal mutable state. */
	getSummary() {
		const sessions = [];
		for (const [sessionId, record] of this.records) sessions.push({
			sessionId,
			counters: { ...record.counters },
			calls: record.calls,
			models: snapshotModels(record.models)
		});
		sessions.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
		return {
			sessions,
			models: snapshotModels(this.modelRecords),
			totals: { ...this.totals },
			calls: this.calls
		};
	}
	/** Per-session usage for one session id, or undefined when never observed. */
	getSession(sessionId) {
		const record = this.records.get(sessionId);
		if (record === void 0) return void 0;
		return {
			sessionId,
			counters: { ...record.counters },
			calls: record.calls,
			models: snapshotModels(record.models)
		};
	}
	/** Per-model usage for a provider/model pair, or undefined when never observed. */
	getModel(provider, model) {
		const record = this.modelRecords.get(modelKey(provider, model));
		if (record === void 0) return void 0;
		return {
			provider: record.provider,
			model: record.model,
			counters: { ...record.counters },
			calls: record.calls
		};
	}
	/** Render a human-readable summary including per-model totals. */
	formatSummary() {
		const t = this.totals;
		const lines = [`total tokens: ${t.totalTokens} (input ${t.inputTokens}, output ${t.outputTokens}, cache-read ${t.cacheReadTokens}, cache-write ${t.cacheWriteTokens}); ${this.calls} model calls across ${this.records.size} sessions`];
		for (const model of snapshotModels(this.modelRecords)) {
			const c = model.counters;
			lines.push(`  ${model.provider}/${model.model}: ${c.totalTokens} tokens (input ${c.inputTokens}, output ${c.outputTokens}, cache-read ${c.cacheReadTokens}, cache-write ${c.cacheWriteTokens}); ${model.calls} calls`);
		}
		return lines.join("\n");
	}
	recordFor(sessionId) {
		let record = this.records.get(sessionId);
		if (record === void 0) {
			record = {
				consumedSeq: 0,
				initialized: false,
				last: null,
				pending: null,
				counters: emptyCounters(),
				calls: 0,
				models: /* @__PURE__ */ new Map()
			};
			this.records.set(sessionId, record);
		}
		return record;
	}
	modelRecordFor(models, provider, model) {
		const key = modelKey(provider, model);
		let record = models.get(key);
		if (record === void 0) {
			record = {
				provider,
				model,
				counters: emptyCounters(),
				calls: 0
			};
			models.set(key, record);
		}
		return record;
	}
	addDaily(dateKey, counters, calls = 1) {
		addDailyRecord(this.daily, dateKey, counters, calls);
	}
	removeDaily(dateKey, counters, calls = 1) {
		removeDailyRecord(this.daily, dateKey, counters, calls);
	}
	/**
	* Reconstruct the per-day buckets for snapshots written before daily
	* breakdowns were persisted. The cumulative counters remain authoritative;
	* this pass only rebuilds the daily projection and verifies that it covers
	* the same usage before replacing the old total-only projection.
	*/
	backfillDailyBreakdown(histories) {
		if (!this.dailyNeedsBackfill || histories.length === 0) return;
		const rebuilt = /* @__PURE__ */ new Map();
		const sessionIds = new Set(histories.map((history) => history.sessionId));
		let rebuiltTotals = emptyCounters();
		let rebuiltCalls = 0;
		const add = (time, counters) => {
			addDailyRecord(rebuilt, toDateKey(time), counters, 1);
			rebuiltTotals = addCounters(rebuiltTotals, counters);
			rebuiltCalls += 1;
		};
		const remove = (timeKey, counters) => {
			removeDailyRecord(rebuilt, timeKey, counters, 1);
			rebuiltTotals = subtractCounters(rebuiltTotals, counters);
			rebuiltCalls = Math.max(0, rebuiltCalls - 1);
		};
		for (const history of histories) {
			const events = history.events;
			const seedEnd = seedEndFor(history);
			const start = seedEnd > 0 && history.header.parentSession !== void 0 && (sessionIds.has(history.header.parentSession) || this.records.has(history.header.parentSession)) ? seedEnd : 0;
			let pending = null;
			let last = null;
			for (let index = start; index < events.length; index += 1) {
				const event = events[index];
				if (event === void 0) continue;
				const compaction = event;
				if (compaction.type === "compaction/summary") {
					if (compaction.data.usage !== void 0) add(event.time, countersFromUsage(compaction.data.usage));
					continue;
				}
				if (event.type === "assistant/chunk" && event.data.chunk.type === "usage") {
					pending = {
						turn: event.data.turn,
						step: event.data.step,
						counters: countersFromUsage(event.data.chunk.usage)
					};
					continue;
				}
				if (event.type === "assistant/message") {
					const { turn, step, usage } = event.data;
					const matchingPending = pending !== null && pending.turn === turn && pending.step === step ? pending : void 0;
					const counters = usage === void 0 ? matchingPending?.counters : countersFromUsage(usage);
					if (counters === void 0) {
						if (matchingPending !== void 0) pending = null;
						continue;
					}
					pending = null;
					const previous = last !== null && last.turn === turn && last.step === step ? last : void 0;
					if (previous !== void 0) {
						if (countersEqual(previous.counters, counters)) continue;
						remove(previous.dateKey, previous.counters);
					}
					add(event.time, counters);
					last = {
						turn,
						step,
						counters,
						provider: "unknown",
						model: "unknown",
						dateKey: toDateKey(event.time)
					};
					continue;
				}
				if (event.type === "step/end" || event.type === "turn/end") pending = null;
			}
		}
		if (rebuiltCalls !== this.calls || !countersEqual(rebuiltTotals, this.totals)) {
			this.ctx.logger.warn("[token-usage-counter] skipped daily breakdown migration: rebuilt usage does not match cumulative totals");
			return;
		}
		this.daily.clear();
		for (const [dateKey, day] of rebuilt) this.daily.set(dateKey, day);
		this.dailyNeedsBackfill = false;
	}
	addModelUsage(sessionModels, provider, model, counters) {
		const sessionModel = this.modelRecordFor(sessionModels, provider, model);
		sessionModel.counters = addCounters(sessionModel.counters, counters);
		sessionModel.calls += 1;
		const globalModel = this.modelRecordFor(this.modelRecords, provider, model);
		globalModel.counters = addCounters(globalModel.counters, counters);
		globalModel.calls += 1;
	}
	addUsage(record, provider, model, counters, time) {
		record.counters = addCounters(record.counters, counters);
		this.totals = addCounters(this.totals, counters);
		record.calls += 1;
		this.calls += 1;
		this.addModelUsage(record.models, provider, model, counters);
		this.addDaily(toDateKey(time), counters, 1);
	}
	replaceUsage(record, previous, provider, model, counters, time) {
		const delta = subtractCounters(counters, previous.counters);
		record.counters = addCounters(record.counters, delta);
		this.totals = addCounters(this.totals, delta);
		this.removeDaily(previous.dateKey, previous.counters, 1);
		const dateKey = toDateKey(time);
		this.addDaily(dateKey, counters, 1);
		if (previous.provider === provider && previous.model === model) {
			const sessionModel = this.modelRecordFor(record.models, provider, model);
			sessionModel.counters = addCounters(sessionModel.counters, delta);
			const globalModel = this.modelRecordFor(this.modelRecords, provider, model);
			globalModel.counters = addCounters(globalModel.counters, delta);
		} else {
			const previousSessionModel = this.modelRecordFor(record.models, previous.provider, previous.model);
			previousSessionModel.counters = subtractCounters(previousSessionModel.counters, previous.counters);
			previousSessionModel.calls -= 1;
			const previousGlobalModel = this.modelRecordFor(this.modelRecords, previous.provider, previous.model);
			previousGlobalModel.counters = subtractCounters(previousGlobalModel.counters, previous.counters);
			previousGlobalModel.calls -= 1;
			this.addModelUsage(record.models, provider, model, counters);
		}
		record.last = {
			turn: previous.turn,
			step: previous.step,
			counters,
			provider,
			model,
			dateKey
		};
	}
	consumeEvent(sessionId, event) {
		const compaction = event;
		if (compaction.type === "compaction/summary") {
			if (compaction.data.usage === void 0) return;
			const counters = countersFromUsage(compaction.data.usage);
			const record = this.recordFor(sessionId);
			this.addUsage(record, compaction.data.provider ?? "unknown", compaction.data.model ?? "unknown", counters, event.time);
			return;
		}
		if (event.type === "assistant/chunk" && event.data.chunk.type === "usage") {
			const { turn, step } = event.data;
			const record = this.recordFor(sessionId);
			record.pending = {
				turn,
				step,
				counters: countersFromUsage(event.data.chunk.usage)
			};
			return;
		}
		if (event.type === "assistant/message") {
			const { turn, step, message, usage } = event.data;
			const record = this.recordFor(sessionId);
			const pending = record.pending !== null && record.pending.turn === turn && record.pending.step === step ? record.pending : void 0;
			const counters = usage !== void 0 ? countersFromUsage(usage) : pending?.counters;
			if (counters === void 0) {
				if (pending !== void 0) record.pending = null;
				return;
			}
			record.pending = null;
			const provider = message.source?.provider ?? "unknown";
			const model = message.source?.model ?? "unknown";
			const previous = record.last !== null && record.last.turn === turn && record.last.step === step ? record.last : void 0;
			if (previous !== void 0) {
				if (previous.provider === provider && previous.model === model && countersEqual(previous.counters, counters)) return;
				this.replaceUsage(record, previous, provider, model, counters, event.time);
				return;
			}
			this.addUsage(record, provider, model, counters, event.time);
			record.last = {
				turn,
				step,
				counters,
				provider,
				model,
				dateKey: toDateKey(event.time)
			};
			return;
		}
		if (event.type === "step/end" || event.type === "turn/end") {
			const record = this.records.get(sessionId);
			if (record !== void 0 && record.pending !== null) record.pending = null;
		}
	}
};
//#endregion
export { Config, TokenUsageCounter, TokenUsageCounter as default, apply, inject, name };
