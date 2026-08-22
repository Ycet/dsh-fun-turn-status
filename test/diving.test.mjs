// dsh-fun-turn-status — 单元测试（node --test）
// 覆盖：默认文案表质量、draftErrors 校验规则（schema 裁决 + 自定义规则）、
// 轮选取条逻辑、schema 解析、客户端镜像一致性（官方 schema-form 契约）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
	BUILTIN_TEXT, DEFAULT_MESSAGES, FORBIDDEN_SUBSTRING,
	MESSAGE_LIMIT, MESSAGE_MAX_LENGTH, SETTINGS_NAMESPACE, schema, draftErrors, pickNext
} from "../lib/index.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("DEFAULT_MESSAGES：30 条去重、每条 1..50 字符、不含 Deep diving、不含空条", () => {
	assert.equal(DEFAULT_MESSAGES.length, 30);
	assert.equal(new Set(DEFAULT_MESSAGES).size, 30, "存在重复条目");
	for (const message of DEFAULT_MESSAGES) {
		assert.equal(typeof message, "string");
		assert.ok(message.trim().length > 0, `空条目: ${JSON.stringify(message)}`);
		assert.ok(message.length <= MESSAGE_MAX_LENGTH, `超长: ${message}`);
		assert.ok(!message.includes(FORBIDDEN_SUBSTRING), `含禁用字样: ${message}`);
	}
});

test("DEFAULT_MESSAGES 覆盖用户要求的 30 条关键文案（抽查关键条目）", () => {
	for (const key of ["正在摸鱼...", "不想上班，但没得选...", "正在“已读乱回”...", "正在复制粘贴...", "正在“验牌”，请稍等..."]) {
		assert.ok(DEFAULT_MESSAGES.includes(key), `缺失默认文案: ${key}`);
	}
});

test("pickNext：空池返回 null", () => {
	assert.equal(pickNext([], "x"), null);
	assert.equal(pickNext(null, "x"), null);
});

test("pickNext：单条时保持不变（无法切换到另一条）", () => {
	assert.equal(pickNext(["a"], "a"), "a");
	assert.equal(pickNext(["a"], null), "a");
});

test("pickNext：两条时总是另一条", () => {
	for (let i = 0; i < 50; i++) {
		assert.equal(pickNext(["a", "b"], "a"), "b");
		assert.equal(pickNext(["a", "b"], "b"), "a");
	}
});

test("pickNext：多条时永远避开当前条（含 current 不在池中与 null 情形）", () => {
	const pool = ["a", "b", "c", "d"];
	for (let i = 0; i < 500; i++) {
		const next = pickNext(pool, "b");
		assert.notEqual(next, "b");
		assert.ok(pool.includes(next));
	}
	const seen = new Set();
	for (let i = 0; i < 300; i++) seen.add(pickNext(pool, "b"));
	assert.ok(seen.size > 1, "随机性不足：总是同一条");
	for (let i = 0; i < 200; i++) {
		const next = pickNext(pool, null);
		assert.ok(pool.includes(next));
		assert.ok(pickNext(pool, "不在池中") !== "不在池中");
	}
});

test("draftErrors：合法列表无错误；空列表合法；非数组 → invalidItem", () => {
	assert.deepEqual(draftErrors(DEFAULT_MESSAGES), []);
	assert.deepEqual(draftErrors([]), []);
	assert.deepEqual(draftErrors("不是数组"), ["invalidItem"]);
});

test("draftErrors：超过 50 条 → tooMany（schema 裁决）", () => {
	const list = Array.from({ length: MESSAGE_LIMIT + 1 }, (_, i) => `第 ${i} 条`);
	assert.deepEqual(draftErrors(list), ["tooMany"]);
});

test("draftErrors：超过 50 字符 → tooLong（schema 裁决）", () => {
	assert.deepEqual(draftErrors(["x".repeat(MESSAGE_MAX_LENGTH + 1)]), ["tooLong"]);
	assert.deepEqual(draftErrors(["x".repeat(MESSAGE_MAX_LENGTH)]), []);
});

test("draftErrors：空串/纯空白 → empty（自定义规则）", () => {
	assert.deepEqual(draftErrors([""]), ["empty"]);
	assert.deepEqual(draftErrors(["   "]), ["empty"]);
	assert.deepEqual(draftErrors(["有效", "  ", "有效"]), ["empty"]);
});

test("draftErrors：含 Deep diving 字样 → forbidden（自定义规则）", () => {
	assert.deepEqual(draftErrors(["正在 Deep diving 测试"]), ["forbidden"]);
	assert.deepEqual(draftErrors(["Deep diving"]), ["forbidden"]);
});

test("draftErrors：非字符串条目 → invalidItem（自定义规则）", () => {
	assert.deepEqual(draftErrors([42]), ["invalidItem"]);
});

test("schema：undefined 回落默认 30 条", () => {
	const resolved = schema(undefined);
	assert.ok(Array.isArray(resolved.messages));
	assert.equal(resolved.messages.length, 30);
});

test("schema：显式空数组保持为空（空池=不接管，展示原始文案）", () => {
	const resolved = schema({ messages: [] });
	assert.deepEqual(resolved.messages, []);
});

test("schema：拒绝 51 条与超长字符串", () => {
	assert.throws(() => schema({ messages: Array.from({ length: 51 }, (_, i) => `条 ${i}`) }));
	assert.throws(() => schema({ messages: ["x".repeat(MESSAGE_MAX_LENGTH + 1)] }));
});

test("schema：接受合法自定义列表（含单条）", () => {
	const resolved = schema({ messages: ["唯一一条"] });
	assert.deepEqual(resolved.messages, ["唯一一条"]);
});

test("命名空间：kebab-case 且为 fun-turn-status", () => {
	assert.equal(SETTINGS_NAMESPACE, "fun-turn-status");
	assert.match(SETTINGS_NAMESPACE, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
	assert.equal(BUILTIN_TEXT, "Deep diving...");
});

test("客户端镜像与宿主半保持一致（常量与文案逐字同步）", () => {
	const client = readFileSync(join(root, "lib/client.js"), "utf8");
	assert.ok(client.includes('const SETTINGS_NS = "fun-turn-status"'), "SETTINGS_NS 镜像缺失");
	assert.ok(client.includes(`const MESSAGE_LIMIT = ${MESSAGE_LIMIT}`), "MESSAGE_LIMIT 镜像缺失");
	assert.ok(client.includes(`const MESSAGE_MAX_LENGTH = ${MESSAGE_MAX_LENGTH}`), "MESSAGE_MAX_LENGTH 镜像缺失");
	assert.ok(client.includes(`const FORBIDDEN_SUBSTRING = "${FORBIDDEN_SUBSTRING}"`), "FORBIDDEN_SUBSTRING 镜像缺失");
	assert.ok(client.includes(`const BUILTIN_TEXT = "${BUILTIN_TEXT}"`), "BUILTIN_TEXT 镜像缺失");
	for (const message of DEFAULT_MESSAGES) {
		assert.ok(client.includes(JSON.stringify(message)), `客户端缺失默认文案: ${message}`);
	}
});

test("客户端镜像：官方 schema-form 契约存在（静态模块 + rehydrate + validateDraft）", () => {
	const client = readFileSync(join(root, "lib/client.js"), "utf8");
	assert.ok(client.includes('require("@deepseek-ai/dsh-client-schema-form")'), "缺少官方 schema-form require");
	assert.ok(client.includes("rehydrateSchema"), "缺少 rehydrateSchema");
	assert.ok(client.includes("validateDraft"), "缺少 validateDraft");
	assert.ok(client.includes("settings.plugin.item"), "缺少官方槽位注册");
	assert.ok(client.includes("overriddenBadge"), "缺少已覆盖徽章词典");
	assert.ok(client.includes("resetField"), "缺少恢复默认动作");
	assert.ok(client.includes("hooks: { funTurnStatusCard: store }"), "缺少 hooks 快照面");
});

test("客户端镜像：接管器关键参数（30 秒轮换/1 秒守护/200ms 冷却）存在且未被破坏", () => {
	const client = readFileSync(join(root, "lib/client.js"), "utf8");
	assert.ok(client.includes("const ROTATION_MS = 30000"), "缺少 30 秒轮换");
	assert.ok(client.includes("const GUARD_MS = 1000"), "缺少 1 秒守护");
	assert.ok(client.includes("const COOLDOWN_MS = 200"), "缺少冷却窗口");
	assert.ok(client.includes('role="status"'), "缺少状态元素选择器");
	assert.ok(client.includes('aria-live="polite"'), "缺少 aria-live 选择器");
	assert.ok(client.includes('const inject = ["slots", "locale", "settingsScope", "connection"]'), "缺少官方 connection 注入");
});

test("客户端镜像：draftErrors 规则与宿主一致（自定义规则串与 schema 消息分类）", () => {
	const client = readFileSync(join(root, "lib/client.js"), "utf8");
	assert.ok(client.includes("FORBIDDEN_SUBSTRING"), "缺少禁用字样规则");
	assert.ok(client.includes("trim().length === 0"), "缺少空串规则");
	assert.ok(client.includes("/array length/"), "缺少 tooMany 分类");
	assert.ok(client.includes("/string length <=/"), "缺少 tooLong 分类");
	assert.ok(client.includes("/string length >=/"), "缺少 min 长度（空串）分类");
	assert.ok(client.includes('"raw:"'), "缺少 raw 消息透出");
});