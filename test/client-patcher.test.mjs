// dsh-fun-turn-status — browser status patcher regression tests.
// Runs the actual ModuleLoader bundle in a small DOM-shaped harness so the
// lifecycle assertions cover the same closure that DSH loads in the browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const clientSource = readFileSync(join(root, "lib/client.js"), "utf8");

function status(text, className = "turnStatus_hash") {
	return {
		className,
		firstChild: { nodeType: 3, data: text, textContent: text }
	};
}

function boot({ original = "深度求索中...", messages = ["自定义状态"], className } = {}) {
	let loaded;
	let nextTimer = 1;
	let now = 1_000;
	const cleanups = [];
	const subscribers = new Set();
	const observers = [];
	const timers = new Map();
	const document = {
		status: status(original, className),
		head: { appendChild() {} },
		querySelector() { return null; },
		querySelectorAll() { return this.status === null ? [] : [this.status]; },
		createElement() { return { dataset: {}, textContent: "" }; }
	};
	class MutationObserver {
		constructor(callback) { this.callback = callback; observers.push(this); }
		observe() {}
		disconnect() {}
	}
	const scope = {
		messages,
		getSnapshot() {
			return { status: "ready", writable: true, value: { messages: this.messages }, user: undefined, revision: 1 };
		},
		subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); },
		set() {},
		unset() {},
		emit() { for (const listener of subscribers) listener(); }
	};
	const sandbox = {
		window: { __ModuleLoader__: { load(definition) { loaded = definition; } } },
		document,
		MutationObserver,
		setInterval(callback) { const id = nextTimer++; timers.set(id, callback); return id; },
		clearInterval(id) { timers.delete(id); },
		Date: { now: () => now },
		Math,
		JSON
	};
	vm.runInNewContext(clientSource, sandbox, { filename: "lib/client.js" });
	const client = loaded.factory((id) => {
		if (id === "react") return {};
		if (id === "@deepseek-ai/dsh-client-store") return { createSnapshotStore: (value) => ({ set() {}, getSnapshot: () => value }) };
		throw new Error(`unexpected browser dependency: ${id}`);
	});
	client.apply({
		locale: { register() {}, bind: () => (key) => key },
		settingsScope: { bind: () => scope },
		effect(callback) { const cleanup = callback(); if (typeof cleanup === "function") cleanups.push(cleanup); },
		slots: { inject() {} }
	});
	return {
		document,
		scope,
		flushMutations() {
			now += 250;
			for (const observer of observers) observer.callback();
		},
		rotate() {
			now += 30_000;
			const rotate = timers.values().next().value;
			rotate();
		},
		stop() { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); }
	};
}

test("FTS-01：空文案池恢复中文和英文宿主原文", () => {
	for (const original of ["深度求索中...", "Deep diving..."]) {
		const harness = boot({ original });
		assert.equal(harness.document.status.firstChild.data, "自定义状态");
		harness.scope.messages = [];
		harness.scope.emit();
		assert.equal(harness.document.status.firstChild.data, original);
	}
});

test("FTS-02：元素重挂载后，空池恢复新元素的中文宿主原文", () => {
	const harness = boot();
	harness.document.status = status("深度求索中...");
	harness.scope.emit();
	assert.equal(harness.document.status.firstChild.data, "自定义状态");
	harness.scope.messages = [];
	harness.scope.emit();
	assert.equal(harness.document.status.firstChild.data, "深度求索中...");
});

test("FTS-03：卸载恢复宿主原文，但不覆盖后续宿主更新", () => {
	const restore = boot({ original: "深度求索中..." });
	restore.stop();
	assert.equal(restore.document.status.firstChild.data, "深度求索中...");

	const preserve = boot({ original: "深度求索中..." });
	preserve.document.status.firstChild.data = "宿主后续状态";
	preserve.stop();
	assert.equal(preserve.document.status.firstChild.data, "宿主后续状态");
});

test("FTS-04：无稳定 className 的中文状态可识别，并在宿主更新后恢复最新原文", () => {
	const harness = boot({ className: "" });
	assert.equal(harness.document.status.firstChild.data, "自定义状态");
	harness.document.status.firstChild.data = "宿主重新渲染的状态";
	harness.flushMutations();
	assert.equal(harness.document.status.firstChild.data, "自定义状态");
	harness.stop();
	assert.equal(harness.document.status.firstChild.data, "宿主重新渲染的状态");
});

test("FTS-05：非空自定义池仍按轮换定时器切换状态", () => {
	const messages = ["第一条自定义状态", "第二条自定义状态"];
	const harness = boot({ messages });
	const first = harness.document.status.firstChild.data;
	harness.rotate();
	assert.ok(messages.includes(first));
	assert.ok(messages.includes(harness.document.status.firstChild.data));
	assert.notEqual(harness.document.status.firstChild.data, first);
});
