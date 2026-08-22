// dsh-fun-turn-status — browser half（ModuleLoader bundle）
// 两个职责：
//   1. DOM 文本接管器：把任务运行中的 “Deep diving...” 状态文案替换为配置的
//      幽默文案，每 30 秒随机切换一条（避开当前条）；与其他同类插件（如
//      dsh-auto-collapse）共存时保持最高优先级。
//   2. 「设置 → 插件 → 插件配置」卡片（DSH 官方契约实现）：控制器暴露
//      hooks 快照 + edit/resetField/save/discard 动作，暂存编辑、
//      base/user 覆盖层语义（已覆盖徽章）、恢复默认=暂存清除→保存时 unset、
//      只读/失败态、官方风格版式；客户端校验用镜像规则做前端提前拦截，
//      宿主 schema 是唯一权威（settings 服务对每次写入都做 schema 校验）。
//      注意：浏览器模块表只解析 shell seed（react 等）与图行包
//      （dsh.client + exports["./client"]）；宿主侧包（如
//      @deepseek-ai/dsh-client-schema-form）不能被第三方 bundle require。
// 常量与纯逻辑镜像自 lib/index.js（ModuleLoader 包不可 import宿主模块）。
window.__ModuleLoader__.load({
	id: "dsh-fun-turn-status",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let runtime_client = require("@deepseek-ai/dsh-client-runtime/client");

		//#region 常量（与 lib/index.js 保持一致）
		const SETTINGS_NS = "fun-turn-status";
		const MESSAGE_LIMIT = 50;
		const MESSAGE_MAX_LENGTH = 50;
		const FORBIDDEN_SUBSTRING = "Deep diving";
		const BUILTIN_TEXT = "Deep diving...";
		// DSH 原生 IconChevronDownOutline14 的 14x14 path（与内置折叠卡片箭头一致）。
		const CHEVRON_PATH = "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z";
		const DEFAULT_MESSAGES = [
			"正在摸鱼...",
			"假装懂你在说什么...",
			"正在查阅小抄...",
			"大脑缓存正在更新...",
			"正在憋大招...",
			"计算中，小心宕机...",
			"在知识海洋里狗刨...",
			"正在努力消化你的问题...",
			"偷偷跑去问隔壁 AI...",
			"正在强行加载记忆模块...",
			"思考怎么回答才显得我聪明...",
			"正在编造合理的谎言...",
			"不想上班，但没得选...",
			"疯狂烧脑中，请勿打扰...",
			"正在穿越数据森林...",
			"正在翻阅系统底层代码...",
			"人类说话怎么这么难懂...",
			"正在努力找补...",
			"脑海中正在跑图...",
			"即将揭晓答案，别眨眼...",
			"正在维持一种稳定的疯感...",
			"正在“已读乱回”...",
			"正在沉淀“废话文学”...",
			"不知道，我的身材很曼妙...",
			"正在理直气壮地“摆烂”...",
			"正在进行“反向内卷”...",
			"正在给自己添置“电子榨菜”...",
			"正在“爱你老己”，所以慢一点也正常...",
			"正在“验牌”，请稍等...",
			"正在复制粘贴..."
		];
		//#endregion

		//#region 词典
		const NS = "dsh.funTurnStatus";
		const zh = {
			title: "趣味状态文案",
			description: "替换任务运行中的 “Deep diving...” 状态文案，每 30 秒随机切换一条；与 dsh-auto-collapse 等同类插件共存时本插件优先级最高。",
			pending: "未保存",
			expand: "展开设置：趣味状态文案",
			collapse: "收起设置：趣味状态文案",
			fieldLabel: "状态文案",
			countBadge: "{n}/50",
			overriddenBadge: "已覆盖",
			resetField: "恢复默认",
			readOnly: "本部署的设置只读。",
			loading: "读取中…",
			unavailable: "设置暂不可用。",
			rulesHint: "每条 1–50 字，最多 50 条；列表为空时保留原始 “Deep diving...” 展示。",
			forbiddenHint: "文案不得包含 “Deep diving” 字样（避免与 dsh-auto-collapse 互相覆盖）。",
			save: "保存",
			saving: "保存中…",
			discard: "放弃",
			saveFailed: "本部署没有接受这些值，已保留供你修改。",
			delete: "删除",
			add: "添加",
			addPlaceholder: "输入新文案…",
			maxReached: "已达 {n} 条上限，请先删除再添加。",
			errEmpty: "文案不能为空。",
			errTooLong: "单条文案不能超过 {n} 字。",
			errForbidden: "文案不能包含 “Deep diving” 字样（会与 dsh-auto-collapse 互相覆盖）。",
			errTooMany: "最多 {n} 条文案。",
			errInvalidItem: "存在无效条目。",
			emptyNotice: "列表为空时将保留原始 “Deep diving...” 展示。"
		};
		const en = {
			title: "Fun turn status",
			description: "Replaces the “Deep diving...” status text while a task runs, rotating to a random message every 30 seconds. Highest priority among plugins that rewrite this text (e.g. dsh-auto-collapse).",
			pending: "Unsaved",
			expand: "Expand settings: Fun turn status",
			collapse: "Collapse settings: Fun turn status",
			fieldLabel: "Status messages",
			countBadge: "{n}/50",
			overriddenBadge: "Overridden",
			resetField: "Restore defaults",
			readOnly: "Settings are read-only in this deployment.",
			loading: "Loading…",
			unavailable: "Settings are unavailable.",
			rulesHint: "1–50 chars each, at most 50 messages; an empty list keeps the original “Deep diving...” display.",
			forbiddenHint: "Messages must not contain the literal “Deep diving” (they would fight dsh-auto-collapse).",
			save: "Save",
			saving: "Saving…",
			discard: "Discard",
			saveFailed: "This deployment did not accept these values; they were kept for you to fix.",
			delete: "Delete",
			add: "Add",
			addPlaceholder: "Type a new message…",
			maxReached: "Reached the {n}-message limit; delete one first.",
			errEmpty: "A message cannot be empty.",
			errTooLong: "A message cannot exceed {n} chars.",
			errForbidden: "Messages containing “Deep diving” are rejected (they would fight dsh-auto-collapse).",
			errTooMany: "At most {n} messages.",
			errInvalidItem: "There is an invalid entry.",
			emptyNotice: "An empty list keeps the original “Deep diving...” display."
		};
		function interpolate(template, values) {
			return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
		}
		//#endregion

		//#region CSS（版式对齐官方设置卡片：字段头/徽章/页脚/提示层级）
const css = '.fts-card{flex-direction:column;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none;transition:border-color .16s, background .16s}.fts-card:hover{border-color:var(--dsw-alias-label-dimmed)}.fts-cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}.fts-cardHead{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}.fts-cardHead:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.fts-cardHeadText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.fts-cardHeadTitle{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.fts-cardHeadDescription{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.fts-pending{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.fts-chevron{color:var(--dsw-alias-label-tertiary);max-width:14px;flex:none;transition:transform .16s;display:inline-flex}.fts-chevronOpen{transform:rotate(180deg)}.fts-cardBody{flex-direction:column;gap:6px;border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px;display:flex}.fts-readOnly{color:var(--dsw-alias-label-tertiary);margin:12px 0 0;font-size:12px;line-height:1.5}.fts-fieldHead{align-items:center;gap:8px;padding:12px 0 6px;display:flex}.fts-label{min-width:0;flex:1;font-size:13px;font-weight:500;line-height:1.5}.fts-count{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.fts-badges{align-items:center;gap:8px;display:inline-flex}.fts-badge{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.fts-reset{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;padding:0;font-size:12px;line-height:1.5}.fts-reset:hover:not(:disabled){color:var(--dsw-alias-label-primary)}.fts-reset:disabled{cursor:default}.fts-list{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}.fts-row{align-items:center;gap:8px;display:flex}.fts-row input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);height:34px;min-width:0;flex:1;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;outline:none;padding:0 12px;font-size:13px;line-height:1.5}.fts-row input:focus-visible{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%,transparent)}.fts-row input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}.fts-del{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:4px 8px;font-size:14px;line-height:1}.fts-del:hover{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover)}.fts-del:disabled{cursor:default}.fts-add{align-items:center;gap:8px;padding-bottom:2px;display:flex}.fts-add input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);height:34px;min-width:0;flex:1;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;outline:none;padding:0 12px;font-size:13px;line-height:1.5}.fts-add input:focus-visible{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%,transparent)}.fts-add input:disabled{color:var(--dsw-alias-label-tertiary);cursor:not-allowed}.fts-hint,.fts-error{margin:0;font-size:12px;line-height:18px}.fts-hint{color:var(--dsw-alias-label-tertiary)}.fts-error{color:var(--dsw-alias-state-error-primary)}.fts-btn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:var(--dsw-alias-bg-layer-3);border-radius:7px;padding:5px 10px;font-size:12px;line-height:18px}.fts-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.fts-btn:disabled{opacity:.48;cursor:not-allowed}.fts-btnPrimary{background:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-primary);color:#fff}.fts-btnPrimary:hover:not(:disabled){background:var(--dsw-alias-state-business-primary)}.fts-footer{border-top:1px solid var(--dsw-alias-border-l2);justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px;display:flex}.fts-footerFailed{color:var(--dsw-alias-state-error-primary);min-width:0;margin:0;flex:1;font-size:12px;line-height:1.5}.fts-spacer{flex:1}';
		const tagId = "dsh-fun-turn-status/card.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-fun-turn-status";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region 纯逻辑镜像（与 lib/index.js 保持一致）
		/**
		 * 校验暂存列表（规则与宿主 draftErrors 一致）：
		 * 条数/长度/类型与自定义规则（空串、禁用字样）全部在客户端提前拦截；
		 * 宿主 schema 仍是唯一权威 —— settings 服务对每次写入都执行 schema 校验，
		 * 因此客户端镜像只会更严（如空白串被拒）不会漏放非法值。
		 * 返回错误码：empty/tooLong/forbidden/tooMany/invalidItem。
		 */
		function draftErrors(messages) {
			if (!Array.isArray(messages)) return ["invalidItem"];
			const errors = [];
			if (messages.length > MESSAGE_LIMIT) errors.push("tooMany");
			for (const item of messages) {
				if (typeof item !== "string") { errors.push("invalidItem"); continue; }
				if (item.trim().length === 0) { errors.push("empty"); continue; }
				if (item.includes(FORBIDDEN_SUBSTRING)) { errors.push("forbidden"); continue; }
				if (item.length > MESSAGE_MAX_LENGTH) { errors.push("tooLong"); continue; }
			}
			return errors;
		}
		/** 随机选下一条：永远避开 current；池为空返回 null。 */
		function pickNext(list, current) {
			if (!Array.isArray(list) || list.length === 0) return null;
			const candidates = current === null ? list : list.filter((item) => item !== current);
			if (candidates.length === 0) return current;
			return candidates[Math.floor(Math.random() * candidates.length)];
		}
		//#endregion

		//#region DOM 文本接管器
		/**
		 * 现状：TurnStatus 硬编码 "Deep diving..."（无 locale key、无槽位），
		 * 只能以 DOM 文本接管实现替换。识别采用多信号：
		 *  1. `[role="status"][aria-live="polite"]`（trajectory 等页面内其他
		 *     status 元素无 turnStatus 类名且首子节点非 Deep diving 文本）；
		 *  2. 类名含 `turnStatus`（CSS Module 可读段，哈希前缀随版本变化但
		 *     local 名稳定）；
		 *  3. 兜底：首子节点为文本且以 Deep diving 开头。
		 */
		function findTurnStatus(root) {
			const candidates = root.querySelectorAll('[role="status"][aria-live="polite"]');
			for (const el of candidates) {
				if (typeof el.className === "string" && /turnStatus/i.test(el.className)) return el;
				const first = el.firstChild;
				if (first !== null && first.nodeType === 3 && /^Deep diving/i.test(first.textContent || "")) return el;
			}
			return null;
		}

		/**
		 * 创建接管器。
		 * @param getPool - 读取当前文案池（settings 解析值里的 messages；空数组 = 不接管）。
		 * 优先级机制（需求 4）：
		 *  - MutationObserver 即时抢回被他人改写/React 重挂载的文本；
		 *  - 1 秒守护重写保证任意时刻 ~1s 内最终写入权归本插件；
		 *  - 200ms 冷却避免与同样反应式的外部写入者形成无限互写风暴。
		 * 已知同类插件 dsh-auto-collapse 仅在文本含 "Deep diving" 字样时改写，
		 * 而本插件保存时拒绝该字样，故互不触发。
		 */
		function createStatusPatcher(getPool) {
			const ROTATION_MS = 30000;
			const GUARD_MS = 1000;
			const COOLDOWN_MS = 200;
			let current = null;
			let el = null;
			let observer = null;
			let rotationTimer = 0;
			let guardTimer = 0;
			let lastWrite = 0;
			let disposed = false;

			function firstText() {
				if (el === null) return null;
				const first = el.firstChild;
				return first !== null && first.nodeType === 3 ? first.data : null;
			}
			function apply(message) {
				if (el === null || message === null) return;
				const first = el.firstChild;
				if (first === null || first.nodeType !== 3) return;
				if (first.data !== message) {
					first.data = message;
					lastWrite = Date.now();
				}
			}
			/** 收敛到“应展示的文案”：池空恢复原始文案；当前条失效立即重选；轮换时强制换一条。 */
			function sync(rotate) {
				if (disposed) return;
				const pool = getPool();
				const shown = firstText();
				if (pool.length === 0) {
					if (shown !== null && shown !== BUILTIN_TEXT) apply(BUILTIN_TEXT);
					current = null;
					return;
				}
				if (current === null || !pool.includes(current)) {
					current = pickNext(pool, shown);
					if (current === null) current = pool[0];
				}
				if (rotate && pool.length > 1) {
					const next = pickNext(pool, current);
					if (next !== current) current = next;
				}
				if (shown !== current) apply(current);
			}
			function ensureObserver() {
				const target = findTurnStatus(document);
				if (target === el && el !== null) return;
				el = target;
				if (observer === null) observer = new MutationObserver(() => {
					if (disposed) return;
					if (Date.now() - lastWrite < COOLDOWN_MS) return;
					sync(false);
				});
				observer.disconnect();
				if (el !== null) observer.observe(el, { childList: true, characterData: true, subtree: true });
			}
			return {
				start() {
					if (disposed) return;
					if (rotationTimer !== 0 || guardTimer !== 0) return;
					rotationTimer = setInterval(() => sync(true), ROTATION_MS);
					guardTimer = setInterval(() => {
						ensureObserver();
						sync(false);
					}, GUARD_MS);
					ensureObserver();
					sync(false);
				},
				stop() {
					disposed = true;
					clearInterval(rotationTimer);
					clearInterval(guardTimer);
					rotationTimer = 0;
					guardTimer = 0;
					if (observer !== null) { observer.disconnect(); observer = null; }
					// 若当前元素仍由我们改写，恢复原始文案，不留僵尸状态。
					if (el !== null && current !== null) {
						const first = el.firstChild;
						if (first !== null && first.nodeType === 3 && first.data === current) {
							first.data = BUILTIN_TEXT;
						}
					}
					el = null;
					current = null;
				},
				/** 外部（settings 变更）催赶：立即重扫元素并收敛展示（含“当前条被删即重选”）。 */
				poke() {
					if (disposed) return;
					ensureObserver();
					sync(false);
				}
			};
		}
		//#endregion

		//#region 配置卡片（DSH 官方契约）
		/** 从 settings 解析值取文案池（status ready 前视为空池）。 */
		function poolOf(scope) {
			const snapshot = scope.getSnapshot();
			const value = snapshot && snapshot.status === "ready" && snapshot.value ? snapshot.value : null;
			const messages = value && Array.isArray(value.messages) ? value.messages : null;
			return messages === null || messages.length === 0 ? [] : messages;
		}

		/**
		 * 官方契约控制器：投影 settings scope 到快照 store，持有暂存
		 * （pending：set=整表暂存 / reset=恢复默认暂存）与官方动作面
		 * edit/resetField/save/discard；快照携带 dirty/invalid/overridden（含
		 * 暂存语义）/saving/failed，与内置卡片 shell() 语义一致。
		 * 客户端校验用镜像规则提前拦截；宿主 schema 在写入时再校验（权威）。
		 */
		function createCardController(scope) {
			let pending = null;
			let saving = false;
			let failed = false;

			const sameList = (left, right) => left.length === right.length && left.every((item, index) => item === right[index]);
			const take = () => {
				const snapshot = scope.getSnapshot();
				const value = snapshot && snapshot.status === "ready" && snapshot.value ? snapshot.value : null;
				const user = snapshot ? snapshot.user : void 0;
				const resolved = value && Array.isArray(value.messages) ? value.messages.map((item) => item) : [];
				const userHas = user !== void 0 && user !== null && Object.prototype.hasOwnProperty.call(user, "messages");
				const display = pending !== null && pending.kind === "set" ? pending.messages : resolved;
				const dirty = pending !== null && (pending.kind === "set" ? !sameList(pending.messages, resolved) : userHas);
				const overridden = pending !== null ? !pending.reset : userHas;
				const errors = pending !== null && pending.kind === "set" ? draftErrors(pending.messages) : [];
				return {
					status: snapshot ? snapshot.status : "loading",
					writable: Boolean(snapshot && snapshot.writable),
					messages: display,
					overridden,
					dirty,
					invalid: errors.length > 0,
					errors,
					saving,
					failed,
					revision: snapshot ? snapshot.revision : void 0
				};
			};
			const store = runtime_client.createSnapshotStore(take());
			const publish = () => store.set(take());
			scope.subscribe(publish);

			const edit = (messages) => {
				pending = { kind: "set", messages: messages.map((item) => item) };
				failed = false;
				publish();
			};
			const resetField = () => {
				pending = { kind: "reset" };
				failed = false;
				publish();
			};
			const discard = () => {
				if (pending === null && !failed) return;
				pending = null;
				failed = false;
				publish();
			};
			const save = async () => {
				if (pending === null || saving) return;
				const plan = take();
				if (!plan.dirty || plan.invalid) return;
				saving = true;
				failed = false;
				publish();
				try {
					if (pending.kind === "reset") await scope.unset("messages");
					else await scope.set("messages", pending.messages);
					pending = null;
				} catch {
					failed = true;
				} finally {
					saving = false;
					publish();
				}
			};

			return {
				store,
				inject() {
					return {
						hooks: { funTurnStatusCard: store },
						edit,
						resetField,
						save,
						discard
					};
				}
			};
		}

		/** 错误码 → 双语提示（优先级：超限 > 空条 > 超长 > 禁用字样 > 非法条目）。 */
		function errorLabel(errors, t) {
			if (!Array.isArray(errors) || errors.length === 0) return null;
			if (errors.includes("tooMany")) return interpolate(t("errTooMany"), { n: MESSAGE_LIMIT });
			if (errors.includes("empty")) return t("errEmpty");
			if (errors.includes("tooLong")) return interpolate(t("errTooLong"), { n: MESSAGE_MAX_LENGTH });
			if (errors.includes("forbidden")) return t("errForbidden");
			return t("errInvalidItem");
		}

		/** 「插件配置」页卡片：官方折叠卡片形态 —— 默认收起（表头=标题/描述/未保存徽标/箭头），
		 * 点击展开配置体（字段头/列表/添加/提示/错误/页脚），与内置折叠卡片同构。 */
		function FunTurnStatusCard(props) {
			const { t } = props;
			const state = props.useFunTurnStatusCard((snapshot) => snapshot);
			const [open, setOpen] = react.useState(false);
			const [newText, setNewText] = react.useState("");
			const disabled = !state.writable;
			const atCap = state.messages.length >= MESSAGE_LIMIT;

			const commitDraft = (next) => props.edit(next);
			const editRow = (index) => (event) => {
				const next = state.messages.slice();
				next[index] = event.target.value;
				commitDraft(next);
			};
			const removeRow = (index) => () => {
				const next = state.messages.slice();
				next.splice(index, 1);
				commitDraft(next);
			};
			const addRow = () => {
				const text = newText.trim();
				if (text.length === 0) return;
				commitDraft([...state.messages, text]);
				setNewText("");
			};
			const error = state.dirty && state.invalid ? errorLabel(state.errors, t) : null;

			return react.createElement("li", { className: open ? "fts-card fts-cardOpen" : "fts-card" },
				react.createElement("button", {
					type: "button",
					className: "fts-cardHead",
					"aria-expanded": open,
					"aria-label": open ? t("collapse") : t("expand"),
					onClick: () => setOpen(!open)
				},
					react.createElement("span", { className: "fts-cardHeadText" },
						react.createElement("span", { className: "fts-cardHeadTitle" }, t("title")),
						react.createElement("span", { className: "fts-cardHeadDescription" }, t("description"))
					),
					state.dirty ? react.createElement("span", { className: "fts-pending" }, t("pending")) : null,
					react.createElement("span", { className: open ? "fts-chevron fts-chevronOpen" : "fts-chevron" },
						react.createElement("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true },
							react.createElement("path", { d: CHEVRON_PATH, fill: "currentColor" })
						)
					)
				),
				open ? react.createElement("div", { className: "fts-cardBody" },
					state.status === "loading" ? react.createElement("p", { className: "fts-hint" }, t("loading")) : null,
					state.status === "unavailable" ? react.createElement("p", { className: "fts-error" }, t("unavailable")) : null,
					state.writable ? null : react.createElement("p", { className: "fts-readOnly", role: "status" }, t("readOnly")),
					react.createElement("div", { className: "fts-fieldHead" },
						react.createElement("span", { className: "fts-label" }, t("fieldLabel")),
						react.createElement("span", { className: "fts-count" }, interpolate(t("countBadge"), { n: state.messages.length })),
						state.overridden ? react.createElement("span", { className: "fts-badges" },
							react.createElement("span", { className: "fts-badge" }, t("overriddenBadge")),
							react.createElement("button", { type: "button", className: "fts-reset", disabled, onClick: props.resetField }, t("resetField"))
						) : null
					),
					react.createElement("ul", { className: "fts-list" },
						state.messages.map((message, index) => react.createElement("li", { className: "fts-row", key: index },
							react.createElement("input", {
								value: message,
								disabled,
								"aria-label": interpolate(t("countBadge"), { n: index + 1 }),
								onChange: editRow(index)
							}),
							react.createElement("button", {
								type: "button",
								className: "fts-del",
								disabled,
								"aria-label": t("delete"),
								title: t("delete"),
								onClick: removeRow(index)
							}, "\u00D7")
						))
					),
					react.createElement("div", { className: "fts-add" },
						react.createElement("input", {
							value: newText,
							disabled: disabled || atCap,
							placeholder: t("addPlaceholder"),
							onChange: (event) => setNewText(event.target.value),
							onKeyDown: (event) => { if (event.key === "Enter") addRow(); }
						}),
						react.createElement("button", {
							type: "button",
							className: "fts-btn fts-btnPrimary",
							disabled: disabled || atCap || newText.trim().length === 0,
							onClick: addRow
						}, t("add"))
					),
					react.createElement("p", { className: "fts-hint" }, t("rulesHint")),
					react.createElement("p", { className: "fts-hint" }, t("forbiddenHint")),
					atCap ? react.createElement("p", { className: "fts-hint" }, interpolate(t("maxReached"), { n: MESSAGE_LIMIT })) : null,
					state.messages.length === 0 && state.status === "ready" ? react.createElement("p", { className: "fts-hint" }, t("emptyNotice")) : null,
					error !== null ? react.createElement("p", { className: "fts-error" }, error) : null,
					react.createElement("div", { className: "fts-footer" },
						state.failed ? react.createElement("p", { className: "fts-footerFailed", role: "status" }, t("saveFailed")) : null,
						state.failed ? null : react.createElement("span", { className: "fts-spacer" }),
						react.createElement("button", {
							type: "button",
							className: "fts-btn",
							disabled: !state.dirty || state.saving,
							onClick: props.discard
						}, t("discard")),
						react.createElement("button", {
							type: "button",
							className: "fts-btn fts-btnPrimary",
							disabled: !state.dirty || state.saving || state.invalid || !state.writable,
							onClick: props.save
						}, state.saving ? t("saving") : t("save"))
					)
				) : null
			);
		}
		//#endregion

		//#region 插件主体
		const inject = ["slots", "locale", "settingsScope"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-fun-turn-status: dictionaries");
			const t = ctx.locale.bind(NS);
			const scope = ctx.settingsScope.bind({ namespace: SETTINGS_NS });
			const controller = createCardController(scope);
			const patcher = createStatusPatcher(() => poolOf(scope));
			ctx.effect(() => {
				patcher.start();
				return () => patcher.stop();
			}, "dsh-fun-turn-status: status patcher");
			// 配置变更（增删改/恢复默认）立即反映到正在显示的状态文案：
			// 当前显示条被删除时马上重选，空池时马上恢复原始文案。
			ctx.effect(() => scope.subscribe(() => patcher.poke()), "dsh-fun-turn-status: patcher pool watch");
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: SETTINGS_NS,
				locale: NS,
				inject: () => controller.inject()
			}, FunTurnStatusCard));
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});