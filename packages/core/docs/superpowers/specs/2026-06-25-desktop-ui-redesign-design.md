# 桌面端 UI 重设计

**日期**: 2026-06-25
**状态**: 设计已确认并在 2026-06-25 评审纳入十项结构性修订,待转写实现计划
**位置**: `packages/desktop`
**前置**: 已落地的 `2026-06-21-electron-desktop-design.md` 与 `2026-06-24-desktop-workspace-management-design.md`

## 背景与目标

桌面端是 Electron + Vue3(Pinia) + Tailwind v4 的暗色单页聊天客户端,通过 spawn core 的 HTTP server 子进程对接后端。参照三款工具(opencode / Claude Code / Codex)的共同内核——"对话即操作记录 + 可视化产物(diff / 文件 / 计划)",把现有相对朴素的聊天 UI 升级为一款面向"用得舒服"的桌面 agent 应用。

**目标**: 在保留已落地的 workspace 管理、IPC 安全约束、子进程后端通信的前提下,重新设计样式与功能,使其同时对标三款参照工具的硬核气质与 Claude Desktop 的亲和力。

## 整体形态(已选定)

**C 路线: 混合 / 双视图**——左侧对话流 + 右侧面板并排。右侧面板两层结构: 上层 Artifact Tabs(持久产物: diff/todo 等)+ 下层 Inspector(当前点中 tool call 的即时检查)。对话流保留 agent 的日志/进度感,产物检查分开承载。这是"用得舒服"的核心形态。

## 布局与分区

三区结构,从左到右、从上到下:

```
┌──────────┬──────────────────────────────┬──────────────┐
│          │ 会话标题                      │              │
│          │ ⋯菜单(重命名/复制/删除/导出)  │ Artifact     │
│  侧栏    ├──────────────────────────────┤ Tab:Diff/Todo │
│          │                              │──────────────│
│ (260px)  │     对话流                    │ Inspector:   │
│          │   - user 消息                │ activeTool   │
│          │   - reasoning (默认折叠)       │              │
│          │   - tool 调用 (默认展开单行)   │              │
│          │   - 最终 assistant 文本        │              │
│          │                              │              │
│          ├──────────────────────────────┤              │
│          │ Composer(底部一行控件)        │              │
└──────────┴──────────────────────────────┴──────────────┘
```

### 关键尺寸

- 侧栏 `--spacing-sidebar: 260px`(沿用现状),`Ctrl/Cmd+B` 可收起到 0
- 对话流最大宽度 `--spacing-chat-max: 768px`(沿用现状)
- 产物面板默认宽度 360px,可拖拽调整。默认收起,首条产物出现自动展开
- 窄屏降级: `< 1024px` 产物面板由常驻双栏 → 右侧滑出抽屉,点对话流空白处或 `Esc` 收起

### 主区视图状态机(单一状态源)

**单一 `view` 枚举,无双状态源**(避免 `view + settingsMode` 的组合爆炸)。**View 的允许值不写死,而由 `navigationRegistry` 生成**,避免以后加 memory/agents/prompts 等新导航项要回头改枚举:

```ts
// navigationRegistry 注册项: { id, label, icon, view, order }
// 首版注册: skills / mcp 两项(chat/welcome 是系统视图,不进 registry)
// 以后加 memory / agents / prompts,只注册不改 Sidebar 与 View 枚举

type View = "welcome" | "chat" | "settings" | NavigationView   // NavigationView 来自 registry

uiStore = {
  view: View               // 当前主区视图
  previousView: View       // 进入 settings 前的视图,退出时回填
  settingsSection: "appearance" | "models" | "shortcuts" | "about"
  // ... 其他
}
```

- 点击 `⚙` 进入设置: `previousView = view; view = "settings"`
- 再次点击 `⚙` 退出: `view = previousView`
- 任何视图都能进入设置,退出后回到进入前的视图(chat / skills / mcp / welcome 均可被记住)
- **不引入 `settingsMode: boolean`** —— 状态机只有 `view` 一个枚举源,杜绝 `chat + settings` / `mcp + settings` 等组合态

## 侧栏结构与组件

纵向上:顶部固定 logo → Skills/MCP 导航项 → Workspaces/当前目录 Tab → Sessions → 底部状态栏(`⚙` toggle)。

```
┌──────────────────────────┐
│ [品牌 logo]              │ ← 顶部固定
├──────────────────────────┤
│  ✦ Skills               │ ← 导航项: 选中→主区 SkillsView
│  ⚡ MCP                  │ ← 导航项: 选中→主区 McpView
├──────────────────────────┤
│ [Workspaces][当前目录]   │ ← Tab 切换
│  Workspaces Tab:        │
│   • agent-repo(当前) +  │   目录列表,当前项高亮
│  当前目录 Tab:           │
│   🔍                     │
│   • Migrate auth flow    │   属于当前 workspace 的会话
│   • Refactor db layer    │   hover: 重命名/置顶/删除
├──────────────────────────┤
│ Connected v1.0       ⚙  │ ← 底部状态栏,设置在右
└──────────────────────────┘
```

### Workspaces / 当前目录 Tab

- `Workspaces` Tab: 列出 `workspaces.json` 中所有工作目录,当前项高亮,`+` 触发 `openFolderPicker`
- `当前目录` Tab: 列出当前 workspace 下的会话(**过滤条件: 当前 workspace ∈ session.workspaceIds**)。会话项 hover 显示重命名/置顶/删除;搜索框本地过滤
- 多目录挂载歧义处理: "当前目录 Tab" 选中态以 `primaryWorkspaceId` 为 anchor(将来支持 `frontend / backend / infra` 多挂载时,会话归属以 primary 为默认显示目录,Tab 头在多目录时显示主目录名 + 其余目录数量徽章,如 `agent-repo +2`);首版单挂载 `primaryWorkspaceId === workspaceIds[0]`,Tab 头无徽章
- 切 workspace 时若在"当前目录"Tab 则刷新会话列表

### Session 与 Workspace 解耦(避免强绑定)

Session metadata 不写 `workspaceId: string`,而写:

- **`primaryWorkspaceId: string`** — 主挂载目录,UI 的 anchor(决定"当前目录 Tab"显示谁、当前会话默认归属哪个 workspace)
- **`workspaceIds: string[]`** — 全部挂载目录,长度 ≥ 1,`primaryWorkspaceId` 必须在其中

理由: 只用 `workspaceIds` 数组,多目录挂载(`frontend / backend / infra`)时"当前目录 Tab"显示哪个会二义。`primaryWorkspaceId` 充当 anchor,对齐 Claude Code 的多目录趋势。当前桌面端 UI 仍只支持单挂载(`workspaceIds.length === 1, primaryWorkspaceId === workspaceIds[0]`),数据模型已为多目录铺路;真正多选 workspace 的 UI 留待后续,但 schema 不应回头改。

### Skills / MCP 导航项(registry 驱动)

- 顶部导航区由 **`navigationRegistry`** 驱动渲染,Sidebar 遍历 registry 项画导航按钮,不再写死 "Skills" / "MCP" 两项
- 首版 registry 注册: `skills` / `mcp`(各有 `NavigationItem: { id, label, icon, view, order }`)
- 点击导航项 → `uiStore.view = item.view`;选中任意会话 → 回 `'chat'`
- **未来加 `memory` / `agents` / `prompts`**: 只在 navigationRegistry 注册新项 + 实现对应主区视图组件,Sidebar 零改动,View 枚举由 registry 自动派生
- Skills/MCP 即使无 workspace 也可访问(core 模块不依赖 workspace)

### 底部状态栏 + ⚙ toggle

- 状态: `Connected` + 应用版本,始终在底部,任何状态下都不动
- `⚙` toggle: 首次点击进入设置模式,再点击退出回工作区(原视图)

### 组件拆分

- `Sidebar.vue`: 容器,按 `settingsMode` 渲染正常态或设置态
- 正常态子组件: `SidebarHeader.vue`(logo + Skills/MCP 导航)、`SidebarTabs.vue`(Tab 切换壳)、`SidebarWorkspaces.vue`、`SidebarSessions.vue`、`SidebarFooter.vue`(状态 + `⚙`)
- 设置态子组件: `SettingsNav.vue`(左侧设置项列表)+ 复用 `SidebarFooter`

## 主内容区 · ChatView

最高频视图,顶部条 + 对话流 + Composer + 产物面板四部分。

```
┌──────────────────────────────────────────────────────┐
│ Migrate auth flow            ⋯菜单                    │ 顶部条 48px
├──────────────────────────────────────┬───────────────┤
│                                      │ Diff | Todo |工│ 产物面板
│  ┌─ user ──────────────────────┐    │               │
│  │ 帮我把 auth 迁到新 schema    │    │  src/auth.ts  │
│  └─────────────────────────────┘    │ ─────────────  │
│                                      │ + redirect.ts │
│  ┌─ assistant ─────────────────┐    │ @@ ...        │
│  │ ▸ reasoning(默认折叠)       │    │               │
│  │ ▼ read_file src/auth.ts     │    ├───────────────┤
│  │   ✓ 1.2KB                   │    │   Todo        │
│  │ ▼ edit_file src/auth.ts    │    │ ☑ 1 迁移 schema│
│  │   ⚡ 修改了 +12 -3           │    │ ☐ 2 改调用方  │
│  │ 我已经按新 schema 重写了      │    │ ☐ 3 跑测试    │
│  │ auth 模块,diff 见右侧…       │    ├───────────────┤
│  └─────────────────────────────┘    │ 工具详情      │
│                                      │ read_file     │
├──────────────────────────────────────┴───────────────┤
│ Composer(详见下节)                                  │
└──────────────────────────────────────────────────────┘
```

### 顶部条(48px)

- 左:会话标题(点击改名为 inline input,过长 ellipsis);空会话占位 "New chat"
- 右: `⋯` 菜单含 复制 / 重命名 / 置顶 / 删除 / 导出 Markdown
- **不承载模型/模式选择**(已下沉到 Composer 底部)

### 对话流(`ChatTimeline.vue` 改造, B 折叠规则)

按回合序列渲染,每个 assistant 回合内含嵌套块序列:

- **user 消息**: 右对齐 accent-bg-muted 气泡,无头像
- **reasoning 块**: `<details>` 折叠,默认 folded(B 规则),左边紫色细条 + "Reasoning" 文案 + token 数
- **tool 调用块**: 默认展开为单行可读摘要 `▸ read_file src/auth.ts ✓ 1.2KB`。进行中淡黄状态点 pulse;完成转绿色 ✓;失败红色 ✗;点击在单行摘要 / 多行详情(参数+结果)间切换
- **assistant 最终文本**: 左对齐 surface 气泡,markdown 渲染,**代码块用 Shiki 高亮**(替换当前 `ChatTimeline.vue` 内联正则 `parseContent`),代码块带语言标签 + 复制按钮

### 折叠状态记忆(B 规则)

- 一个回合里展开过的 tool 块切回折叠态后下次仍保持展开(用 `Set<toolCallId>` 跟踪)
- 新回合默认折叠,避免长任务里消息区被 tool 噪声淹没

### 右侧面板 = Artifact 区 + Inspector 区(两层结构,关键)

**Tool Detail 不归 Artifact**。Diff/Todo 是**持久产物**(即使该 tool 完成也需保留查看);Tool Detail 是**即时检查**(查当前选中那次 tool 调用),100 个 tool call 摆在一起,"tool artifact" 语义会越来越弱。参考 Claude Code / VSCode / Chrome DevTools 的"Tab 产物 + Inspector 检查"两层模型。

```
┌──右侧面板──────────────────┐
│ [Diff][Todo]   ──────       │ 上层 Artifact Tabs(持久产物)
│  src/auth.ts                │
│  ───────────────            │
│  + redirect.ts              │
│  @@ ...                     │
├─────────────────────────────┤
│ Inspector · read_file       │ 下层 Inspector(当前选中 tool call)
│ ─────                       │
│ 入参: { path: "..." }       │
│ 返回: 1.2KB / 12ms          │
│ 状态: ● 完成                │
└─────────────────────────────┘
```

- **上层 Artifact**: Tabs(Diff / Todo),由 `artifactRegistry` 驱动。**只放"有持久价值、需多实例并存"的产物**,首版注册 `diff` / `todo` 两类(**`tool` 移出到 Inspector**)
- **下层 Inspector**: 永远显示"当前 `activeToolCall`"的详情(入参/返回/耗时/状态/stdout 累计),无 Tab。Inspector 是检查器,无概念上的"多个并存",一次只看一个;点对话流里任意 tool 块 → `uiStore.activeToolCallId = tc.id` → 切到那次 tool 的详情。终端类命令的 stdout 累计也在这
- **Inspector 可独立收起**(上下两区分开关合),上层 Artifact 自动展开规则只看 artifacts 数量,与 Inspector 无关

#### ArtifactType 抽象(避免 Tab 写死)

```ts
type ArtifactType = "diff" | "todo" | "terminal" | "preview" | string  // 不含 "tool"

type ArtifactInstance = {
  id:       string           // = 关联的 tool call id(派生自消息流)
  type:     ArtifactType     // 持久产物才进 artifact
  toolCall: ToolCall          // 直接引用消息流中的 tool 调用对象,不复制
  props:    unknown
}

// 全局注册表: { [type]: { label, icon, render, applicable?(toolName) } }
const artifactRegistry: Record<ArtifactType, ArtifactRenderer>
```

- 每条 tool 调用产生 artifact 时,经各 renderer 的 `applicable(toolName)` 判定入哪个 type。`edit_file`/`write_file` → diff;`todo_write` → todo;**其余任意 tool 都不进 artifact,而是被 Inspector 检查**
- **首版只注册 `diff` / `todo` 两类**(原"手工具详情"已移走);将来加 `terminal` / `preview` / `logs` / `files`,只需在 registry 注册新 type + 渲染组件,面板自动出现新 Tab,无需改面板框架

#### Artifact 状态来源:从消息流推导(单一真源,关键)

**Artifacts 全部从消息流推导(derived/computed),不另存第二份状态。** 杜绝出现"diff 显示了但 tool 没显示""删除消息后 artifact 还在"等不同步问题。

```ts
// artifactStore 中 artifacts 是 computed,不是独立 state:
const artifacts = computed<ArtifactInstance[]>(() => {
  // 遍历 messageStore.messages 抽 ToolCall,逐条经 registry 判定
  // 只有 applicable(tc.name) 命中 artifactRegistry 的 tool 才进 artifact
  return messages
    .flatMap(m => m.toolCalls ?? [])
    .map(tc => {
      const type = pickArtifactType(tc.name)   // 查 registry.applicable
      return type ? { id: tc.id, type, toolCall: tc, props: tc.args } : null
    })
    .filter(Boolean)
})
```

**硬约束**:
- `ArtifactInstance.id` 直接复用 `ToolCall.id`,**不另生成 id**,删 tool call 对应 artifact 自动消失(computed 重算)
- `ArtifactInstance.toolCall` **引用**消息流里的 tool call 对象,**不复制**——tool 的入参/返回/状态通过消息流一次到位,artifact 自动同步
- **不写 artifactStore 持久态,artifacts 是 computed**(在 artifactStore 内,见 store 节);uiStore 只持有纯 UI 态:`artifactPanelOpen`、`activeArtifactId`、`inspectorOpen`、`activeToolCallId`
- 删除/重置消息 → computed 重算 → 面板自动清空对应 artifact,无需手写清理逻辑

#### 首版 Artifact renderer(两类)

- **diff renderer**: 文件级 split diff,加删行着色,顶部文件路径面包屑 + apply/discard 按钮(仅 show 态,apply 经对应 IPC)。数据取自 `toolCall.args`(路径)与 `toolCall.result`(diff 内容)
- **todo renderer**: 对应 core `session/todo.ts`,渲染 checkbox 列表 + 状态(pending/in_progress/completed)。数据取自 `toolCall.result`(todo_write 工具的输出),实时随流式 result 更新

#### Inspector(下层,tool detail)

- 数据直接读 `messageStore` 中 `activeToolCallId` 对应的 `ToolCall`(computed 引用),无独立状态
- 内容: tool name、入参 JSON、返回值、耗时、状态、stdout/stderr 累计
- 持久 artifact 与即时检查分开,语义清晰;100 个 tool call 时 Inspector 一次只看 one,artifact 区干净不带 tool noise

#### 面板行为

- 默认收起(0 宽度);`artifacts.length` 从 0 → >0 时自动展开到 360px,但只在 **`uiStore.hasUserClosedArtifactPanel === false`** 时触发(见下)
- **`hasUserClosedArtifactPanel: boolean`**(uiStore 态, 仅运行时不持久化): 用户点 `«` 主动收起面板 → 置 `true`;此后任何新 artifact(`artifacts.length` 增长)都不再自动展开,**直到用户点 `»` 主动唤回时清回 `false`**。避免任务 B 新出 diff 时面板又弹起打乱布局
- 规则: `autoOpen = artifacts.length 从 0→>0 && !hasUserClosedArtifactPanel`;触发只在"从无到有"边界,**不**在"已有 → 更多"时
- Inspector 区独立开合,默认展开(只要面板已展开),用户可单独收起 Inspector
- 面板顶部 `«` 收起按钮 + 主区工具栏 `»` 图标唤回;**纯靠图标点击,不加全局键**
- 切会话: `hasUserClosedArtifactPanel` 重置为 `false`;`activeToolCallId` 清空(回到无选中)
- 窄屏降级: `< 1024px` 由常驻双栏 → 右侧滑出抽屉,点对话流空白处或 `Esc` 收起

### 组件拆分

- `ChatView.vue`: 容器,组合顶部条 + 时间线 + Composer + 产物面板
- `ChatHeader.vue`: 会话标题 + 菜单
- `ChatTimeline.vue`: 保留,受 B 折叠规则改造,抽出子组件
- `MessageUser.vue` / `MessageAssistant.vue` / `ReasoningBlock.vue` / `ToolCallBlock.vue` / `CodeBlock.vue`(Shiki 封装)
- `ArtifactPanel.vue`: 右侧面板容器,组合上 Artifact 区 + 下 Inspector 区;上 Artifact 区遍历 `artifactRegistry` 渲染已注册 type 的 Tab(首版两类 renderer 在此注册);下 Inspector 区恒显 `activeToolCall`
- `DiffView.vue` / `TodoView.vue`: 上层 Artifact 区的两个 Tab 内容
- `Inspector.vue`: 下层 Inspector,渲染 `activeToolCallId` 引用的 ToolCall 详情(入参/返回/耗时/状态/stdout)

## Composer(输入区强化)

底部固定,逐项强化。

```
┌──────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────┐│
│ │ [chip: src/auth.ts ×] [chip: README.md ×]         ││ ← 附件 chip 行
│ │ ┌────────────────────────────────────────────────┐││
│ │ │ /plan 重构 auth 模块到新 schema...         ↑↓  │││ ← 多行自适应
│ │ │                                                │││
│ │ └────────────────────────────────────────────────┘││
│ │ ┌──┐  ┌─────────┐┌──────┐            ┌─────────┐││
│ │ │ +│  │ gpt-4o ▾││ build▾│            │  发送 → │││ ← + 在左
│ │ └──┘  └─────────┘└──────┘            └─────────┘││ ← 模型模式紧邻发送
│ └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### 底部一行控件布局

从左到右: `+` 附件/提及合一 / 右侧组: `SessionOptions`(model、mode 等`) + `发送→`。配置项紧贴发送按钮左侧,与发送构成"发送相关控件组"。

### SessionOptions 抽象(避免 Model/Mode 写死)

Composer **不写死 "model" / "mode" 两个下拉**,而是渲染 `SessionOptions` 配置项集合:

```ts
type SessionOptionKey = "model" | "mode" | "reasoning" | "permission" | ...
type SessionOption<T = unknown> = {
  key:    SessionOptionKey
  label:   string           // 显示文案("模型"/"模式"/...)
  type:    "select"          // 首版只 select;将来可扩 switch/input
  value:   T
  options: { value: T; label: string }[]
  allowed: ("create" | "runtime")[]   // 允许在哪个时机改
  default: T
}
```

- 桌面维护 `sessionOptionsRegistry: Record<SessionOptionKey, 定义>`,Composer 遍历渲染当前注册的 option 项
- **首版 registry 只注册 `model` 和 `mode` 两项**(值仍是 "
  build/plan" 与 models 列表)
- 将来加 `reasoning` / `permission` / `profile` 等,只需在 registry 注册新 key,Composer 自动渲染新下拉
- Session metadata 存 `options: Record<SessionOptionKey, unknown>` 而非 `model`/`mode` 散字段;新会话从默认值回填
- 出 schema 时,core 暴露 "有哪些 option key 默认 enabled" 让桌面按需显示(TODO 由 plan 确认契约)

### 1. 多行自适应 + 回车规则

- 单行起,长输入自动长高,最大 6 行后内部滚动
- 回车 = 发送; Shift+回车 = 换行
- `↑/↓` 在历史输入间回溯(composer 内独占,多行时光标在首/尾才回溯,避免冲突)

### 2. `+` 附件 + @ 文件提及合一

- 点 `+` → 弹小菜单两项:「提及文件…」「添加附件…」
- 「提及文件…」→ `AtFilePicker`(workspace 文件列表模糊选,打 `@` 亦可触发)→ 选中追加 chip
- 「添加附件…」→ 原生文件对话框 → 选中追加 chip(非文本文件以文件名 + size chip 显示,发送时按 base64 或路径注入)
- chip 行在输入框正上方,`×` 移除
- 拖放文件到输入框也接收
- 选中文件发送时其内容拼进 prompt

### 3. 斜杠命令

- 输入框首位输入 `/` 触发文菜单: `/plan` `/build` `/clear` `/compact` `/model` 等
- 选中即插入到输入框(如 `/plan` 后空格继续打 prompt),或作为指令执行(如 `/clear` 清会话)
- 命令清单来源 core 的 prompt 模板 + 桌面自定义(clear/compact 对应 session 操作)

### 4. SessionOptions 配置项(原"模型/模式下拉",已抽象)

依据上面「SessionOptions 抽象」,首版 registry 注册两项:

- **model**(select): 值列表取 `config.models`(既有 IPC);持久到会话 metadata 的 `options.model` 而非散字段;默认值取 settings 的 `defaultModel`
- **mode**(select): 选项 `build` / `plan`(首版内置仅这两个);发送时按 agent prompt 模板选择生效;默认值 `build`
- Composer 渲染当前 registry 里所有注册项的下拉
- **记忆**: 默认记住每会话 options(持久到 metadata,新会话回填上次值);settings 提供「每次新建会话重置为默认值」开关(默认 off)
- 将来加 `reasoning` / `permission` / `profile` 等,只需注册进 registry,Composer 自动渲染,不改组件树

### 5. 中断 / 发送按钮

- 空闲态: `发送→`(空焦点 + 空文本 disabled)
- 流式态: 变 `⬛ 停止`(调用 `session.interrupt` IPC),键盘 `Esc` 也触发同一动作

### 组件拆分

- `Composer.vue`: 容器,组合控件
- `ComposerInput.vue`: 多行自适应 textarea + 斜杠命令触发 + 历史回溯
- `AttachmentBar.vue`: 附件 chip 行(输入框上方)
- `AttachmentButton.vue`: `+` + 菜单,封装提及文件 / 添加附件两条入口
- `AtFilePicker.vue`: `@`(或 `+` 中"提及文件")触发的文件选择下拉
- `SlashCommandMenu.vue`: `/` 触发的命令菜单
- `SessionOptions.vue`(取代 `ModelSelect.vue` / `ModeSelect.vue`): 按 registry 动态渲染所有当前注册的配置项下拉(首版渲染 model + mode 两项)
- `ComposerToolbar.vue`: 底部一行控件

### IPC 衔接

- 附件读取复用 `file.read`(已有)
- 命令执行复用 `session.prompt` / `session.fork` / `compact` 等
- 模型列举复用 `config.models`
- 模式切换作用在 prompt 时的 agent 模板选择,需新增 IPC 或扩 `session.create` 参数传 mode

## Skills / MCP 管理视图

主区作为全宽管理视图(非聊天布局),由侧栏顶部导航项触发。

### SkillView

```
┌──────────────────────────────────────────────────────┐
│ ✦ Skills                        + 新建技能            │ 顶部条
├──────────────────────────────────────────────────────┤
│  git-helper                                  [启用 ●]│
│    写 git 提交、合并、branch 操作                      │
│    scope: git | source: ~/.opencode/skills/git-helper │
│  debug-trace                                 [启用 ●]│
│    断点跟踪 + 日志聚合                                │
│    scope: editor | source: builtin                    │
└──────────────────────────────────────────────────────┘
```

- 每项: 名称 + 一行描述 + scope/source 元信息 + 右侧启用开关
- **开关**: `SKILL_TOGGLE` IPC(core `skill` 模块)
- 点项目行可展开看详情: 包含的工具清单、完整描述、来源文件路径
- **无删除 UI**(技能由 core 配置文件管理,桌面只翻转启用态)
- 空态: "暂无技能,在 `~/.opencode/skills/` 添加,或点 + 新建技能"

#### 新建技能(chat 循环,非静态表单)

`+ 新建技能` 按钮 → 走 chat 循环捕获 intent 生成技能,**桌面端不感知具体 skill 名**:

1. 点击 → 弹轻量预填:
   - 选择技能目录(`.agents/skills` 默认 / `.zcode/skills` / `~/.agents/skills` 三选一)
   - "技能用途"输入框(可选,留空则 agent 在会话里追问)
2. 确认 → 调 core `core.createSkill({ directory, usage })`,core 决定激活哪个 skill(当前可能是 skill-creator,未来可能换名或换实现) → 返回 `{ sessionId }`
3. 桌面用 `sessionId` 跳转进 chat 会话(`view = "chat"` + `selectSession`)
4. 后续捕获 intent / 写 SKILL.md / 创建目录结构 / 试测 / 迭代全在 chat 会话里渲染;文件写入 buffered 在产物面板 Diff Tab

**分层约束(关键)**:
- 桌面**只调 `core.createSkill(payload)`,只拿 `sessionId`**,不在 UI 里写 "skill-creator" 字面量
- 不传 `activeSkill: 'skill-creator'` 这种 leak core 内部的参数
- 以后 core 内部把 skill-creator 换成 mcp-creator / workflow-creator / 别的实现,或重命名,桌面端零改动(同契约)
- core 充当"哪个 skill 负责创建技能"的路由层,实现细节封装在 core

**衔接细节**:
- 用户未填 usage → core 自行让被激活的 skill 主动追问
- 创建的目录路径不暴露用户手填(对话框只选预置三选一);agent 写入 under workspace 或 home,经既有 file IPC 安全约束

### McpView

```
┌──────────────────────────────────────────────────────┐
│ ⚡ MCP                        + 添加 Server          │ 顶部条
├──────────────────────────────────────────────────────┤
│  ● filesystem        ● 已连接        ▸ 展开          │
│    tools: 6  |  uptime: 12m                          │
│  ○ github            ○ 断开        ↻ 重连            │
│    tools: 0  |  last error: ECONNREFUSED             │
│  ● git-helper        ● 已连接        ▸ 展开          │
│    tools: 4  |  uptime: 5m                            │
└──────────────────────────────────────────────────────┘
```

- 每项: server name + 连接状态点(绿=已连接 / 黄=启动中 / 灰=断开)+ 工具数量 + 运行时长
- **+ 添加 Server**(静态表单,非 chat): 弹模态填 name / command / args / env(键值对,可加多项)→ `MCP_ADD` IPC 写入 core 配置文件 + 触发连接(一步到位);新增卡片先黄"启动中",成功变绿,失败变灰 + 显示错误
- **↻ 重连**(`MCP_RECONNECT`): 触发重启
- **首版不做编辑配置**(改 command/args/env 易出错,配置让用户直接编辑文件更顺手;编辑能力二期再考虑)
- 断开项显示最后错误(如 `ECONNREFUSED`)便于排查
- 空态: "暂无 MCP server,点 + 添加"

#### 组件拆分

- `SkillView.vue` / `McpView.vue`: 各自主区视图
- `SkillCard.vue` / `McpCard.vue`: 单项卡片(可展开)
- `SkillCreateDialog.vue`: 新建技能预填对话框
- `McpAddDialog.vue`: 添加 server 模态表单
- 复用 `Composer.vue` / `ChatView.vue`(新建技能进入会话后)

#### IPC(新增)

- `SKILL_LIST`(core skill 模块列出)、`SKILL_TOGGLE`(切换启用)
- `MCP_LIST`(列出 + 状态)、`MCP_RECONNECT`(重启)、`MCP_ADD`(写配置)
- 全部经 main 转发 core,路径/workspace 不依赖

## Settings 面板(两栏 + 状态栏 toggle)

不是覆盖抽屉,也不是独立视图——是**侧栏整体切换到设置态**。

### 进入 / 退出

- 状态栏 `⚙` toggle: 首次点击进入设置模式,再点击退出回工作区(原视图)
- 进入设置模式时侧栏顶部出现「← 返回」视觉提示,点击等同 `⚙`(两入口都行)

### 布局

```
点 ⚙ 后:
┌──────────────────────┐
│ [品牌 logo]          │ ← 顶部固定不变
├──────────────────────┤
│  ← 返回              │ ← 替换原 Skills/MCP 导航
│  外观 ●              │
│  模型                │ ← 替换原 [WS/当前目录] Tab + Sessions
│  快捷键              │
│  关于                │
├──────────────────────┤
│ Connected v1.0    ⚙   │ ← 状态栏不变,⚙ 现在是 toggle
└──────────────────────┘
 主区同步按选中项展示内容:
┌─────────┬──────────────────────────────────┐
│ ← 返回  │ 外观                              │ 主区顶部条
├─────────┤  主题           [暗色  ▾]          │
│  外观●  │  字体大小       [ 14px  ▾]          │
│  模型   │  字体           [ Inter  ▾]         │
│  快捷键 │  等宽字体       [ JetBrains Mono▾]  │
│  关于   │  代码块主题     [ GitHub Dark  ▾]   │
│         │                                  │
│         │  ─── 数据 ───                     │
│         │  清空所有会话历史                  │
│         │  重置全部设置                      │
└─────────┴──────────────────────────────────┘
```

- **底部状态栏不动**——任何设置状态下都保持在原位
- **`⚙` 是 toggle**——再点击返回工作区,不必依赖「← 返回」
- **进入设置时其他视图退场**——不显示 chat/skills/mcp/welcome,主区纯设置内容;退出后恢复到进入前的视图(如原本在 chat 则回 chat)
- **`SidebarFooter`(`⚙`)始终保留**——设置模式下 `⚙` 仍在,以便 toggle 退出

### 设置项划分(左侧列表项)

- **外观**: 主题(暗色 / 亮色)、字体大小、字体族、等宽字体、代码块主题
- **模型**: 默认模型(`defaultModel`)、每会话模型选项是否记住、「每次新建会话重置为默认值」开关、可用模型列表(只读,从 `config.models` 拉)
- **快捷键**: 首版 3 个全局键 + 回车规则的只读展示 + 说明文案。**不做自定义**
- **关于**: 应用版本、core 版本、开源链接、检查更新入口

### 数据操作(危险区)

- **清空所有会话历史**: 经 `session.delete` 批量,二次确认对话框。**不删 workspaces.json 持久化**(那是用户项目数据)
- **重置全部设置**: config keys 重置默认值,二次确认

### 组件拆分

- `SettingsNav.vue`: 左侧设置项列表
- `SettingsView.vue`: 主区容器,按 `settingsSection` 渲染对应内容
- `SettingsAppearance.vue` / `SettingsModels.vue` / `SettingsShortcuts.vue` / `SettingsAbout.vue`
- `ConfigSelect.vue`: 可复用的配置项下拉

### IPC 衔接

- `config.get` / `config.set`(已有),需扩 `ALLOWED_CONFIG_KEYS`(guards.ts)白名单: `fontSize` / `fontFamily` / `monoFontFamily` / `codeTheme` / `resetPerSession` 等新增 key
- "清空所有会话"批量经 `session.delete` 循环,或新增 `SESSION_CLEAR_ALL`

## 视觉风格基调

**沿用当前 B 基调**: 暗色 + 柔和圆角 + 阴影层次 + glow 发光(对应 Claude Desktop 风格)。当前 `global.css:4-57` 已落地 B,沿用零改造即可。

### accent 暖化

当前 `--color-accent: #6366f1`(冷 indigo)系。暖化到 amber/橙系:

- `--color-accent: #f59e0b`(amber-500,暖橙)
- `--color-accent-hover: #fbbf24`(amber-400,亮一点)
- `--color-accent-muted: rgba(245, 158, 11, 0.12)`
- `--color-accent-glow: rgba(245, 158, 11, 0.25)`

与暗色 bg 搭更亲和、聚焦感不丢,够亮但不刺眼,符合"用得舒服"。

### 双主题

- config 白名单已含 `theme`,现成可接
- 通过 `document.documentElement.classList.toggle('dark')` + 双套 CSS 变量切换
- 当前 `global.css` 只一套暗色变量,需补亮色变量集合(bg 反色、text 反色、accent 不变保持 amber)

### CodeBlock 主题(Shiki)

- 替换 `ChatTimeline.vue` 当前内联正则 `parseContent` 为 Shiki 高亮
- 代码块主题由 settings `codeTheme` 控制(GitHub Dark / GitHub Light 等)
- 代码块带语言标签 + 复制按钮

## 全局快捷键(精简至 3 + 输入行为)

参照三款工具早期 spec 推了密集成 CLI 语境快捷键,桌面端有鼠标 + 下拉 + 列表点击,CLI 密集键没必要照搬。只保留纯高频、点击成本明显比键盘高的:

- `Esc`: agent 跑动时中断(调 `session.interrupt`);空闲时收起展开/抽屉
- `Ctrl/Cmd+N`: 新建会话
- `Ctrl/Cmd+B`: 收起侧栏
- 回车发送 / Shift+回车换行(输入行为,不计入全局键)

**砍掉的**: `Ctrl/Cmd+K` 命令面板(工程大,先不做)、`Ctrl/Cmd+\` 产物面板切换(纯靠图标点击)、`Ctrl/Cmd+/` 斜杠菜单(输入框打 `/` 即可)、会话切换 `Alt+↑/↓`、Tab 切换 `Ctrl+1/2/3`。

## store / UI 状态新增

- `stores/ui.ts`(新增): `view`、`previousView`、`settingsSection`、`artifactPanelOpen`(整个右侧面板开关)、`hasUserClosedArtifactPanel`(用户主动收起后置 `true`,压制未来自动展开)、`inspectorOpen`(下层 Inspector 独立开合)、`activeArtifactId`(artifact 区焦点)、`activeToolCallId`(Inspector 当前查的 tool call)。**不含 `settingsMode`(已统一进 `view`);不含 artifact 列表**(artifacts 是 artifactStore 的 computed,见下)

- `stores/session.ts`(纯会话元信息与会话列表): `sessions[]` 列表、`currentSessionId`、metadata(`title`/`options: Record<SessionOptionKey, unknown>`/`primaryWorkspaceId: string`/`workspaceIds: string[]`/`pinned`)、会话级 action(`create`/`select`/`rename`/`pin`/`delete`/`clearAll`)。**不持有消息**,不持有 artifacts。会话持久化 metadata 在此层。

- `stores/message.ts`(新增,消息流单一真源): `messages[]`(当前会话的全部消息与 tool 调用,流式更新经此层)、`streamingMessage`、发送/中断动作桥接。**这是 artifact 派生的唯一输入源**。切会话时一次性替换替换为下一会话的消息。

- `stores/artifact.ts`(新增,派生层): 只有 `artifacts: computed(ArtifactInstance[])` —— 遍历 `messageStore.messages` 抽 ToolCall 经 `artifactRegistry` 判定 type,**不持久化、不另存状态**。**独立成 store 而非 sessionStore 字段**,因为派生职责会持续增长(将来 todo/trace/memory/replay 都从消息流派生),独立 store 才不会回流把 sessionStore 撑成上帝对象。还可持纯 UI 派生态(如按 type 分组、聚焦 artifact 索引),只要不改 messageStore 输入。

- `stores/workspace.ts`: 沿用现状,无新增

- `composer/sessionOptionsRegistry`: 模块级常量,注册 SessionOption 定义(首版 model + mode 两项)
- `composer/artifactRegistry`: 模块级常量,注册 ArtifactRenderer(首版 diff / todo / tool 三类)

**拆分原则**:
- **单一真源 = messageStore**;artifacts 一切派生于此,sessionStore 不碰消息
- **sessionStore 切会话时只更新 `currentSessionId` + metadata,消息加载由 messageStore 监听 currentSessionId 触发**
- **将来加 todo/trace/memory/checkpoint**: 优先复用 artifact.ts 的"派生于消息流"模式;若某产物需要独立持久化(如 checkpoint),才新开对应 store,**永不回流到 sessionStore**
- 目标上限: 每个 store 单文件不超过 ~400 行,超过即拆

## IPC 安全约束(沿用 + 扩展)

- `guards.ts` `ALLOWED_CONFIG_KEYS` 扩白名单: `fontSize`/`fontFamily`/`monoFontFamily`/`codeTheme`/`resetPerSession`/`defaultModel`(已有)/`theme`(已有)
- `resolveWithinWorkspace` 沿用,`@` 文件提及受约束在当前 workspace 内
- `ALLOWED_CHANNELS`(channels.ts)扩: `SKILL_LIST`/`SKILL_TOGGLE`/`MCP_LIST`/`MCP_RECONNECT`/`MCP_ADD`/可选 `SESSION_CLEAR_ALL`

## 实施策略(已选定)

**方案一: 分层增量**,按"骨架先行 + 双主题后置"分七阶段(实施顺序调整自初版四阶段):

1. **阶段 1 · UI Store + View 状态机**: `uiStore`(`view`/`previousView`/`settingsSection`/面板开关态等)、单一 `view` 枚举(由 `navigationRegistry` 派生)、全局快捷键 3 个(Esc/Ctrl+B/Ctrl+N)、App.vue 按 `view` 切换主区视图骨架。先打骨架,所有后续阶段都在此 state 上长
2. **阶段 2 · Sidebar 重组**: `navigationRegistry`(首版注册 skills/mcp)驱动顶部导航区 + Workspaces/当前目录 Tab + Sessions(搜索/重命名/置顶/删除)+ 状态栏 `⚙` toggle + WelcomeView 空态。Sidebar 早期定型,后续阶段主区可独立长功能
3. **阶段 3 · Chat 双栏 + Artifact/Inspector**: 顶部条(标题/操作菜单)+ 右侧面板两层结构(Artifact 区 artifactRegistry 框架 + 首版注册 diff/todo 两渲染器;Inspector 区即时检查 activeToolCall)+ 对话流 B 折叠规则改造 + Shiki 代码块
4. **阶段 4 · Composer 增强**: SessionOptions 抽象 + 底部 model/mode 下拉 + `+` 附件/提及合一 + 斜杠命令 + 历史回溯 + Esc 中断
5. **阶段 5 · Skills/MCP 管理视图**: SkillView(含 `core.createSkill()` chat 循环入口)+ McpView(+ 添加 Server 表单 + 重连)+ 新增 IPC(`SKILL_*`/`MCP_*`)
6. **阶段 6 · Settings 细化**: 设置项划分(外观/模型/快捷键/关于)+ Session metadata 字段(`primaryWorkspaceId`/`workspaceIds`/`options`/`pinned`)+ 扩 `ALLOWED_CONFIG_KEYS` 白名单 + 危险区操作(清会话/重置)
7. **阶段 7 · 双主题**: 暖 accent 替换 + 亮色主题切换 + `codeTheme` 配置驱动 Shiki

**双主题后置的原因**: 后置 70% 组件尚未完成时做亮色,做完还得回头适配新组件,成本高;功能稳定 → 统一主题 → 验收 是最低成本的顺序。阶段 1-6 全程只用暗色(沿用现状),阶段 7 一次性补亮色变量集 + 全组件双主题验证。

每阶段都在已有组件上"长"功能,回滚面小、可阶段性验证;阶段 1 完成已有可用骨架,后阶段按依赖与感知价值递进。

## 风险与权衡

- **双主题维护成本**: 每个新组件都要在两套主题下验证。CSS 变量集中化是关键,plan 中需约束使用变量而非硬编码颜色
- **Shiki 体积**: Electron 包体积增加(Shiki 含语言包)。首版只加载常用语言(js/ts/json/bash/md),其余按需懒加载
- **产物面板状态机**: 自动展开/记忆 Tab/聚焦 artifact 的逻辑较复杂,本设计已规定"自动展开只在面板从无到有时触发一次;后续用户切换不过度干涉",plan 落实时以 artifactRegistry + ArtifactInstance[] 为单一数据源,避免重复状态机

## 已采纳的结构性风险(评审 2026-06-25)

评审识别十个结构性风险,已并入本设计:

1. **View 状态机双状态源**: 原 `view` + `settingsMode` 同时存在会产生 `chat + settings` / `mcp + settings` 组合爆炸。合并为单一 `view: "welcome" | "chat" | "skills" | "mcp" | "settings"` + `previousView`,进入/退出设置用 `view = previousView` 切换。不再引入 `settingsMode`。
2. **Artifact Panel 三 Tab 写死**: 未来会长出 Terminal / Logs / Files / Preview 等。已抽象为 `ArtifactType + artifactRegistry`,首版只注册 `diff` / `todo` **两类**(原 tool 移出,见第 8 项),新增 type 仅注册不重构。
3. **Session 与 Workspace 强耦合**: 跨多目录分析需求已存在(Claude Code 趋势)。Session metadata 改用 `primaryWorkspaceId: string` + `workspaceIds: string[]`(单值时 primary === workspaceIds[0]),为多目录扩展铺路,schema 一次到位不改。`primaryWorkspaceId` 是多挂载时"当前目录 Tab"的 anchor,避免二义。UI 过滤仍按 "当前 workspace ∈ workspaceIds"。
4. **Model / Mode 写死到组件树**: 未来会出 Reasoning / Permission / Profile 等。抽象为 `SessionOptions` + `sessionOptionsRegistry`,Composer 遍历渲染当前注册项,首版只注册 model + mode,新增 option 仅注册不改组件树。Session metadata 用 `options: Record<SessionOptionKey, unknown>` 而非散字段。
5. **Skill Creator leak core 内部**: 原"激活 skill-creator"会让桌面感知具体 skill 名,以后换 mcp-creator/workflow-creator 桌面要改。改为桌面只调 `core.createSkill({ directory, usage })`,拿 `{ sessionId }` 跳转;由 core 决定激活哪个 skill,桌面零感知实现。
6. **Artifact 状态多源**: 若 chatStore/artifactStore/toolStore 各持一份,会出现"diff 显示了 tool 没显示""删除消息 artifact 还在"等不同步。自第一天起 artifacts 从消息流推导:`artifactStore.artifacts` 是 `computed`,遍历 `messageStore.messages` 抽 ToolCall 经 registry 判定 type;`ArtifactInstance.id = ToolCall.id` 不另生成,`toolCall` 引用消息流对象不复制。删消息/流式更新都经 computed 自动同步,无额外清理逻辑。
7. **SessionStore 上帝对象**: 若 sessionStore 同时管会话列表/metadata/messages/artifacts,再加 todo/trace/memory/checkpoint 很容易长成 2000+ 行。提前按职责拆: `sessionStore`(会话元信息与列表 + `clearAll`)/ `messageStore`(消息流单一真源,流式更新入口)/ `artifactStore`(只 computed 派生,不持久化)/ `uiStore`/ `workspaceStore`。即使 artifact 不持久化也独立成 store,因为派生职责会持续增长(将来 todo/trace/memory/replay 同模式派生)。切会话时 sessionStore 只更新 `currentSessionId` + metadata,消息加载由 messageStore 监听 currentSessionId 触发。目标单文件上限 ~400 行,超过即拆。
8. **Tool Detail 不该是 Artifact**: Diff/Todo 是持久产物,Tool Detail 是即时检查(查当前那次 tool call)。100 个 tool call 时"tool artifact"语义会变弱。改为参考 Claude Code / VSCode / DevTools 的两层模型: 右侧面板上层 Artifact Tabs(只放持久产物,首版 diff/todo)+ 下层 Inspector(恒显 `activeToolCall` 详情,无 Tab,一次看一个)。`artifactRegistry` 的 `ArtifactType` 不再含 "tool"。新增 `uiStore.activeToolCallId` 切换 Inspector 当前对象,Inspector 与 Artifact 区独立开合。
9. **View 平级写死**: `view = welcome/chat/skills/mcp/settings` 把 skills/mcp 写死进枚举。pdev facts 未来会加 memory/agents/prompts。改为 `navigationRegistry` 注册导航项(`{ id, label, icon, view, order }`),Sidebar 遍历 registry 渲染,View 允许值由 registry 派生。首版注册 skills/mcp,加 memory/agents/prompts 只需注册不改 Sidebar、不改枚举。
10. **双主题先做会浪费**: 阶段 1-6 全程暗色(沿用现状);双主题后置到阶段 7。理由: 70% 组件未定型时做亮色,后续阶段新组件还要回头二次适配亮色,成本高。功能稳定 → 统一主题 → 验收 顺序最省。实施策略已据此调整为七阶段顺序。

## 范围与拆分

本设计聚焦桌面端 UI 重设计单点。不包含:
- core 侧新增端点(SKILL_*/MCP_*/mode 参数)的 schema 设计——属 core 任务,本设计仅表述桌面端期望的契约
- 打包/分发(沿用现有 electron-builder.yml)
- e2e 测试(早期 spec 列了 Playwright,本设计范围不含)
- 亮色主题具体色值(plan 中详述,本设计仅指明需补)