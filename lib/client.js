window.__ModuleLoader__.load({
	id: "dsh-token-usage-counter",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/UsageStatsSection.tsx
		const HEATMAP_MIN_WEEKS = 12;
		const HEATMAP_MAX_WEEKS = 52;
		const HEATMAP_GAP = 4;
		const css = {
			section: "dsh-token-usage-section",
			status: "dsh-token-usage-status",
			card: "dsh-token-usage-card",
			cardTitle: "dsh-token-usage-card-title",
			totalRows: "dsh-token-usage-total-rows",
			totalItem: "dsh-token-usage-total-item",
			totalItemPrimary: "dsh-token-usage-total-item-primary",
			totalRow: "dsh-token-usage-total-row",
			totalValue: "dsh-token-usage-total-value",
			totalLabel: "dsh-token-usage-total-label",
			heatmapHeader: "dsh-token-usage-heatmap-header",
			heatmapPeriod: "dsh-token-usage-heatmap-period",
			heatmapLayout: "dsh-token-usage-heatmap-layout",
			weekdayLabels: "dsh-token-usage-weekday-labels",
			heatmapGraph: "dsh-token-usage-heatmap-graph",
			monthLabels: "dsh-token-usage-month-labels",
			heatmap: "dsh-token-usage-heatmap",
			day: "dsh-token-usage-day",
			legend: "dsh-token-usage-legend",
			legendSwatch: "dsh-token-usage-legend-swatch",
			modelTableWrap: "dsh-token-usage-model-table-wrap",
			modelTable: "dsh-token-usage-model-table"
		};
		function dateKeyOf(date) {
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		}
		function addDays(date, days) {
			const next = new Date(date);
			next.setDate(next.getDate() + days);
			return next;
		}
		function startOfWeek(date) {
			return addDays(date, -((date.getDay() + 6) % 7));
		}
		function heatmapWeeksForWidth(width) {
			if (width <= 0) return HEATMAP_MIN_WEEKS;
			const estimatedWeeks = Math.floor((width + HEATMAP_GAP) / 22);
			return Math.min(HEATMAP_MAX_WEEKS, Math.max(HEATMAP_MIN_WEEKS, estimatedWeeks));
		}
		function levelFor(tokens, minTokens, maxTokens) {
			if (tokens <= 0 || maxTokens <= 0) return 0;
			if (minTokens === maxTokens) return 3;
			const ratio = (Math.log(tokens) - Math.log(minTokens)) / (Math.log(maxTokens) - Math.log(minTokens));
			if (ratio <= .25) return 1;
			if (ratio <= .5) return 2;
			if (ratio <= .75) return 3;
			return 4;
		}
		function metricsFromDaily(stat) {
			return {
				totalTokens: stat?.tokens ?? 0,
				inputTokens: stat?.inputTokens ?? 0,
				cacheReadTokens: stat?.cacheReadTokens ?? 0,
				outputTokens: stat?.outputTokens ?? 0,
				calls: stat?.calls ?? 0
			};
		}
		function MetricItem({ value, label, formatNumber, primary = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: primary ? `${css.totalItem} ${css.totalItemPrimary}` : css.totalItem,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
					className: css.totalValue,
					children: formatNumber(value)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: css.totalLabel,
					children: label
				})]
			});
		}
		function MetricRows({ metrics, formatNumber, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: css.totalRows,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricItem, {
						value: metrics.totalTokens,
						label: t("totalTokens"),
						formatNumber,
						primary: true
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: css.totalRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricItem, {
							value: metrics.inputTokens,
							label: t("inputTokens"),
							formatNumber
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricItem, {
							value: metrics.cacheReadTokens,
							label: t("cacheReadTokens"),
							formatNumber
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: css.totalRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricItem, {
							value: metrics.outputTokens,
							label: t("outputTokens"),
							formatNumber
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricItem, {
							value: metrics.calls,
							label: t("calls"),
							formatNumber
						})]
					})
				]
			});
		}
		/** Render the plugin-owned usage section in Web Settings. */
		function UsageStatsSection({ scope, t }) {
			const subscribe = (callback) => scope.subscribe(callback);
			const getSnapshot = () => scope.getSnapshot();
			const snapshot = (0, react.useSyncExternalStore)(subscribe, getSnapshot);
			const heatmapGraphRef = (0, react.useRef)(null);
			const [heatmapWidth, setHeatmapWidth] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				const graph = heatmapGraphRef.current;
				if (graph === null) return;
				const updateWidth = () => {
					const nextWidth = graph.getBoundingClientRect().width;
					setHeatmapWidth((previous) => Math.abs(previous - nextWidth) < .5 ? previous : nextWidth);
				};
				updateWidth();
				if (typeof ResizeObserver === "undefined") return;
				const observer = new ResizeObserver(updateWidth);
				observer.observe(graph);
				return () => observer.disconnect();
			}, [snapshot.status]);
			if (snapshot.status === "unavailable") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: css.card,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: css.cardTitle,
						children: t("unavailableTitle")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: css.status,
						children: t("unavailableReason")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
						className: css.status,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("unavailableFixInstall") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("unavailableFixRestart") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("unavailableFixLog") })
						]
					})
				]
			});
			if (snapshot.status === "loading" || snapshot.value === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: css.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: css.status,
					children: t("loading")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: css.status,
					children: t("loadingHint")
				})]
			});
			const value = snapshot.value;
			const daily = new Map(value.daily.map((day) => [day.date, day]));
			const formatNumber = (number) => number.toLocaleString();
			const heatmapWeeks = heatmapWeeksForWidth(heatmapWidth);
			const heatmapDays = heatmapWeeks * 7;
			const heatmapStyle = {
				"--dsh-token-usage-weeks": heatmapWeeks,
				"--dsh-token-usage-cell-size": `${heatmapWidth > 0 ? Math.max(10, (heatmapWidth - HEATMAP_GAP * (heatmapWeeks - 1)) / heatmapWeeks) : 14}px`
			};
			const today = /* @__PURE__ */ new Date();
			today.setHours(0, 0, 0, 0);
			const todayKey = dateKeyOf(today);
			const start = addDays(startOfWeek(today), -(heatmapWeeks - 1) * 7);
			const cells = Array.from({ length: heatmapDays }, (_, index) => {
				const key = dateKeyOf(addDays(start, index));
				return {
					key,
					stat: daily.get(key),
					level: 0
				};
			});
			const weekStarts = Array.from({ length: heatmapWeeks }, (_, index) => addDays(start, index * 7));
			const positiveTokens = cells.map((cell) => cell.stat?.tokens ?? 0).filter((tokens) => tokens > 0);
			const minTokens = positiveTokens.length > 0 ? Math.min(...positiveTokens) : 0;
			const maxTokens = positiveTokens.length > 0 ? Math.max(...positiveTokens) : 0;
			for (const cell of cells) cell.level = levelFor(cell.stat?.tokens ?? 0, minTokens, maxTokens);
			const hasVisibleData = cells.some((cell) => (cell.stat?.tokens ?? 0) > 0 || (cell.stat?.calls ?? 0) > 0);
			const todayStat = daily.get(todayKey);
			const models = [...value.models ?? []].sort((a, b) => b.counters.totalTokens - a.counters.totalTokens);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: css.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: css.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: css.cardTitle,
							children: t("totalTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRows, {
							metrics: {
								totalTokens: value.totals.totalTokens,
								inputTokens: value.totals.inputTokens,
								cacheReadTokens: value.totals.cacheReadTokens,
								outputTokens: value.totals.outputTokens,
								calls: value.totals.calls
							},
							formatNumber,
							t
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: css.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: css.cardTitle,
							children: t("todayTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricRows, {
							metrics: metricsFromDaily(todayStat),
							formatNumber,
							t
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: css.card,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: css.cardTitle,
								children: t("heatmapTitle")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: css.heatmapHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: css.status,
									children: t("heatmapHint", { weeks: heatmapWeeks })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: css.heatmapPeriod,
									children: t("heatmapPeriod", { weeks: heatmapWeeks })
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: css.heatmapLayout,
								style: heatmapStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: css.weekdayLabels,
									"aria-hidden": "true",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("weekdayMon") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("weekdayWed") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("weekdayFri") })
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: css.heatmapGraph,
									ref: heatmapGraphRef,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: css.monthLabels,
										"aria-hidden": "true",
										children: weekStarts.map((weekStart, index) => {
											const previous = index === 0 ? void 0 : weekStarts[index - 1];
											const monthChanged = previous === void 0 || weekStart.getMonth() !== previous.getMonth();
											return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: monthChanged ? t("monthLabel", { month: weekStart.getMonth() + 1 }) : "" }, dateKeyOf(weekStart));
										})
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: css.heatmap,
										role: "img",
										"aria-label": t("heatmapTitle"),
										children: cells.map((cell) => {
											const label = t("dayLabel", {
												date: cell.key,
												tokens: formatNumber(cell.stat?.tokens ?? 0),
												calls: formatNumber(cell.stat?.calls ?? 0)
											});
											return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: css.day,
												"data-level": cell.level,
												"data-today": cell.key === todayKey ? "true" : void 0,
												"data-tooltip": label,
												title: label,
												"aria-label": label,
												tabIndex: 0
											}, cell.key);
										})
									})]
								})]
							}),
							!hasVisibleData && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: css.status,
								children: t("noData")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: css.legend,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("heatmapLess") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: css.legendSwatch,
										"data-level": 0
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: css.legendSwatch,
										"data-level": 1
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: css.legendSwatch,
										"data-level": 2
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: css.legendSwatch,
										"data-level": 3
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: css.legendSwatch,
										"data-level": 4
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("heatmapMore") })
								]
							})
						]
					}),
					value.models !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: css.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: css.cardTitle,
							children: t("modelTitle")
						}), models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: css.status,
							children: t("noModels")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: css.modelTableWrap,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
								className: css.modelTable,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("modelProvider") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("modelName") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("modelTokens") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("modelInput") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("modelOutput") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("modelCacheRead") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("modelCacheWrite") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("modelCalls") })
								] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: model.provider }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: model.model }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: formatNumber(model.counters.totalTokens) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: formatNumber(model.counters.inputTokens) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: formatNumber(model.counters.outputTokens) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: formatNumber(model.counters.cacheReadTokens) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: formatNumber(model.counters.cacheWriteTokens) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: formatNumber(model.calls) })
								] }, `${model.provider}\u0000${model.model}`)) })]
							})
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Localized copy for the self-contained usage statistics Settings section. */
		const zh = {
			nav: "用量统计",
			loading: "正在读取用量统计…",
			unavailableTitle: "无法读取用量统计",
			unavailableReason: "当前环境没有暴露 usage-stats 命名空间，或连接处于本地内存模式。",
			unavailableFixInstall: "请确认已安装 token-usage-counter 插件，并重启 Web Harness。",
			unavailableFixRestart: "修改 profile 后需要重启 dsh web 才会生效。",
			unavailableFixLog: "如果重启后仍然如此，请查看 Harness 日志中的插件加载错误。",
			loadingHint: "如果长时间停留在此状态，请检查插件是否已安装，并重启 Web Harness。",
			totalTitle: "累计 Token 消耗",
			todayTitle: "今日 Token 消耗",
			totalTokens: "总消耗 Token",
			inputTokens: "输入（未命中）",
			outputTokens: "输出 Token",
			cacheReadTokens: "输入（命中）",
			calls: "总调用次数",
			heatmapTitle: "最近活跃度",
			heatmapHint: "按最近 {weeks} 周的可见数据显示色阶。",
			heatmapPeriod: "最近 {weeks} 周",
			heatmapLess: "少",
			heatmapMore: "多",
			noData: "暂无数据。",
			dayLabel: "{date}：总消耗 Token：{tokens}，调用：{calls} 次",
			weekdayMon: "一",
			weekdayWed: "三",
			weekdayFri: "五",
			monthLabel: "{month}月",
			modelTitle: "分模型消耗",
			modelProvider: "Provider",
			modelName: "模型",
			modelTokens: "总 Token",
			modelInput: "未命中输入",
			modelOutput: "输出",
			modelCacheRead: "缓存读取",
			modelCacheWrite: "缓存写入",
			modelCalls: "调用次数",
			noModels: "暂无可用的分模型数据。"
		};
		const en = {
			nav: "Usage stats",
			loading: "Loading usage stats…",
			unavailableTitle: "Unable to read usage stats",
			unavailableReason: "The usage-stats namespace is not exposed, or the connection is in local memory mode.",
			unavailableFixInstall: "Make sure the token-usage-counter plugin is installed, then restart Web Harness.",
			unavailableFixRestart: "Restart dsh web after changing the profile for the changes to take effect.",
			unavailableFixLog: "If this persists after restart, check the Harness logs for plugin load errors.",
			loadingHint: "If this stays on loading, check that the plugin is installed and restart Web Harness.",
			totalTitle: "Total token usage",
			todayTitle: "Today's token usage",
			totalTokens: "Total tokens",
			inputTokens: "Uncached input",
			outputTokens: "Output tokens",
			cacheReadTokens: "Cached input",
			calls: "Total calls",
			heatmapTitle: "Recent activity",
			heatmapHint: "The color scale uses visible data from the last {weeks} weeks.",
			heatmapPeriod: "Last {weeks} weeks",
			heatmapLess: "Less",
			heatmapMore: "More",
			noData: "No data yet.",
			dayLabel: "{date}: {tokens} total tokens, {calls} calls",
			weekdayMon: "M",
			weekdayWed: "W",
			weekdayFri: "F",
			monthLabel: "{month}",
			modelTitle: "Usage by model",
			modelProvider: "Provider",
			modelName: "Model",
			modelTokens: "Total tokens",
			modelInput: "Uncached input",
			modelOutput: "Output",
			modelCacheRead: "Cache read",
			modelCacheWrite: "Cache write",
			modelCalls: "Calls",
			noModels: "No per-model data available yet."
		};
		//#endregion
		//#region src/client/styles.ts
		/** Small self-contained stylesheet for the browser half of the plugin. */
		const STYLE_ID = "dsh-token-usage-counter-styles";
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
`;
		function installUsageStatsStyles() {
			if (typeof document === "undefined") return () => {};
			if (document.getElementById(STYLE_ID) !== null) return () => {};
			const style = document.createElement("style");
			style.id = STYLE_ID;
			style.dataset.plugin = "dsh-token-usage-counter";
			style.textContent = CSS;
			document.head.appendChild(style);
			return () => {
				style.remove();
			};
		}
		//#endregion
		//#region src/client/index.tsx
		const NS = "settings.tokenUsageCounter";
		const USAGE_STATS_NAMESPACE = "dsh-token-usage-counter";
		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-token-usage-counter: dictionaries");
			ctx.effect(() => installUsageStatsStyles(), "dsh-token-usage-counter: styles");
			let state = { status: "loading" };
			const listeners = /* @__PURE__ */ new Set();
			const scope = {
				getSnapshot: () => state,
				subscribe: (callback) => {
					listeners.add(callback);
					return () => {
						listeners.delete(callback);
					};
				}
			};
			ctx.effect(() => {
				const controller = new AbortController();
				let timer;
				const refresh = async () => {
					try {
						const response = await fetch(`/api2/${USAGE_STATS_NAMESPACE}/snapshot`, {
							credentials: "same-origin",
							signal: controller.signal
						});
						if (!response.ok) throw new Error("Usage snapshot unavailable");
						state = {
							status: "ready",
							value: await response.json()
						};
					} catch {
						if (controller.signal.aborted) return;
						state = { status: "unavailable" };
					}
					for (const listener of listeners) listener();
					timer = setTimeout(() => {
						refresh();
					}, 5e3);
				};
				refresh();
				return () => {
					controller.abort();
					if (timer !== void 0) clearTimeout(timer);
					listeners.clear();
				};
			}, "dsh-token-usage-counter: snapshot polling");
			const t = ctx.locale.bind(NS);
			const injected = () => ({
				scope,
				t
			});
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "token-usage-counter",
				order: 30,
				label: () => t("nav"),
				locale: NS,
				inject: injected
			}, UsageStatsSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map