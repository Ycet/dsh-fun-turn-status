# dsh-fun-turn-status

> [!WARNING]
> **This plugin is no longer updated or maintained.** No new features, compatibility updates for newer DeepSeek Harness releases, or issue fixes will be provided; the existing code is kept for archival reference only and may not work with current versions. Use at your own risk.

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
| ⚙️ Visual configuration | Add/remove/edit messages in Settings → Plugins → Plugin configuration (max 50); official collapsible card (collapsed by default, click the header to expand; staged edits / Overridden badge / Restore defaults / Unsaved badge / Save·Discard) |
| ♻️ Live application | Saved changes affect the currently running task immediately, no restart |

## 🚀 Quick Start

### Option 1: Install from GitHub (recommended)

Requires git to reach GitHub via `git+ssh` (or https) on this machine. One command installs and mounts it:

```bash
dsh plugin --profile web add github:Ycet/dsh-fun-turn-status
```

### Option 2: Local development install (source directory)

For working on the plugin itself: client-code changes take effect on page refresh / HMR; bundle/Loader-layer changes need a `dsh web` restart.

```bash
# 1. Install (link points to the local source absolute path)
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

## 🧩 How It Works (for developers)

| Layer | File | Responsibility |
| --- | --- | --- |
| Host | `lib/index.js` | Registers the `fun-turn-status` settings namespace (schema + 30 default messages + `draftErrors` testable spec) |
| Client | `lib/client.js` | ModuleLoader bundle: DOM text takeover + the configuration card (DSH official contract, zh/en) |
| Patch | `cordis.patch.yml` | Inserts the `fun-turn-status` plugin row |

- “Deep diving...” is hardcoded in the `TurnStatus` component of `@deepseek-ai/dsh-client-ui-conversation` (no locale key, no slot), so the takeover is DOM-based: the element is identified by `[role="status"][aria-live="polite"]` plus the readable `turnStatus` class segment; only the first text child is rewritten, keeping the timer and the shimmer gradient intact.
- The message pool is the resolved settings value: the 30 built-ins until the user configures anything; an explicitly empty array means “no takeover”.
- **The configuration card follows the official DSH contract**: the `settings.plugin.item` keyed slot plus `settingsScope.bind`; the controller exposes a hooks snapshot and `edit/resetField/save/discard` actions, staged edits with base/user override semantics (the “Overridden” badge), restore-defaults staged as a clear then `unset` on save, read-only and failed states; the client intercepts early with mirror rules matching the host (count/length/trimmed-empty/`Deep diving` token) while the host schema stays the single authority — the settings service re-validates every write with the schema, and errors are mapped bilingually. Note: the browser module table only resolves shell seeds (react, etc.) and `dsh.client` graph-row packages; host-side packages (e.g. `@deepseek-ai/dsh-client-schema-form`) cannot be required by third-party bundles. **Every icon in the card (collapse chevron, delete trash) inlines the official DSH path** (`IconChevronDownOutline14` / `IconTrashOutline16`) with no runtime module dependency — identical rendering on any installation.

## 🧪 Tests

```bash
npm test
```

Covers: default 30 messages (uniqueness/length/forbidden token), validation rules (empty/too long/forbidden/over limit/invalid items), rotation picking (empty pool/single/two/never repeats current), schema defaults and limits, and byte-for-byte mirror consistency between the client bundle and the host half.

## 📄 License

MIT © dsh-fun-turn-status contributors
