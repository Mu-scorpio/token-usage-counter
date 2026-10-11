import { Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
//#region node_modules/zod/v4/core/util.js
function jsonStringifyReplacer(_, value) {
	if (typeof value === "bigint") return value.toString();
	return value;
}
var Cached = class {
	constructor(getter) {
		this._getter = getter;
		this._value = void 0;
	}
	get value() {
		const getter = this._getter;
		if (getter !== void 0) {
			this._value = getter();
			this._getter = void 0;
		}
		return this._value;
	}
};
function cached(getter) {
	return new Cached(getter);
}
function cleanRegex(source) {
	const start = source.startsWith("^") ? 1 : 0;
	const end = source.endsWith("$") ? source.length - 1 : source.length;
	return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
	const ratio = val / step;
	const roundedRatio = Math.round(ratio);
	const tolerance = 4 * Number.EPSILON * Math.max(Math.abs(ratio), 1);
	if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
	return ratio - roundedRatio;
}
function assignProp(target, prop, value) {
	Object.defineProperty(target, prop, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
	return typeof data === "object" && data !== null && !Array.isArray(data);
}
function clone(inst, def, params) {
	const cl = new inst._zod.constr(def ?? inst._zod.def);
	if (!def || params?.parent) cl._zod.parent = inst;
	return cl;
}
function normalizeParams(_params) {
	const params = _params;
	if (!params) return {};
	if (typeof params === "string") return { error: () => params };
	if (params?.message !== void 0) {
		if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
		params.error = params.message;
	}
	delete params.message;
	if (typeof params.error === "string") return {
		...params,
		error: () => params.error
	};
	return params;
}
function optionalKeys(shape) {
	return Object.keys(shape).filter((k) => {
		return shape[k]._zod.optin !== void 0 && shape[k]._zod.optout === "optional";
	});
}
function aborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
	return false;
}
function explicitlyAborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
	return false;
}
function prefixIssues(path, issues) {
	return issues.map((iss) => {
		var _a;
		(_a = iss).path ?? (_a.path = []);
		iss.path.unshift(path);
		return iss;
	});
}
function unwrapMessage(message) {
	return typeof message === "string" ? message : message?.message;
}
function attachSchema(issues, start, inst) {
	var _a;
	for (let i = start; i < issues.length; i++) (_a = issues[i]).schema ?? (_a.schema = inst);
}
function finalizeIssue(iss, ctx, config) {
	var _a;
	const traits = iss.inst?._zod?.traits;
	if (traits?.has("$ZodType")) {
		if (traits.has("$ZodCheck")) (_a = iss).schema ?? (_a.schema = iss.inst);
		else iss.schema = iss.inst;
	}
	const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : void 0;
	const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(schemaError?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
	const full = {};
	for (const k of Object.keys(iss)) {
		if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__") continue;
		full[k] = iss[k];
	}
	full.path ?? (full.path = []);
	full.message = message;
	if (ctx?.reportInput) full.input = iss.input;
	return full;
}
/**
* Installs a trait's members on its prototype. Each value builds that member for the instance on first read; the built value shadows the accessor as an own property, so a detached `const { parse } = schema` keeps working.
*
* Call this from a `proto` initializer, which runs once per prototype — never per instance.
*/
function members(proto, table) {
	for (const key in table) {
		const desc = Object.getOwnPropertyDescriptor(table, key);
		if (desc.get) Object.defineProperty(proto, key, {
			...desc,
			enumerable: false
		});
		else defineBound(proto, key, desc.value);
	}
}
/** Shadows a prototype member with an own value, so a getter that builds from the instance runs once. */
function own(inst, key, value, enumerable = true) {
	Object.defineProperty(inst, key, {
		configurable: true,
		writable: true,
		enumerable,
		value
	});
	return value;
}
/** Like {@link own}, for a member that was never an own data property and has to stay out of `Object.keys`. */
function hide(inst, key, value) {
	return own(inst, key, value, false);
}
function defineBound(proto, key, fn) {
	Object.defineProperty(proto, key, {
		configurable: true,
		get() {
			return this == null ? fn : own(this, key, fn.bind(this));
		},
		set(value) {
			own(this, key, value);
		}
	});
}
/** Returns the prototype to install on, or `undefined` if this group is already installed on it. */
function claim(inst, sentinel) {
	const proto = Object.getPrototypeOf(inst);
	return sentinel in proto ? void 0 : proto;
}
let installing;
let broke = false;
const breaker = {
	configurable: true,
	get() {
		broke = true;
	}
};
/**
* Installs a lazily-derived internal on the `_zod` prototype of `inst`'s
* constructor, computed from the internals object itself and cached there on
* first read. One accessor per constructor rather than one per instance.
*/
function defineLazyInternal(inst, key, compute) {
	const proto = Object.getPrototypeOf(inst._zod);
	if (key in proto && installing !== inst._zod) {
		installing = void 0;
		return;
	}
	installing = inst._zod;
	Object.defineProperty(proto, key, {
		configurable: true,
		get() {
			Object.defineProperty(this, key, breaker);
			const outer = broke;
			broke = false;
			try {
				const value = compute(this);
				if (broke) delete this[key];
				else Object.defineProperty(this, key, {
					configurable: true,
					writable: true,
					value
				});
				broke = broke || outer;
				return value;
			} catch (err) {
				delete this[key];
				broke = broke || outer;
				throw err;
			}
		},
		set(value) {
			Object.defineProperty(this, key, {
				configurable: true,
				writable: true,
				value
			});
		}
	});
}
/**
* Installs `key` on `inst`'s prototype, computed by `make` on first read and cached there as an own
* data property. One accessor per constructor rather than one per instance, because an own accessor
* puts every instance after the first into v8 dictionary mode. The key doubles as the sentinel.
*/
function installLazyProp(inst, key, make, enumerable) {
	const proto = claim(inst, key);
	if (!proto) return;
	Object.defineProperty(proto, key, {
		configurable: true,
		get() {
			const desc = {
				configurable: true,
				writable: true,
				enumerable,
				value: void 0
			};
			Object.defineProperty(this, key, desc);
			desc.value = make(this);
			Object.defineProperty(this, key, desc);
			return desc.value;
		},
		set(value) {
			Object.defineProperty(this, key, {
				configurable: true,
				writable: true,
				enumerable,
				value
			});
		}
	});
}
//#endregion
//#region node_modules/zod/v4/core/core.js
var _a;
const _zodDesc = {
	value: void 0,
	enumerable: false
};
let _E = "captureStackTrace" in Error ? Error : null;
function newError(Definition) {
	const E = _E;
	if (E) {
		const saved = E.stackTraceLimit;
		if (typeof saved === "number") {
			try {
				E.stackTraceLimit = 0;
			} catch {
				_E = null;
				return new Definition();
			}
			try {
				return new Definition();
			} finally {
				E.stackTraceLimit = saved;
			}
		}
	}
	return new Definition();
}
function $constructor(name, initializer, proto, params) {
	const zodProto = {};
	function Internals(def) {
		this.def = def;
		this.constr = _;
		this.traits = /* @__PURE__ */ new Set();
	}
	Internals.prototype = zodProto;
	const protoMembers = proto;
	const initialized = protoMembers && /* @__PURE__ */ new WeakSet();
	function init(inst, def) {
		if (!inst._zod) {
			_zodDesc.value = new Internals(def);
			try {
				Object.defineProperty(inst, "_zod", _zodDesc);
			} finally {
				_zodDesc.value = void 0;
			}
		} else if (inst._zod.traits.has(name)) return;
		inst._zod.traits.add(name);
		initializer(inst, def);
		if (initialized) {
			const own = Object.getPrototypeOf(inst);
			const ctorProto = inst._zod.constr.prototype;
			let up = own;
			while (up && up !== ctorProto) up = Object.getPrototypeOf(up);
			const target = up ?? own;
			if (!initialized.has(target)) {
				initialized.add(target);
				members(target, protoMembers);
			}
		}
		const proto = _.prototype;
		for (const k in proto) {
			if (!Object.prototype.hasOwnProperty.call(proto, k)) continue;
			if (!(k in inst)) inst[k] = proto[k].bind(inst);
		}
	}
	const Parent = params?.Parent ?? Object;
	class Definition extends Parent {}
	Object.defineProperty(Definition, "name", { value: name });
	function _(def) {
		const inst = params?.Parent ? newError(Definition) : this;
		init(inst, def);
		const deferred = inst._zod.deferred;
		if (deferred) {
			for (const fn of deferred) fn();
			inst._zod.deferred = void 0;
		}
		const pp = globalThis.__zod_globalConfig?.postProcessor;
		if (pp) pp(inst);
		return inst;
	}
	Object.defineProperty(_, "init", { value: init });
	Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
		if (params?.Parent && inst instanceof params.Parent) return true;
		return inst?._zod?.traits?.has(name);
	} });
	Object.defineProperty(_, "name", { value: name });
	return _;
}
var $ZodAsyncError = class extends Error {
	constructor() {
		super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
	}
};
(_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
const globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
	if (newConfig) Object.assign(globalConfig, newConfig);
	return globalConfig;
}
//#endregion
//#region node_modules/zod/v4/core/errors.js
function _getMessage() {
	const internals = this._zod;
	internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
	return internals.message;
}
function _setMessage(value) {
	this._zod.message = value;
}
const _messageDesc = {
	get: _getMessage,
	set: _setMessage,
	enumerable: true,
	configurable: true
};
const _issuesDesc = {
	value: void 0,
	enumerable: false
};
const _installedToString = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
const initializer = (inst, def) => {
	inst.name = "$ZodError";
	_issuesDesc.value = def;
	Object.defineProperty(inst, "issues", _issuesDesc);
	_issuesDesc.value = void 0;
	Object.defineProperty(inst, "message", _messageDesc);
	const proto = Object.getPrototypeOf(inst);
	if (!_installedToString.has(proto)) {
		_installedToString.add(proto);
		Object.defineProperty(proto, "toString", {
			configurable: true,
			enumerable: false,
			get() {
				const value = () => this.message;
				Object.defineProperty(this, "toString", {
					value,
					configurable: true,
					writable: true
				});
				return value;
			},
			set(value) {
				Object.defineProperty(this, "toString", {
					value,
					configurable: true,
					writable: true
				});
			}
		});
	}
};
$constructor("$ZodError", initializer);
const $ZodRealError = $constructor("$ZodError", initializer, void 0, { Parent: Error });
//#endregion
//#region node_modules/zod/v4/core/parse.js
const _parse = (_Err) => {
	const fn = (schema, value, _ctx, _params) => {
		const ctx = _ctx ? {
			..._ctx,
			async: false
		} : { async: false };
		const result = schema._zod.run({
			value,
			issues: []
		}, ctx);
		if (result instanceof Promise) throw new $ZodAsyncError();
		if (result.issues.length) {
			const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
			captureStackTrace(e, _params?.callee ?? fn);
			throw e;
		}
		return result.value;
	};
	return fn;
};
const parse = /* @__PURE__*/ _parse($ZodRealError);
const _parseAsync = (_Err) => {
	const fn = async (schema, value, _ctx, params) => {
		const ctx = _ctx ? {
			..._ctx,
			async: true
		} : { async: true };
		let result = schema._zod.run({
			value,
			issues: []
		}, ctx);
		if (result instanceof Promise) result = await result;
		if (result.issues.length) {
			const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
			captureStackTrace(e, params?.callee ?? fn);
			throw e;
		}
		return result.value;
	};
	return fn;
};
const parseAsync = /* @__PURE__*/ _parseAsync($ZodRealError);
const _safeParse = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: false
	} : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	return result.issues.length ? failure(_Err, result.issues, ctx) : {
		success: true,
		data: result.value
	};
};
const safeParse = /* @__PURE__*/ _safeParse($ZodRealError);
function failure(Err, issues, ctx) {
	let error;
	return {
		success: false,
		get error() {
			if (!error) {
				error = new Err(issues.map((iss) => finalizeIssue(iss, ctx, config())));
				issues = void 0;
				ctx = void 0;
			}
			return error;
		},
		set error(e) {
			error = e;
			issues = void 0;
			ctx = void 0;
		}
	};
}
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: true
	} : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	return result.issues.length ? failure(_Err, result.issues, ctx) : {
		success: true,
		data: result.value
	};
};
const safeParseAsync = /* @__PURE__*/ _safeParseAsync($ZodRealError);
//#endregion
//#region node_modules/zod/v4/core/regexes.js
const anyString = /^[\s\S]{0,}$/;
const number$1 = /^-?\d+(?:\.\d+)?$/;
//#endregion
//#region node_modules/zod/v4/core/checks.js
const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
	var _a;
	inst._zod ?? (inst._zod = {});
	inst._zod.def = def;
	(_a = inst._zod).onattach ?? (_a.onattach = []);
});
const numericOriginMap = {
	number: "number",
	bigint: "bigint",
	object: "date"
};
const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
		payload.issues.push({
			origin: numericOriginMap[typeof payload.value] ?? origin,
			code: "too_small",
			minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.check = (payload) => {
		if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
		if (typeof payload.value === "bigint" ? def.value !== BigInt(0) && payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
		payload.issues.push({
			origin: typeof payload.value,
			code: "not_multiple_of",
			divisor: def.value,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
//#endregion
//#region node_modules/zod/v4/core/versions.js
const version = {
	major: 4,
	minor: 6,
	patch: 5
};
//#endregion
//#region node_modules/zod/v4/core/schemas.js
const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
	var _a;
	inst ?? (inst = {});
	inst._zod.def = def;
	inst._zod.bag = inst._zod.bag || {};
	inst._zod.version = version;
	const defChecks = inst._zod.def.checks;
	const checks = inst._zod.traits.has("$ZodCheck") ? [inst, ...defChecks ?? []] : defChecks?.length ? [...defChecks] : [];
	for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
	if (checks.length === 0) {
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred?.push(() => {
			inst._zod.run = inst._zod.parse;
		});
	} else {
		const runChecks = (payload, checks, ctx) => {
			if (payload.memo) return payload;
			let isAborted = aborted(payload);
			let asyncResult;
			for (const ch of checks) {
				if (ch._zod.def.when) {
					if (explicitlyAborted(payload)) continue;
					if (!ch._zod.def.when(payload)) continue;
				} else if (isAborted) continue;
				const currLen = payload.issues.length;
				const _ = ch._zod.check(payload);
				if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
				if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
					await _;
					if (payload.issues.length === currLen) return;
					attachSchema(payload.issues, currLen, inst);
					if (!isAborted) isAborted = aborted(payload, currLen);
				});
				else {
					if (payload.issues.length === currLen) continue;
					attachSchema(payload.issues, currLen, inst);
					if (!isAborted) isAborted = aborted(payload, currLen);
				}
			}
			if (asyncResult) return asyncResult.then(() => {
				return payload;
			});
			return payload;
		};
		const handleCanaryResult = (canary, payload, ctx) => {
			if (aborted(canary)) {
				canary.aborted = true;
				return canary;
			}
			const checkResult = runChecks(payload, checks, ctx);
			if (checkResult instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
			}
			return inst._zod.parse(checkResult, ctx);
		};
		inst._zod.run = (payload, ctx) => {
			if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
			if (ctx.direction === "backward") {
				const canary = inst._zod.parse({
					value: payload.value,
					issues: []
				}, {
					...ctx,
					skipChecks: true
				});
				if (canary instanceof Promise) return canary.then((canary) => {
					return handleCanaryResult(canary, payload, ctx);
				});
				return handleCanaryResult(canary, payload, ctx);
			}
			const result = inst._zod.parse(payload, ctx);
			if (result instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return result.then((result) => runChecks(result, checks, ctx));
			}
			return runChecks(result, checks, ctx);
		};
	}
}, {
	get "~standard"() {
		return hide(this, "~standard", standardProps(this));
	},
	set "~standard"(value) {
		own(this, "~standard", value);
	}
});
/** The Standard Schema surface for `inst`. Shared so wrappers can extend it without forcing it. */
const toStandardResult = (r, ctx) => r.issues.length ? { issues: r.issues.map((iss) => finalizeIssue(iss, ctx, config())) } : { value: r.value };
async function validateAsync(inst, value) {
	const ctx = { async: true };
	return toStandardResult(await inst._zod.run({
		value,
		issues: []
	}, ctx), ctx);
}
function standardProps(inst) {
	return {
		validate: (value) => {
			const ctx = { async: false };
			try {
				const r = inst._zod.run({
					value,
					issues: []
				}, ctx);
				if (!(r instanceof Promise)) return toStandardResult(r, ctx);
			} catch (_) {}
			return validateAsync(inst, value);
		},
		vendor: "zod",
		version: 1
	};
}
const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = def.pattern ?? anyString;
	inst._zod.parse = (payload, _) => {
		if (def.coerce) try {
			payload.value = String(payload.value);
		} catch (_) {}
		if (typeof payload.value === "string") return payload;
		payload.issues.push({
			expected: "string",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = number$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Number(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
		const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? String(input) : void 0 : void 0;
		payload.issues.push({
			expected: "number",
			code: "invalid_type",
			input,
			inst,
			...received ? { received } : {}
		});
		return payload;
	};
});
function handleArrayResult(result, final, index) {
	if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
	final.value[index] = result.value;
}
const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
	$ZodType.init(inst, def);
	const memo = globalConfig.memoizer;
	memo?.attach(inst);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!Array.isArray(input)) {
			payload.issues.push({
				expected: "array",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = memo ? memo.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
		const proms = [];
		const abortEarly = ctx?.abortEarly;
		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const result = def.element._zod.run({
				value: item,
				issues: []
			}, ctx);
			if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
			else {
				handleArrayResult(result, payload, i);
				if (abortEarly && result.issues.length !== 0 && aborted(result)) break;
			}
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
function handlePropertyResult(result, final, key, input, optin, optout) {
	const isPresent = key in input;
	const isOptionalOut = optout === "optional";
	if (!isPresent && isOptionalOut && optin === "optional") return;
	if (result.issues.length) {
		if (optin !== void 0 && isOptionalOut && !isPresent) return;
		final.issues.push(...prefixIssues(key, result.issues));
	}
	if (!isPresent && optin === void 0) {
		if (!result.issues.length) final.issues.push({
			code: "invalid_type",
			expected: "nonoptional",
			input: void 0,
			path: [key]
		});
		return;
	}
	if (result.value === void 0) {
		if (isPresent || optin === "defaulted" && !isOptionalOut) final.value[key] = void 0;
	} else final.value[key] = result.value;
}
const NO_SYMBOL_KEYS = [];
function normalizeDef(def) {
	const keys = Object.keys(def.shape);
	const ownSymbols = Object.getOwnPropertySymbols(def.shape);
	const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
	const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
	for (const k of allKeys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
	const okeys = optionalKeys(def.shape);
	return {
		...def,
		allKeys,
		symbolKeys,
		keySet: new Set(keys),
		numKeys: keys.length,
		optionalKeys: new Set(okeys)
	};
}
function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
	const unrecognized = [];
	const keySet = def.keySet;
	const _catchall = def.catchall._zod;
	const t = _catchall.def.type;
	const optin = _catchall.optin;
	const optout = _catchall.optout;
	let seen = 0;
	for (const key in input) {
		if (abortEarly && payload.issues.length !== seen) {
			if (aborted(payload, seen)) break;
			seen = payload.issues.length;
		}
		if (keySet.has(key)) continue;
		if (key === "__proto__") {
			if (t === "never") unrecognized.push(key);
			continue;
		}
		if (t === "never") {
			unrecognized.push(key);
			continue;
		}
		const r = _catchall.run({
			value: input[key],
			issues: []
		}, ctx);
		if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
		else handlePropertyResult(r, payload, key, input, optin, optout);
	}
	if (unrecognized.length) payload.issues.push({
		code: "unrecognized_keys",
		keys: unrecognized,
		input,
		inst,
		continue: true
	});
	if (!proms.length) return payload;
	return Promise.all(proms).then(() => {
		return payload;
	});
}
const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
	$ZodType.init(inst, def);
	const desc = Object.getOwnPropertyDescriptor(def, "shape");
	const sh = desc?.get ? desc.get.raw : def.shape ?? {};
	if (sh) {
		const get = () => {
			const newSh = { ...sh };
			Object.defineProperty(def, "shape", { value: newSh });
			get.raw = newSh;
			return newSh;
		};
		get.raw = sh;
		Object.defineProperty(def, "shape", { get });
	}
	const _normalized = cached(() => normalizeDef(def));
	defineLazyInternal(inst, "propValues", (zod) => {
		const shape = zod.def.shape;
		const propValues = {};
		for (const key in shape) {
			const field = shape[key]._zod;
			if (field.values) {
				if (!Object.prototype.hasOwnProperty.call(propValues, key)) assignProp(propValues, key, /* @__PURE__ */ new Set());
				for (const v of field.values) propValues[key].add(v);
				if (field.optin !== void 0) propValues[key].add(void 0);
			}
		}
		return propValues;
	});
	const isObject$2 = isObject;
	const catchall = def.catchall;
	let value;
	const memo = globalConfig.memoizer;
	memo?.attach(inst);
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$2(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
		const proms = [];
		const shape = value.shape;
		const abortEarly = ctx?.abortEarly;
		let seen = payload.issues.length;
		for (const key of value.allKeys) {
			if (abortEarly && payload.issues.length !== seen) {
				if (aborted(payload, seen)) break;
				seen = payload.issues.length;
			}
			if (key === "__proto__") continue;
			const el = shape[key];
			const optin = el._zod.optin;
			const optout = el._zod.optout;
			const r = el._zod.run({
				value: input[key],
				issues: []
			}, ctx);
			if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
			else handlePropertyResult(r, payload, key, input, optin, optout);
		}
		if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
		return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
	};
});
function handleOptionalResult(payload, result) {
	payload.value = result.issues.length ? void 0 : result.value;
	return payload;
}
const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
	inst._zod.optout = "optional";
	defineLazyInternal(inst, "values", (zod) => {
		const values = zod.def.innerType._zod.values;
		return values ? /* @__PURE__ */ new Set([...values, void 0]) : void 0;
	});
	defineLazyInternal(inst, "pattern", (zod) => {
		const pattern = zod.def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === void 0) {
			if (def.innerType._zod.optin !== "defaulted") return payload;
			const result = def.innerType._zod.run({
				value: payload.value,
				issues: []
			}, ctx);
			if (result instanceof Promise) return result.then((result) => handleOptionalResult(payload, result));
			return handleOptionalResult(payload, result);
		}
		return def.innerType._zod.run(payload, ctx);
	};
});
//#endregion
//#region node_modules/zod/v4/core/api.js
function snapshotChecks(def) {
	if (def.checks) def.checks = [...def.checks];
	return def;
}
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
	return new Class(snapshotChecks({
		type: "string",
		...normalizeParams(params)
	}));
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
	return new Class(snapshotChecks({
		type: "number",
		checks: [],
		...normalizeParams(params)
	}));
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
	return new $ZodCheckMultipleOf({
		check: "multiple_of",
		...normalizeParams(params),
		value
	});
}
//#endregion
//#region node_modules/zod/v4/mini/schemas.js
const ZodMiniType = /*@__PURE__*/ $constructor("ZodMiniType", (inst, def) => {
	if (!inst._zod) throw new Error("Uninitialized schema in ZodMiniType.");
	$ZodType.init(inst, def);
	inst.def = def;
	inst.type = def.type;
}, {
	get with() {
		return this.check;
	},
	set with(value) {
		own(this, "with", value);
	},
	parse(data, params) {
		return parse(this, data, params, { callee: this.parse });
	},
	parseAsync(data, params) {
		return parseAsync(this, data, params, { callee: this.parseAsync });
	},
	safeParse(data, params) {
		return safeParse(this, data, params);
	},
	safeParseAsync(data, params) {
		return safeParseAsync(this, data, params);
	},
	check(...checks) {
		const def = this.def;
		return this.clone({
			...def,
			checks: [...def.checks ?? [], ...checks.map((ch) => typeof ch === "function" ? { _zod: {
				check: ch,
				def: { check: "custom" },
				onattach: []
			} } : ch)]
		}, { parent: true });
	},
	clone(_def, params) {
		return clone(this, _def, params);
	},
	brand() {
		return this;
	},
	register(reg, meta) {
		reg.add(this, meta);
		return this;
	},
	apply(fn, ...args) {
		return args.length === 0 ? fn(this) : fn(this, ...args);
	}
});
const ZodMiniString = /*@__PURE__*/ $constructor("ZodMiniString", (inst, def) => {
	$ZodString.init(inst, def);
	ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function string(params) {
	return /* @__PURE__ */ _string(ZodMiniString, params);
}
const ZodMiniNumber = /*@__PURE__*/ $constructor("ZodMiniNumber", (inst, def) => {
	$ZodNumber.init(inst, def);
	ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function number(params) {
	return /* @__PURE__ */ _number(ZodMiniNumber, params);
}
const ZodMiniArray = /*@__PURE__*/ $constructor("ZodMiniArray", (inst, def) => {
	$ZodArray.init(inst, def);
	ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function array(element, params) {
	return new ZodMiniArray({
		type: "array",
		element,
		...normalizeParams(params)
	});
}
const ZodMiniObject = /*@__PURE__*/ $constructor("ZodMiniObject", (inst, def) => {
	$ZodObject.init(inst, def);
	ZodMiniType.init(inst, def);
	installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
});
// @__NO_SIDE_EFFECTS__
function object(shape, params) {
	const def = {
		type: "object",
		shape: shape ?? {},
		...normalizeParams(params)
	};
	return new ZodMiniObject(def);
}
const ZodMiniOptional = /*@__PURE__*/ $constructor("ZodMiniOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function optional(innerType) {
	return new ZodMiniOptional({
		type: "optional",
		innerType
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
const storedCount = (/* @__PURE__ */ number()).check(/* @__PURE__ */ _gte(0), /* @__PURE__ */ _multipleOf(1));
const storedCounters = /* @__PURE__ */ object({
	inputTokens: storedCount,
	outputTokens: storedCount,
	cacheReadTokens: storedCount,
	cacheWriteTokens: storedCount,
	totalTokens: storedCount
});
const storedModel = /* @__PURE__ */ object({
	provider: /* @__PURE__ */ string(),
	model: /* @__PURE__ */ string(),
	counters: storedCounters,
	calls: storedCount
});
const storedStep = /* @__PURE__ */ object({
	turn: storedCount,
	step: storedCount,
	counters: storedCounters
});
const storedSnapshot = /* @__PURE__ */ object({
	totals: /* @__PURE__ */ object({
		...storedCounters.shape,
		calls: storedCount
	}),
	calls: storedCount,
	daily: /* @__PURE__ */ array(/* @__PURE__ */ object({
		date: /* @__PURE__ */ string(),
		tokens: storedCount,
		calls: storedCount,
		inputTokens: /* @__PURE__ */ optional(storedCount),
		outputTokens: /* @__PURE__ */ optional(storedCount),
		cacheReadTokens: /* @__PURE__ */ optional(storedCount),
		cacheWriteTokens: /* @__PURE__ */ optional(storedCount)
	})),
	models: /* @__PURE__ */ array(storedModel),
	sessions: /* @__PURE__ */ array(/* @__PURE__ */ object({
		sessionId: /* @__PURE__ */ string(),
		consumedSeq: storedCount,
		counters: storedCounters,
		calls: storedCount,
		models: /* @__PURE__ */ array(storedModel),
		pending: /* @__PURE__ */ optional(storedStep),
		last: /* @__PURE__ */ optional(/* @__PURE__ */ object({
			...storedStep.shape,
			provider: /* @__PURE__ */ string(),
			model: /* @__PURE__ */ string(),
			dateKey: /* @__PURE__ */ string()
		}))
	}))
});
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
const TOKEN_USAGE_COUNTER_NAMESPACE = "dsh-token-usage-counter";
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
	const compatible = session;
	const events = typeof compatible.snapshotEvents === "function" ? compatible.snapshotEvents() : compatible.events ?? [];
	return {
		sessionId: session.id,
		header: session.header,
		events,
		firstLiveSeq: session.firstLiveSeq
	};
}
function legacySeedLength(header) {
	return header.seedLength ?? 0;
}
function seedEndFor(history) {
	const boundary = history.firstLiveSeq ?? legacySeedLength(history.header);
	return history.events[boundary]?.type === "session/end-seed" ? boundary + 1 : boundary;
}
const name = "token-usage-counter";
/** The plugin needs the session store and settings to persist across restarts. */
const inject = ["sessions", "settings"];
function apply(ctx) {
	if (typeof ctx.settings.register === "function") ctx.plugin(TokenUsageCounter);
	else ctx.inject(["storageDomain"], async (storageCtx) => {
		const domain = await storageCtx.storageDomain.open({
			name: "dsh_token_usage_counter",
			version: 1,
			tables: {},
			global: {
				schema: storedSnapshot,
				initial: TOKEN_USAGE_COUNTER_SCHEMA({})
			}
		});
		const store = {
			get: () => domain.global.get(),
			replace: (value) => domain.global.set(value)
		};
		storageCtx.effect(() => () => domain.close(), "token-usage-counter: storage close");
		storageCtx.plugin(TokenUsageCounter, { store });
	});
	ctx.inject([
		"webServer",
		"connection",
		"tokenUsageCounter"
	], (webCtx) => {
		webCtx.effect(() => webCtx.webServer.register({
			kind: "exact",
			path: "/api2/dsh-token-usage-counter/snapshot",
			handler: async (req, res) => {
				const send = (status, value) => {
					res.writeHead(status, {
						"content-type": "application/json",
						"cache-control": "no-store"
					});
					res.end(JSON.stringify(value));
				};
				let rejection = 503;
				try {
					rejection = await webCtx.connection.requestRejection(req);
				} catch {}
				if (rejection !== void 0) return send([401, 403].includes(rejection) ? rejection : 503, { error: "authentication-required" });
				if (req.method !== "GET") return send(405, { error: "GET-required" });
				const origin = req.headers.origin;
				if (origin) try {
					if (new URL(origin).host !== req.headers.host) return send(403, { error: "cross-origin-denied" });
				} catch {
					return send(403, { error: "cross-origin-denied" });
				}
				const snapshot = webCtx.tokenUsageCounter.snapshot();
				send(200, {
					totals: snapshot.totals,
					daily: snapshot.daily,
					models: snapshot.models
				});
			}
		}), "token-usage-counter: read-only snapshot route");
	});
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
	constructor(ctx, options) {
		super(ctx, "tokenUsageCounter");
		const scope = options?.store ?? ctx.settings.register(TOKEN_USAGE_COUNTER_NAMESPACE, TOKEN_USAGE_COUNTER_SCHEMA);
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
			const compatible = persistence;
			const headers = await compatible.list();
			const histories = /* @__PURE__ */ new Map();
			for (const item of headers) {
				const header = "header" in item ? item.header : item;
				if (typeof compatible.inspect === "function") {
					const inspection = await compatible.inspect(header.id);
					histories.set(String(header.id), {
						sessionId: String(header.id),
						header: inspection.meta,
						events: inspection.events
					});
				} else {
					const handle = await compatible.open(header.id, "read");
					try {
						const { events } = await handle.read();
						histories.set(String(header.id), {
							sessionId: String(header.id),
							header: handle.header,
							events,
							firstLiveSeq: handle.inheritedEventCount
						});
					} finally {
						await handle.close();
					}
				}
			}
			for (const session of this.ctx.sessions.list()) histories.set(session.id, historyFromSession(session));
			const ordered = [...histories.values()].sort((left, right) => legacySeedLength(left.header) - legacySeedLength(right.header) || left.header.createdAt - right.header.createdAt);
			if (this.records.size === 0 && this.totals.totalTokens === 0 && this.calls === 0) for (const history of ordered) this.adoptHistory(history);
			if (this.dailyNeedsBackfill) this.backfillDailyBreakdown(ordered);
			this.schedulePersist(0);
		} catch {
			this.ctx.logger.warn("[usage-counter] failed to backfill persisted sessions; existing totals retained");
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
	* history in either the legacy events array or the newer snapshotEvents()
	* API; session/event only fires for events appended after construction. The
	* seq watermark lets a resumed session continue from where a previous live
	* instance of the same id stopped without double counting its seed history.
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
var src_default = {
	name,
	inject,
	apply
};
//#endregion
export { TokenUsageCounter, apply, src_default as default, inject, name };
