// dsh-fun-turn-status — host half
// 唯一职责：向 DSH settings 服务注册 `fun-turn-status` 命名空间，
// 持久化状态文案列表（~/.dsh/settings.yaml）。
// 依赖约定与本工作区 dsh-notifications 一致：仅依赖无 scope 的 schemastery
// （插件目录内 pnpm 安装），settings 服务以普通 kebab-case 字符串注册。
// 纯逻辑（默认文案表、校验、轮选取条）集中在此，供单元测试引用；
// 浏览器半 lib/client.js 内联镜像同一份常量与逻辑（ModuleLoader 包不可 import）。
import z from "schemastery";

export const name = "dsh-fun-turn-status";
export const inject = ["settings"];

/** settings 命名空间（kebab-case，用户覆盖写入 ~/.dsh/settings.yaml 的同名段）。 */
export const SETTINGS_NAMESPACE = "fun-turn-status";

/** 展示文案上限与单条长度上限。 */
export const MESSAGE_LIMIT = 50;
export const MESSAGE_MAX_LENGTH = 50;

/**
 * 与本机 dsh-auto-collapse 等“同类功能插件”共存的防线：
 * 该插件只在文本节点包含字面量 "Deep diving" 时才改写；
 * 我们保存时拒绝含该字样的文案，保证我们的文案永不触发对方改写，
 * 从而本插件始终保持最高优先级。
 */
export const FORBIDDEN_SUBSTRING = "Deep diving";

/** React 状态元素渲染的原始文案（TurnStatus 硬编码，非 locale key）。 */
export const BUILTIN_TEXT = "Deep diving...";

/**
 * 默认文案：用户提供的 31 条中第 22 条缺逗号、第 31 条与第 21 条重复，
 * 规范化为 30 条去重文案，逐字保留原文。
 */
export const DEFAULT_MESSAGES = Object.freeze([
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
]);

/** settings 段 schema：messages 数组，0..50 条，每条 1..50 字符。 */
export const schema = z.object({
	messages: z.array(z.string().min(1).max(MESSAGE_MAX_LENGTH)).min(0).max(MESSAGE_LIMIT).default([...DEFAULT_MESSAGES])
});

/**
 * 校验一份待保存的文案列表（可测规范；浏览器半按同一规则实现：
 * 条数/长度/类型由 schema 权威裁决，空串与禁用字样为自定义规则）。
 * @param messages - 待校验的文案数组（尚未裁剪）。
 * @returns 错误码数组；空数组表示合法。
 * 错误码：empty / tooLong / forbidden / tooMany / invalidItem。
 */
export function draftErrors(messages) {
	if (!Array.isArray(messages)) return ["invalidItem"];
	const errors = [];
	for (const item of messages) {
		if (typeof item !== "string") { errors.push("invalidItem"); continue; }
		if (item.trim().length === 0) { errors.push("empty"); continue; }
		if (item.includes(FORBIDDEN_SUBSTRING)) { errors.push("forbidden"); continue; }
		if (item.length > MESSAGE_MAX_LENGTH) { errors.push("tooLong"); continue; }
	}
	// 条数/长度的权威裁决走 schema：与浏览器端 schema-form 同规则、同消息文案。
	let failure;
	try {
		schema({ messages });
	} catch (error) {
		failure = error instanceof Error ? error.message : String(error);
	}
	if (failure !== void 0) {
		if (/array length/.test(failure)) { if (!errors.includes("tooMany")) errors.push("tooMany"); }
		else if (/string length <=/.test(failure)) { if (!errors.includes("tooLong")) errors.push("tooLong"); }
		else if (/string length >=/.test(failure)) { if (!errors.includes("empty")) errors.push("empty"); }
		else if (!errors.includes("invalidItem")) errors.push("invalidItem");
	}
	return errors;
}

/**
 * 随机选下一条展示文案：永远避开 current。
 * @param list - 文案池。
 * @param current - 当前显示文案；null（尚未接管）时从全池随机。
 * @returns 下一条；池为空返回 null（调用方不得接管，保持原始文案）。
 */
export function pickNext(list, current) {
	if (!Array.isArray(list) || list.length === 0) return null;
	const candidates = current === null ? list : list.filter((item) => item !== current);
	if (candidates.length === 0) return current;
	return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * 插件主体：注册 settings 命名空间。
 * 注册本身以 effect 形式挂到本插件 fiber 上（dsh-settings 内部完成），
 * 卸载/禁用/热更新时自动移除。
 */
export function apply(ctx) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.register(SETTINGS_NAMESPACE, schema);
	});
}