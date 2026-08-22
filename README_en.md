# dsh-fun-turn-status

Replaces the “Deep diving...” status text while a DeepSeek Harness task runs, rotating to a random humorous message every 30 seconds.

[![中文](https://img.shields.io/badge/简体中文-red?style=for-the-badge)](README.md)
[![EN](https://img.shields.io/badge/English-blue?style=for-the-badge)](README_en.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

---

## ✨ Features

| Feature | Description |
| --- | --- |
| 🎭 Status text replacement | The running-task “Deep diving...” text becomes a random humorous message (30 built-ins) |
| 🔄 30-second rotation | Switches to another random message every 30 s, never the current one |
| ⚙️ Visual configuration | Add/remove/edit messages in Settings → Plugins → Plugin configuration (max 50); the card follows the official DSH contract (staged edits / Overridden badge / Restore defaults / Save·Discard) |
| 🥇 Highest priority | Wins over competing plugins such as dsh-auto-collapse |
| ♻️ Live application | Saved changes affect the currently running task immediately, no restart |

## 🚀 Quick Start

```bash
# 1. Install (local development; afterwards just refresh the page for client changes)
dsh plugin --profile web add dsh-fun-turn-status@link:<absolute-path-to-plugin>

# 2. Restart the web server so the bundle/Loader layer takes effect
#    Ctrl+C in the terminal running `dsh web`, then run `dsh web` again

# 3. Run the unit tests
cd <absolute-path-to-plugin> && pnpm install && npm test
```

After refreshing the page, start any task: the status text is replaced immediately and rotates every 30 seconds.

## ⚙️ Configuration

Entry point: **Settings → Plugins → Plugin configuration** (alongside the Terminal / Agent loop / Web search cards).

- Each message can be edited or deleted; type in the bottom input and press **Add** to add one;
- The `N/50` counter in the header locks further additions at 50;
- **Save** writes everything at once (the `fun-turn-status:` section of `~/.dsh/settings.yaml`); **Discard** drops unsaved edits; **Restore defaults** clears the user override and falls back to the 30 built-in messages;
- Save validation: 1–50 chars per message, at most 50 messages total, and messages **must not contain the literal `Deep diving`** (see the priority note below);
- An empty list keeps the original “Deep diving...” display (no takeover).

### Coexistence with dsh-auto-collapse

If `dsh-auto-collapse` is installed in the profile, it rewrites text containing `Deep diving` into “Deep sleeping”. This plugin keeps the highest priority through three mechanisms:

1. **Save-time rejection of `Deep diving`** — our messages never trigger the other plugin, eliminating write fights at the root;
2. **Instant reclamation via MutationObserver** — any remount or third-party rewrite is reverted immediately (200 ms cooldown prevents unlimited write storms);
3. **1-second guard rewrite** — at any moment, the final write within ~1 s belongs to this plugin.

> Note: writing messages containing `Deep diving` directly into `settings.yaml` bypasses validation and causes a ~1 Hz mutual rewrite loop between the two plugins — avoid it.

## 🧩 How It Works (for developers)

| Layer | File | Responsibility |
| --- | --- | --- |
| Host | `lib/index.js` | Registers the `fun-turn-status` settings namespace (schema + 30 default messages + `draftErrors` testable spec) |
| Client | `lib/client.js` | ModuleLoader bundle: DOM text takeover + the configuration card (DSH official contract, zh/en) |
| Patch | `cordis.patch.yml` | Inserts the `fun-turn-status` plugin row |

- “Deep diving...” is hardcoded in the `TurnStatus` component of `@deepseek-ai/dsh-client-ui-conversation` (no locale key, no slot), so the takeover is DOM-based: the element is identified by `[role="status"][aria-live="polite"]` plus the readable `turnStatus` class segment; only the first text child is rewritten, keeping the timer and the shimmer gradient intact.
- The message pool is the resolved settings value: the 30 built-ins until the user configures anything; an explicitly empty array means “no takeover”.
- **The configuration card follows the official DSH contract**: the `settings.plugin.item` keyed slot plus `settingsScope.bind`; the controller exposes a hooks snapshot and `edit/resetField/save/discard` actions, staged edits with base/user override semantics (the “Overridden” badge), restore-defaults staged as a clear then `unset` on save, read-only and failed states; the client intercepts early with mirror rules matching the host (count/length/trimmed-empty/`Deep diving` token) while the host schema stays the single authority — the settings service re-validates every write with the schema, and errors are mapped bilingually. Note: the browser module table only resolves shell seeds (react, etc.) and `dsh.client` graph-row packages; host-side packages (e.g. `@deepseek-ai/dsh-client-schema-form`) cannot be required by third-party bundles.

## 🧪 Tests

```bash
npm test
```

Covers: default 30 messages (uniqueness/length/forbidden token), validation rules (empty/too long/forbidden/over limit/invalid items), rotation picking (empty pool/single/two/never repeats current), schema defaults and limits, and byte-for-byte mirror consistency between the client bundle and the host half.

## 📄 License

MIT © dsh-fun-turn-status contributors