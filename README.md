# dsh-fun-turn-status

> [!WARNING]
> **该插件已停止更新与维护。** 本仓库不再新增功能、不再适配新版 DeepSeek Harness，也不再处理问题反馈；现有代码仅作存档参考，可能无法在当前版本中正常工作，请谨慎使用。

把 DeepSeek Harness 任务运行中的 “Deep diving...” 状态文案，替换为会随机轮换的幽默文案 —— 每 30 秒换一条，再也不无聊。

[![中文](https://img.shields.io/badge/简体中文-red?style=for-the-badge)](README.md)
[![EN](https://img.shields.io/badge/English-blue?style=for-the-badge)](README_en.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

---

## ✨ 功能

| 功能 | 说明 |
| --- | --- |
| 🎭 替换状态文案 | 任务运行中的 “Deep diving...” 替换为随机幽默文案（内置 30 条） |
| 🔄 30 秒轮换 | 每 30 秒随机切换到另一条，不与当前重复 |
| ⚙️ 可视化配置 | 「设置 → 插件 → 插件配置」页面增删改文案，最多 50 条；官方折叠卡片（默认收起，点击表头展开；暂存编辑/已覆盖徽章/恢复默认/未保存徽标/保存·放弃） |
| ♻️ 即存即生效 | 保存后立即影响正在运行的任务，无需重启 |

## 🚀 快速开始

### 方式一：从 GitHub 远程安装（推荐）

要求本机 git 能用 `git+ssh`（或 https）访问 GitHub。一条命令即可安装并自动挂载：

```bash
dsh plugin --profile web add github:Ycet/dsh-fun-turn-status
```

### 方式二：本地开发安装（源码目录）

适合二次开发：改动客户端代码后刷新页面 / HMR 即可生效；bundle/Loader 层改动需重启 `dsh web`。

```bash
# 1. 安装（link 指向本地源码绝对路径）
dsh plugin --profile web add dsh-fun-turn-status@link:<absolute-path-to-plugin>

# 2. 重启 web 使 bundle/Loader 层生效
#    在运行 dsh web 的终端 Ctrl+C，然后重新运行 dsh web

# 3. 运行单元测试
cd <absolute-path-to-plugin> && pnpm install && npm test
```

刷新页面后，任意发起一个任务：状态栏文案立即变为幽默文案，且每 30 秒随机切换。

## ⚙️ 配置说明

配置入口：**设置 → 插件 → 插件配置**（与“终端 / Agent 循环 / 网页搜索”卡片并列）。

- 每条文案可编辑、可删除；底部输入框 + 「添加」新增文案；
- 右上角显示 `N/50` 计数，达到 50 条时自动锁定添加；
- 「保存」一次性写入（`~/.dsh/settings.yaml` 的 `fun-turn-status:` 段）；「放弃」丢弃未保存修改；「恢复默认」清除用户覆盖、回落内置 30 条；
- 保存校验：每条 1–50 字符、总数 ≤ 50、**不得包含字面量 `Deep diving`**（见下方优先级说明）；
- 列表为空时保留原始 “Deep diving...” 展示（不接管）。

## 🧩 工作原理（开发者视角）

| 层 | 文件 | 职责 |
| --- | --- | --- |
| Host | `lib/index.js` | 注册 `fun-turn-status` settings 命名空间（schema + 默认 30 条文案 + `draftErrors` 可测规范） |
| Client | `lib/client.js` | ModuleLoader bundle：DOM 文本接管器 + 「插件配置」卡片（DSH 官方契约，zh/en 双语） |
| 补丁 | `cordis.patch.yml` | insert `fun-turn-status` 插件行 |

- “Deep diving...” 硬编码于 `@deepseek-ai/dsh-client-ui-conversation` 的 `TurnStatus` 组件（非 locale key、无槽位），因此采用 DOM 文本接管：以 `[role="status"][aria-live="polite"]` + `turnStatus` 类名（可读段）为识别特征，只改写首个子文本节点，保留计时器与渐变流光样式。
- 文案池来自 settings 服务的解析值：用户未配置时回落内置 30 条；显式存空数组时表示“不接管”。
- **配置卡片按 DSH 官方契约实现**：`settings.plugin.item` 键控槽位 + `settingsScope.bind`；控制器暴露 hooks 快照与 `edit/resetField/save/discard` 动作，暂存编辑 + base/user 覆盖层（「已覆盖」徽章）、恢复默认=暂存清除→保存时 `unset`、只读/失败态；客户端用与宿主一致的镜像规则做前端拦截（条数/长度/空串/含 `Deep diving` 字样），宿主 schema 是唯一权威——settings 服务对每次写入都做 schema 校验，错误提示中英双语映射。注意：浏览器模块表只解析 shell seed（react 等）与 `dsh.client` 图行包，宿主侧包（如 `@deepseek-ai/dsh-client-schema-form`）不能被第三方 bundle require。**卡片内所有图标（折叠箭头、删除垃圾桶）均内联 DSH 原生 path**（`IconChevronDownOutline14` / `IconTrashOutline16`），无任何运行时模块依赖——任何安装环境展示完全一致。

## 🧪 测试

```bash
npm test
```

覆盖：默认文案 30 条去重/长度/禁用字样、校验规则（空/超长/禁用/超限/非法条目）、轮选取条（空池/单条/两条/避开当前条）、schema 默认与上限、客户端镜像与宿主半逐字一致。

## 📄 许可证

MIT © dsh-fun-turn-status contributors
