# 桌面端 UI 重设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把桌面端从朴素聊天 UI 升级为 opencode/Claude Code/Codex 同形态的混合视图 agent 应用 —— 左侧对话流 + 右侧 Artifact/Inspector 双层产物面板,侧栏 registry 驱动导航,Composer 沉底带 SessionOptions,设置两栏,双主题后置。

**Architecture:** 七阶段分层增量,骨架先行,双主题后置。store 按职责拆分: `uiStore`(纯 UI 态,单 source of truth `view`+`previousView`)/ `sessionStore`(会话元信息与列表)/ `messageStore`(稳定消息流)/ `streamStore`(临时流式态)/ `artifactStore`(只 computed 派生,不持久化)/ `workspaceStore`(沿用)。store 经 `MessageRepository` 接口工作,不直接调 IPC。artifact 从消息流推导(`ArtifactInstance.id = ToolCall.id` 引用不复制)。`navigationRegistry` / `sessionOptionsRegistry` / `artifactRegistry` 三个注册表驱动可扩展项,避免写死进组件树。

**Tech Stack:** Electron + Vue 3 (Pinia) + Tailwind v4 (CSS 变量 `@theme`) + Vitest + @vue/test-utils + jsdom + Shiki(阶段 3+ 引入)。保留 backend-client v1 `/session/...` 路径不动。

**Spec:** `packages/core/docs/superpowers/specs/2026-06-25-desktop-ui-redesign-design.md`(评审纳入十四项结构性修订)

**美学约束:** 阶段 1-6 全程只暗色(沿用现状),不做亮色。所有新组件用 CSS 变量(已定义于 `global.css` `@theme`),不要硬编码颜色——为阶段 7 双主题做准备。

**测试约束:** 跑 `cd packages/desktop && npm test`(= `vitest run`)。glob 是 `src/**/*.test.ts`(`vitest.config.ts`),所以新测试文件命名 `*.test.ts` 不要 `*.spec.ts`。已有 `src/renderer/__tests__/stores/session.test.ts` 的 mock 与现实脱节(用 `sendMessage`/`onStreamData`/`onStreamEnd`,实现用 `prompt`/`onStreamEvent`),阶段 3 会重写。

---

## File Structure

新增/改造的文件按阶段标注。每个文件单一职责,目标单文件 ≤ ~400 行。

### 阶段 1(UI Store + View 状态机骨架)
- Create: `packages/desktop/src/renderer/stores/ui.ts` — Pinia store, view/previousView + 设置态 + 面板开关态
- Create: `packages/desktop/src/renderer/composables/useGlobalShortcuts.ts` — Esc/Ctrl+B/Ctrl+N 全局键
- Create: `packages/desktop/src/renderer/navigation/navigationRegistry.ts` — 导航项注册表(V = "skills" | "mcp" 派生)
- Create: `packages/desktop/src/renderer/stores/__tests__/ui.test.ts` — uiStore 单元测
- Modify: `packages/desktop/src/renderer/App.vue` — 引入 uiStore, 主区按 `view` 渲染(本阶段先确保 welcome/chat 二态切换不回归)
- Modify: `packages/desktop/src/renderer/main.ts` — 在 mount 前注册全局快捷键

### 阶段 2(Sidebar 重组)
- Create: `packages/desktop/src/renderer/components/sidebar/SidebarHeader.vue` — logo + navigationRegistry 渲染的导航按钮
- Create: `packages/desktop/src/renderer/components/sidebar/SidebarTabs.vue` — Workspaces/当前目录 Tab 切换壳
- Create: `packages/desktop/src/renderer/components/sidebar/SidebarWorkspaces.vue` — 目录列表 + `+ Add Workspace`(openFolderPicker)
- Create: `packages/desktop/src/renderer/components/sidebar/SidebarSessions.vue` — 会话列表 + `+ New Session`(createSession,workspace 已确定)+ 搜索/重命名/置顶/删除
- Create: `packages/desktop/src/renderer/components/sidebar/SidebarFooter.vue` — 状态栏 + `⚙` toggle
- Create: `packages/desktop/src/renderer/components/sidebar/SettingsNav.vue` — 设置态左侧列表(外观/模型/快捷键/关于)
- Create: `packages/desktop/src/renderer/components/WelcomeView.vue` — 空态
- Create: `packages/desktop/src/renderer/components/sidebar/__tests__/navigationRegistry.test.ts`
- Modify: `packages/desktop/src/renderer/components/Sidebar.vue` — 改为容器,按 `uiStore.settingsMode` 渲染正常态子组件或设置态 `SettingsNav`
- Modify: `packages/desktop/src/renderer/stores/session.ts` — `createSession` 改用 `{workspaceIds, primaryWorkspaceId}` 入参;补 `rename`/`pin`/`delete`/`clearAll` action;metadata 加 `primaryWorkspaceId`/`workspaceIds`/`options`/`pinned`
- Modify: `packages/desktop/src/types/ipc.ts` — `Conversation` 加新 metadata 字段
- Modify: `packages/desktop/src/preload/api.ts` — session namespace 加 `rename`/`setPinned`(若 core 不直接支持,先用 metadata update 走 config-like 通道);见 phase 6 危险区
- Modify: `packages/desktop/src/main/ipc/channels.ts` — 加 `SESSION_UPDATE`(用于 rename/pin metadata 改写)

### 阶段 3(Chat 双栏 + Artifact/Inspector + store 地基)
- Create: `packages/desktop/src/renderer/repositories/MessageRepository.ts` — 接口 + thin IPC adapter 实现
- Create: `packages/desktop/src/renderer/stores/message.ts` — 稳定消息流,经 repo 工作
- Create: `packages/desktop/src/renderer/stores/stream.ts` — 临时流式态,经 repo 的 subscribeStream
- Create: `packages/desktop/src/renderer/stores/artifact.ts` — `artifacts: computed`,从 messageStore 派生
- Create: `packages/desktop/src/renderer/artifacts/artifactRegistry.ts` — registry + `ArtifactType`/`ArtifactInstance`/`ArtifactRenderer` 类型(预留 `groupId`/`groupable`/`groupBy`)
- Create: `packages/desktop/src/renderer/artifacts/renderers/diffRenderer.ts` — diff renderer 注册项
- Create: `packages/desktop/src/renderer/artifacts/renderers/todoRenderer.ts` — todo renderer 注册项
- Create: `packages/desktop/src/renderer/components/chat/ChatView.vue` — 容器(顶部条 + 时间线 + Composer + 右侧面板)
- Create: `packages/desktop/src/renderer/components/chat/ChatHeader.vue` — 会话标题 + ⋯菜单
- Create: `packages/desktop/src/renderer/components/chat/ChatTimeline.vue` — 取代现有 `ChatTimeline.vue`,B 折叠规则,抽子组件
- Create: `packages/desktop/src/renderer/components/chat/MessageUser.vue`
- Create: `packages/desktop/src/renderer/components/chat/MessageAssistant.vue`
- Create: `packages/desktop/src/renderer/components/chat/ReasoningBlock.vue`
- Create: `packages/desktop/src/renderer/components/chat/ToolCallBlock.vue`
- Create: `packages/desktop/src/renderer/components/chat/CodeBlock.vue` — Shiki 封装
- Create: `packages/desktop/src/renderer/components/artifacts/ArtifactPanel.vue` — 右侧面板容器,组合 Artifact 区 + Inspector 区
- Create: `packages/desktop/src/renderer/components/artifacts/DiffView.vue` — diff renderer 渲染组件
- Create: `packages/desktop/src/renderer/components/artifacts/TodoView.vue` — todo renderer 渲染组件
- Create: `packages/desktop/src/renderer/components/artifacts/Inspector.vue` — 下层 Inspector
- Create: `packages/desktop/src/renderer/components/__tests__/ArtifactPanel.test.ts` — 自动展开规则 + hasUserClosedArtifactPanel 测
- Create: `packages/desktop/src/renderer/stores/__tests__/message.test.ts`、`stream.test.ts`、`artifact.test.ts`
- Modify: `packages/desktop/src/renderer/stores/session.ts` — 剥离 messages/streamingMessage/sendMessage/setupStreamListeners 到新 store;sessionStore 只留会话元信息与列表
- Modify: `packages/desktop/src/renderer/App.vue` — `view = "chat"` 时渲染 `ChatView`
- Modify: `packages/desktop/package.json` — 加 `shiki` 依赖
- Rewrite: `packages/desktop/src/renderer/__tests__/stores/session.test.ts` — 重写脱节 mock

### 阶段 4(Composer 增强)
- Create: `packages/desktop/src/renderer/composer/sessionOptionsRegistry.ts` — `SessionOption`/`SessionOptionKey` 类型 + 注册表
- Create: `packages/desktop/src/renderer/components/composer/Composer.vue` — 容器(取代现有)
- Create: `packages/desktop/src/renderer/components/composer/ComposerInput.vue` — 多行自适应 + 斜杠命令触发 + 历史回溯
- Create: `packages/desktop/src/renderer/components/composer/AttachmentBar.vue` — chip 行
- Create: `packages/desktop/src/renderer/components/composer/AttachmentButton.vue` — `+` 菜单(提及文件/添加附件)
- Create: `packages/desktop/src/renderer/components/composer/AtFilePicker.vue`
- Create: `packages/desktop/src/renderer/components/composer/SlashCommandMenu.vue`
- Create: `packages/desktop/src/renderer/components/composer/SessionOptions.vue` — 按 registry 渲染 model+mode 下拉
- Create: `packages/desktop/src/renderer/components/composer/ComposerToolbar.vue` — 底部一行
- Create: `packages/desktop/src/renderer/components/composer/__tests__/*.test.ts` — SessionOptions registry、历史回溯、斜杠菜单测
- Modify: `packages/desktop/src/main/ipc/handlers-session.ts` — `SESSION_PROMPT` 透传 `mode` 进 prompt 选项(若 core /session/:id/prompt_async 接收 agent 模板参数,见探查)

### 阶段 5(Skills/MCP 管理视图)
- Create: `packages/desktop/src/renderer/components/skills/SkillView.vue` — 全宽管理列表
- Create: `packages/desktop/src/renderer/components/skills/SkillCard.vue`
- Create: `packages/desktop/src/renderer/components/skills/SkillCreateDialog.vue` — 选目录 + usage + 预填 skill-creator 提示词建新 chat 会话
- Create: `packages/desktop/src/renderer/components/mcp/McpView.vue`
- Create: `packages/desktop/src/renderer/components/mcp/McpCard.vue`
- Create: `packages/desktop/src/renderer/components/mcp/McpAddDialog.vue`
- Create: `packages/desktop/src/renderer/stores/skill.ts` — list + 启用切换(走现有 config read/write,见探查:skill 经 plugin/config 注册)
- Create: `packages/desktop/src/renderer/stores/mcp.ts`
- Create: `packages/desktop/src/data/skillCreatorPrompt.ts` — 预置 skill-creator 提示词常量(来源 anthropics/skills)
- Modify: `packages/desktop/src/main/ipc/channels.ts`、`types/ipc.ts` — 加 `SKILL_LIST`、`SKILL_TOGGLE`、`MCP_LIST`、`MCP_RECONNECT`、`MCP_ADD`(均走桌面侧 config 文件读改写,不新增 core 路由)
- Modify: `packages/desktop/src/main/ipc/guards.ts` — 不动 resolveWithinWorkspace,新通道单独加白名单到 `ALLOWED_CHANNELS`
- Modify: `packages/desktop/src/preload/api.ts` — 加 `skill.*`、`mcp.*` namespace
- Modify: `packages/desktop/src/main/ipc/handlers.ts` — 注册新 handler 模块
- Create: `packages/desktop/src/main/ipc/handlers-skill.ts`、`handlers-mcp.ts`

### 阶段 6(Settings 细化)
- Create: `packages/desktop/src/renderer/components/settings/SettingsView.vue` — 主区容器,按 settingsSection 渲染
- Create: `packages/desktop/src/renderer/components/settings/SettingsAppearance.vue`
- Create: `packages/desktop/src/renderer/components/settings/SettingsModels.vue`
- Create: `packages/desktop/src/renderer/components/settings/SettingsShortcuts.vue`
- Create: `packages/desktop/src/renderer/components/settings/SettingsAbout.vue`
- Create: `packages/desktop/src/renderer/components/settings/ConfigSelect.vue` — 可复用配置项下拉
- Modify: `packages/desktop/src/main/ipc/guards.ts` — `ALLOWED_CONFIG_KEYS` 扩白名单: `fontSize`/`fontFamily`/`monoFontFamily`/`codeTheme`/`resetPerSession`(已有 `theme`/`defaultModel`)
- Modify: `packages/desktop/src/main/ipc/channels.ts` — 加 `SESSION_CLEAR_ALL`(批量删除)
- Modify: `packages/desktop/src/renderer/stores/session.ts` — `clearAll` action 调新通道

### 阶段 7(双主题后置)
- Modify: `packages/desktop/src/renderer/styles/global.css` — 暖 accent 替换 indigo 为 amber(`#f59e0b` 系);加亮色变量集 `:root:not(.dark)`/`:root.light` 套
- Modify: `packages/desktop/tailwind.config.js` — accent 同步暖色(保留 v3 风格 config 与 v4 `@theme` 并存现状)
- Modify: `packages/desktop/src/renderer/components/settings/SettingsAppearance.vue` — 主题切换 UI(`theme: 'dark'|'light'` → `document.documentElement.classList.toggle('dark')`)
- Modify: `packages/desktop/src/renderer/artifacts/renderers/*.ts` 或 layout — 确保 Shiki 跟随 `codeTheme` 配置(dark/light 两个 Shiki theme)
- Create: `packages/desktop/src/renderer/composables/useTheme.ts` — 应用 theme 配置到 documentElement class + Shiki theme
- Modify: `packages/desktop/src/main/ipc/handlers-config.ts` — `theme` 已在白名单,确认 set 即可触发 renderer 应用

---

## 阶段 1 — UI Store + View 状态机骨架

### Task 1.1: 创建 uiStore

**Files:**
- Create: `packages/desktop/src/renderer/stores/ui.ts`
- Test: `packages/desktop/src/renderer/stores/__tests__/ui.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/desktop/src/renderer/stores/__tests__/ui.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '../ui'

describe('uiStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts in welcome when no prior view set', () => {
    const ui = useUiStore()
    expect(ui.view).toBe('welcome')
    expect(ui.previousView).toBe('welcome')
    expect(ui.settingsSection).toBe('appearance')
    expect(ui.artifactPanelOpen).toBe(false)
    expect(ui.hasUserClosedArtifactPanel).toBe(false)
    expect(ui.inspectorOpen).toBe(true)
    expect(ui.activeToolCallId).toBeNull()
  })

  it('enterSettings / exitSettings 借 previousView 还原 view', () => {
    const ui = useUiStore()
    ui.view = 'chat'
    ui.enterSettings()
    expect(ui.view).toBe('settings')
    expect(ui.previousView).toBe('chat')
    ui.exitSettings()
    expect(ui.view).toBe('chat')
    // 再次从 skills 进 settings,退出回 skills(不是默认 chat)
    ui.view = 'skills'
    ui.enterSettings()
    ui.exitSettings()
    expect(ui.view).toBe('skills')
  })

  it('setView 切主区视图,不污染 previousView(scene: 非设置态下导航)', () => {
    const ui = useUiStore()
    ui.setView('chat')
    expect(ui.view).toBe('chat')
    expect(ui.previousView).toBe('welcome')  // setView 不动 previousView,只在 enterSettings 时记录
    ui.setView('skills')
    expect(ui.view).toBe('skills')
    expect(ui.previousView).toBe('welcome')
  })

  it('toggleSidebar 后再开,持久 previousView 不变', () => {
    const ui = useUiStore()
    ui.setView('chat')
    ui.toggleSidebar()
    expect(ui.sidebarOpen).toBe(false)
    ui.toggleSidebar()
    expect(ui.sidebarOpen).toBe(true)
    // sidebar 是独立 UI 态,不动 view/previousView
    expect(ui.view).toBe('chat')
  })

  it('closeArtifactPanel 提示用户主动关后,压制未来自动展开', () => {
    const ui = useUiStore()
    ui.openArtifactPanelAutomatically()   // 首次 0→>0 触发
    expect(ui.artifactPanelOpen).toBe(true)
    ui.closeArtifactPanel()                // 用户主动收起
    expect(ui.artifactPanelOpen).toBe(false)
    expect(ui.hasUserClosedArtifactPanel).toBe(true)
    ui.openArtifactPanelAutomatically()   // 再次触发但被压制
    expect(ui.artifactPanelOpen).toBe(false)
    ui.openArtifactPanel()                 // 用户主动唤回
    expect(ui.artifactPanelOpen).toBe(true)
    expect(ui.hasUserClosedArtifactPanel).toBe(false)
  })

  it('resetForSession 切会话清锁,恢复自动展开默认', () => {
    const ui = useUiStore()
    ui.closeArtifactPanel()
    ui.resetForSession()
    expect(ui.hasUserClosedArtifactPanel).toBe(false)
    expect(ui.activeToolCallId).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd packages/desktop && npx vitest run src/renderer/stores/__tests__/ui.test.ts`
Expected: FAIL, `useUiStore` 未定义 / 模块找不到

- [ ] **Step 3: 写最小实现 `ui.ts`**

```ts
// packages/desktop/src/renderer/stores/ui.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type View = 'welcome' | 'chat' | 'skills' | 'mcp' | 'settings'
export type SettingsSection = 'appearance' | 'models' | 'shortcuts' | 'about'

export const useUiStore = defineStore('ui', () => {
  // 单一 source of truth: view. previousView 仅在进/出 settings 时记/读
  const view = ref<View>('welcome')
  const previousView = ref<View>('welcome')
  const settingsSection = ref<SettingsSection>('appearance')

  // 面板与导航 UI 态(均不污染 view 语义)
  const sidebarOpen = ref(true)
  const artifactPanelOpen = ref(false)
  const hasUserClosedArtifactPanel = ref(false)
  const inspectorOpen = ref(true)
  const activeToolCallId = ref<string | null>(null)

  function setView(v: View) {
    // setView 用于导航切主区视图(非 settings 进出);不动 previousView
    view.value = v
  }

  function enterSettings() {
    if (view.value === 'settings') return
    previousView.value = view.value
    view.value = 'settings'
  }

  function exitSettings() {
    if (view.value !== 'settings') return
    view.value = previousView.value
    // 出 settings 时若 previousView 已被改到 settings(异常态), 回退 welcome
    if (view.value === 'settings') view.value = 'welcome'
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  // 产物面板自动展开规则: 由 artifact store 调用"在 artifacts.length 0→>0 边界"
  // 只在 !hasUserClosedArtifactPanel 时真正开,否则无效
  function openArtifactPanelAutomatically() {
    if (hasUserClosedArtifactPanel.value) return
    artifactPanelOpen.value = true
  }

  // 用户主动收起 → 置 hasUserClosedArtifactPanel,压制未来自动展开
  function closeArtifactPanel() {
    artifactPanelOpen.value = false
    hasUserClosedArtifactPanel.value = true
  }

  // 用户主动唤回 → 清回 false
  function openArtifactPanel() {
    artifactPanelOpen.value = true
    hasUserClosedArtifactPanel.value = false
  }

  // 用户单独收起 Inspector(上层 Artifact 区不动)
  function toggleInspector() {
    inspectorOpen.value = !inspectorOpen.value
  }

  // 切会话时调用: 重置面板态(回到默认自动展开 + 无选中)
  function resetForSession() {
    hasUserClosedArtifactPanel.value = false
    artifactPanelOpen.value = false
    activeToolCallId.value = null
    inspectorOpen.value = true
  }

  return {
    view, previousView, settingsSection,
    sidebarOpen, artifactPanelOpen, hasUserClosedArtifactPanel, inspectorOpen, activeToolCallId,
    setView, enterSettings, exitSettings, toggleSidebar,
    openArtifactPanelAutomatically, closeArtifactPanel, openArtifactPanel, toggleInspector,
    resetForSession,
  }
})
```

- [ ] **Step 4: 跑测试看通过**

Run: `cd packages/desktop && npx vitest run src/renderer/stores/__tests__/ui.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/desktop/src/renderer/stores/ui.ts packages/desktop/src/renderer/stores/__tests__/ui.test.ts
git commit -m "feat(desktop/ui): add uiStore with single-source view state machine"
```

### Task 1.2: navigationRegistry

**Files:**
- Create: `packages/desktop/src/renderer/navigation/navigationRegistry.ts`
- Test: `packages/desktop/src/renderer/components/sidebar/__tests__/navigationRegistry.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/desktop/src/renderer/components/sidebar/__tests__/navigationRegistry.test.ts
import { describe, it, expect } from 'vitest'
import { navigationRegistry, getNavigationViewIds, isNavigationView } from '../../navigation/navigationRegistry'

describe('navigationRegistry', () => {
  it('首版注册 skills 与 mcp 两个导航项', () => {
    const ids = getNavigationViewIds()
    expect(ids).toEqual(['skills', 'mcp'])
  })

  it('每个注册项含 id/label/icon/view/order', () => {
    for (const item of navigationRegistry) {
      expect(item.id).toBeTruthy()
      expect(item.label).toBeTruthy()
      expect(item.icon).toBeTruthy()
      expect(typeof item.view).toBe('string')
      expect(typeof item.order).toBe('number')
    }
  })

  it('isNavigationView 识别 navigation view 与系统 view', () => {
    expect(isNavigationView('skills')).toBe(true)
    expect(isNavigationView('mcp')).toBe(true)
    expect(isNavigationView('chat')).toBe(false)
    expect(isNavigationView('welcome')).toBe(false)
    expect(isNavigationView('settings')).toBe(false)
  })

  it('getNavigationViewIds 已按 order 升序', () => {
    const ids = getNavigationViewIds()
    const orders = ids.map(id => navigationRegistry.find(i => i.id === id)!.order)
    expect(orders).toEqual([...orders].sort((a,b) => a - b))
  })
})
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd packages/desktop && npx vitest run src/renderer/components/sidebar/__tests__/navigationRegistry.test.ts`
Expected: FAIL, 模块找不到

- [ ] **Step 3: 写实现**

```ts
// packages/desktop/src/renderer/navigation/navigationRegistry.ts
// 首版注册 skills / mcp。未来加 memory/agents/prompts 仅在此 push 一项。
import type { View } from '../stores/ui'

export interface NavigationItem {
  id:    string
  label: string
  icon:  string         // icon 组件名或 svg path,见 SidebarHeader
  view:  Exclude<View, 'welcome' | 'chat' | 'settings'>
  order: number
}

// 首版注册两项。registry 顺序由 order 决定(SidebarHeader 渲染时排序)
export const navigationRegistry: NavigationItem[] = [
  { id: 'skills', label: 'Skills', icon: 'sparkles', view: 'skills', order: 10 },
  { id: 'mcp',    label: 'MCP',    icon: 'bolt',     view: 'mcp',    order: 20 },
]

export function getNavigationViewIds(): string[] {
  return [...navigationRegistry].sort((a, b) => a.order - b.order).map(i => i.id)
}

export function isNavigationView(v: string): boolean {
  return navigationRegistry.some(item => item.view === v)
}
```

- [ ] **Step 4: 跑测试看通过**

Run: `cd packages/desktop && npx vitest run src/renderer/components/sidebar/__tests__/navigationRegistry.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/desktop/src/renderer/navigation/navigationRegistry.ts packages/desktop/src/renderer/components/sidebar/__tests__/navigationRegistry.test.ts
git commit -m "feat(desktop/ui): add navigationRegistry extensible nav items (skills/mcp)"
```

### Task 1.3: useGlobalShortcuts composable

**Files:**
- Create: `packages/desktop/src/renderer/composables/useGlobalShortcuts.ts`

- [ ] **Step 1: 写测试**

```ts
// packages/desktop/src/renderer/composables/__tests__/useGlobalShortcuts.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { useGlobalShortcuts } from '../useGlobalShortcuts'
import { useUiStore } from '../../stores/ui'

const Host = defineComponent({
  setup() { useGlobalShortcuts(); return () => h('div') }
})

function mkEvent(key: string, opts: KeyboardEventInit = {}) {
  return new KeyboardEvent('keydown', { key, bubbles: true, ...opts })
}

describe('useGlobalShortcuts', () => {
  let dispatchOrig: typeof document.dispatchEvent
  beforeEach(() => {
    setActivePinia(createPinia())
    dispatchOrig = document.dispatchEvent.bind(document)
  })
  afterEach(() => { document.dispatchEvent = dispatchOrig })

  it('Ctrl/Cmd+B 切侧栏', () => {
    const ui = useUiStore()
    ui.sidebarOpen = true
    const w = mount(Host)
    document.dispatchEvent(mkEvent('b', { ctrlKey: true }))
    expect(ui.sidebarOpen).toBe(false)
    document.dispatchEvent(mkEvent('b', { metaKey: true }))
    expect(ui.sidebarOpen).toBe(true)
    w.unmount()
  })

  it('Ctrl/Cmd+N 不在本期 hook 内强行绑(避免触发系统新窗口) — 实<App> 层通过 IPC 触发, 此处只校验不抛', () => {
    const w = mount(Host)
    expect(() => document.dispatchEvent(mkEvent('n', { ctrlKey: true }))).not.toThrow()
    w.unmount()
  })
})
```

注: 阶段 1 不绑 `Ctrl+N`(交给 App.vue 在主区有工作区可建时绑,见 Task 1.4),也暂不绑 `Esc` 中断(等 phase 3 streamStore 上线后才有中断动作可触发)。Esc 收起抽屉/产物面板也留 phase 3。

- [ ] **Step 2: 跑测试看失败**

Run: `cd packages/desktop && npx vitest run src/renderer/composables/__tests__/useGlobalShortcuts.test.ts`
Expected: FAIL

- [ ] **Step 3: 写实现**

```ts
// packages/desktop/src/renderer/composables/useGlobalShortcuts.ts
import { onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../stores/ui'

const isMac = navigator.platform.toLowerCase().includes('mac')
const mod = (e: KeyboardEvent) => isMac ? e.metaKey : e.ctrlKey

export function useGlobalShortcuts() {
  const ui = useUiStore()

  const onKey = (e: KeyboardEvent) => {
    // Ctrl/Cmd+B — 切侧栏
    if (mod(e) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault()
      ui.toggleSidebar()
      return
    }
    // 其他快捷键(Esc 中断、Ctrl+N 新会话)留给具体场景所在的组件/store 注册,
    // 因它们依赖的 store(如 messageStore/sessionStore)在阶段 1 尚未落地或尚未持有相关状态
  }

  onMounted(() => document.addEventListener('keydown', onKey))
  onUnmounted(() => document.removeEventListener('keydown', onKey))
}
```

- [ ] **Step 4: 跑测试看通过**

Run: `cd packages/desktop && npx vitest run src/renderer/composables/__tests__/useGlobalShortcuts.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/desktop/src/renderer/composables/useGlobalShortcuts.ts packages/desktop/src/renderer/composables/__tests__/useGlobalShortcuts.test.ts
git commit -m "feat(desktop/ui): useGlobalShortcuts composable (Ctrl+B sidebar toggle)"
```

### Task 1.4: App.vue 按 view 渲染主区(阶段 1 仅 welcome/chat 分支,其它 view 字符串占位)

**Files:**
- Modify: `packages/desktop/src/renderer/App.vue`

- [ ] **Step 1: 阅读现状**

Run: 读 `packages/desktop/src/renderer/App.vue`(128 行),关注 `onMounted`/`v-if="!hasCurrentWorkspace"`/

> App.vue 当前 onMounted(L70-96): setupStreamListeners → loadWorkspaces → 若无 workspace 则 addWorkspace() → 有 current workspace 则 loadConversations(path)。事件 handler 包括 handleNewChat / handleSelectSession / handleSend。
> 阶段 1 目标: 不回归现状的前提下,把 `<main>` 内部改成按 `uiStore.view` 渲染。但其它 view(skills/mcp/settings)对应组件要等 phase 2-6,本步这些 view 占位渲染一段文字即可,顺利贯通 view 状态机骨架。

- [ ] **Step 2: 改 App.vue 引入 uiStore 并按 view 切主区**

替换 App.vue `<script setup>` 与 `<main>` 块以接入 view 状态机。改造内容(局部 patch,不引入未存在组件):

```vue
<!-- packages/desktop/src/renderer/App.vue -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import Sidebar from './components/Sidebar.vue'
import WelcomeView from './components/WelcomeView.vue'
import ChatTimeline from './components/ChatTimeline.vue'   // 阶段 1 暂沿用现有组件, 阶段 3 改为 ChatView
import Composer from './components/Composer.vue'
import { useWorkspaceStore } from './stores/workspace'
import { useSessionStore } from './stores/session'
import { useUiStore } from './stores/ui'
import { useGlobalShortcuts } from './composables/useGlobalShortcuts'

useGlobalShortcuts()

const workspaceStore = useWorkspaceStore()
const sessionStore = useSessionStore()
const ui = useUiStore()
const { hasCurrentWorkspace } = storeToRefs(workspaceStore)

// view 由两件事驱动: ui.view 与 workspace 是否存在。
// 阶段 1: 没有 workspace 时强制 welcome(无论 ui.view);有 workspace 时若 ui.view=welcome 则改 chat
const effectiveView = computed(() => {
  if (!hasCurrentWorkspace.value) return 'welcome'
  if (ui.view === 'welcome') return 'chat'
  return ui.view
})

// 占位渲染(真视图在 phase 2/3/5/6 落地)
const placeholderLabel = computed(() => {
  if (effectiveView.value === 'skills') return 'Skills (phase 5)'
  if (effectiveView.value === 'mcp') return 'MCP (phase 5)'
  if (effectiveView.value === 'settings') return 'Settings (phase 6)'
  return ''
})

// ...
// onMounted / handleNewChat / handleSelectSession / handleSend 保持现状,阶段 3 再迁到 messageStore/streamStore
</script>

<template>
  <div class="app h-screen flex">
    <Sidebar v-show="ui.sidebarOpen"
      @newChat="handleNewChat"
      @selectSession="handleSelectSession"
      @selectWorkspace="handleSelectWorkspace"
      @addWorkspace="handleAddWorkspace" />
    <main class="flex-1 flex flex-col min-w-0">
      <!-- 主区按 view 渲染 -->
      <WelcomeView v-if="effectiveView === 'welcome'" @openFolder="handleAddWorkspace" />
      <template v-else-if="effectiveView === 'chat'">
        <ChatTimeline />
        <Composer @send="handleSend" />
      </template>
      <div v-else class="flex-1 p-6 text-surface-muted">{{ placeholderLabel }}</div>
    </main>
  </div>
</template>
```

要点: Sidebar / ChatTimeline / Composer 仍是现有实现(尚未改),阶段 1 目的是接 uiStore + view 渲染通路,不回归原功能。`handleAddWorkspace` 等沿用原有逻辑。

- [ ] **Step 3: 创建 WelcomeView.vue 占位(避免 import 不存在)**

```vue
<!-- packages/desktop/src/renderer/components/WelcomeView.vue -->
<script setup lang="ts">
defineEmits<{ openFolder: [] }>()
</script>
<template>
  <div class="flex-1 flex flex-col items-center justify-center gap-4 text-surface-muted">
    <div class="text-2xl">还没有 workspace</div>
    <button class="px-4 py-2 rounded bg-accent text-white" @click="$emit('openFolder')">打开目录</button>
  </div>
</template>
```

- [ ] **Step 4: 跑既有测试确认不回归**

Run: `cd packages/desktop && npx vitest run`
Expected: 现有的 `Sidebar.test.ts` 可能因 Sidebar prop/event 变化而 fail——那是 phase 2 的事,见 Task 2.x。本步只要 `ui.test.ts`/`navigationRegistry.test.ts`/`useGlobalShortcuts.test.ts` 通过且 App.vue 能跑起 dev(后述手动检)。如果 Sidebar.test.ts 已 fail,记录但不修(在 Task 2.x 重写)。

- [ ] **Step 5: 手动 dev smoke**

Run(后台 tmux): `tmux new-session -d -s desktop-dev 'bun dev:desktop'`(或仓库内的桌面 dev 命令;按 package.json 的 scripts 实名为 `npm run dev`)
打开后: 初始无 workspace 应显示 WelcomeView;通过现有 Sidebar 完成 openFolder → workspace 出现后主区切 chat 视图。
Stop: `tmux kill-session -t desktop-dev`

- [ ] **Step 6: 提交**

```bash
git add packages/desktop/src/renderer/App.vue packages/desktop/src/renderer/components/WelcomeView.vue
git commit -m "feat(desktop/ui): App.vue renders main area by uiStore.view (welcome/chat/skills/mcp/settings)"
```

---

## 阶段 2 — Sidebar 重组

### Task 2.1: sessionStore 升级 metadata + actions(createSession 用新入参)

**Files:**
- Modify: `packages/desktop/src/renderer/stores/session.ts`
- Modify: `packages/desktop/src/types/ipc.ts`
- Modify: `packages/desktop/src/main/ipc/channels.ts` (加 `SESSION_UPDATE`)
- Modify: `packages/desktop/src/preload/api.ts` (session.update)
- Modify: `packages/desktop/src/main/ipc/handlers-session.ts`
- Test: `packages/desktop/src/renderer/stores/__tests__/session.test.ts`(Rewrite)

- [ ] **Step 1: 写失败测试(重写 mock,用真实 API 名称)**

```ts
// packages/desktop/src/renderer/stores/__tests__/session.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSessionStore } from '../session'

// 真实 preload API 名称(原测试用 sendMessage 是脱节的, 这里按现实 mock)
const mockSession = {
  create: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  prompt: vi.fn(),
  interrupt: vi.fn(),
  onStreamEvent: vi.fn(() => () => {}),
}
vi.stubGlobal('window', { desktop: { session: mockSession } })

describe('sessionStore (phase 2 upgrade)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('createSession 用 primaryWorkspaceId + workspaceIds 入参构造 location', async () => {
    mockSession.create.mockResolvedValue('sess-1')
    mockSession.list.mockResolvedValue([{ id: 'sess-1', title: 'New chat', messages: [], workspaceIds: ['ws-a'], primaryWorkspaceId: 'ws-a' }])
    const s = useSessionStore()
    await s.createSession({ workspaceId: 'ws-a', path: 'C:/repo' })
    expect(mockSession.create).toHaveBeenCalled()
    const location = mockSession.create.mock.calls[0][0]
    // 后端 location 当前是 {directory, workspaceID}(见探查), 这层会映射; 但 metadata 入参由 store 持有:
    expect(s.currentSessionId).toBe('sess-1')
    const conv = s.conversations.find(c => c.id === 'sess-1')!
    expect(conv.primaryWorkspaceId).toBe('ws-a')
    expect(conv.workspaceIds).toEqual(['ws-a'])
  })

  it('createSession 不传 primaryWorkspaceId 时默认取 workspaceId 单挂载', async () => {
    mockSession.create.mockResolvedValue('sess-2')
    mockSession.list.mockResolvedValue([])
    const s = useSessionStore()
    await s.createSession({ workspaceId: 'ws-a', path: 'C:/repo' })
    // 内部 metadata 入参 primaryWorkspaceId === workspaceIds[0]
    const callLoc = mockSession.create.mock.calls[0][0]
    expect(callLoc.workspaceID ?? callLoc.workspaceId).toBe('ws-a')
  })

  it('rename 调 session.update 改 title', async () => {
    mockSession.update.mockResolvedValue(undefined)
    const s = useSessionStore()
    s.conversations = [{ id: 'sess-1', title: 'old', messages: [], primaryWorkspaceId: 'ws-a', workspaceIds: ['ws-a'] }]
    await s.rename('sess-1', 'new title')
    expect(mockSession.update).toHaveBeenCalledWith('sess-1', { title: 'new title' }, 'C:/repo')
    expect(s.conversations[0].title).toBe('new title')
  })

  it('togglePin flips pinned + update', async () => {
    mockSession.update.mockResolvedValue(undefined)
    const s = useSessionStore()
    s.conversations = [{ id: 'sess-1', title: 'old', messages: [], primaryWorkspaceId: 'ws-a', workspaceIds: ['ws-a'], pinned: false }]
    await s.togglePin('sess-1')
    expect(s.conversations[0].pinned).toBe(true)
    expect(mockSession.update).toHaveBeenCalledWith('sess-1', { pinned: true }, 'C:/repo')
  })

  it('clearAll 删当前 workspace 所有的 sessions', async () => {
    mockSession.delete.mockResolvedValue(undefined)
    const s = useSessionStore()
    s.conversations = [
      { id: 'sa', title: '', messages: [], primaryWorkspaceId: 'ws-a', workspaceIds: ['ws-a'] },
      { id: 'sb', title: '', messages: [], primaryWorkspaceId: 'ws-b', workspaceIds: ['ws-b'] },
    ]
    await s.clearAll('ws-a')
    expect(mockSession.delete).toHaveBeenCalledWith('sa', 'C:/repo')
    expect(mockSession.delete).not.toHaveBeenCalledWith('sb', 'C:/repo')
    expect(s.conversations.map(c => c.id)).toEqual(['sb'])
  })
})
```

- [ ] **Step 2: 跑测试看失败** — Expected: FAIL, `session.update` 不存在/`Conversation.workspaceIds` 不存在

- [ ] **Step 3: types/ipc.ts 扩字段 + channels 加 SESSION_UPDATE**

```ts
// packages/desktop/src/types/ipc.ts 修改 Conversation 接口 (近似现状, 在其基础上加)
export interface Conversation {
  id: string
  title: string
  messages: Message[]
  time: { created: Date; updated: Date }
  // 新增 metadata (phase 2):
  primaryWorkspaceId: string
  workspaceIds: string[]
  pinned?: boolean
  options?: Record<string, unknown>     // SessionOptions 容器, phase 4 填充
}

export interface SessionUpdate {
  title?: string
  pinned?: boolean
  options?: Record<string, unknown>
}

// 在 IPC_CHANNELS.session 加:
//   UPDATE: 'session:update',
```

`packages/desktop/src/main/ipc/channels.ts` 的 `IPC_CHANNELS` 对象里 session 子项加 `UPDATE: 'session:update'`。`ALLOWED_CHANNELS` 经 `Object.values` 自动收入,无需单独改白名单 Set。

- [ ] **Step 4: preload + handlers 加 session.update**

`packages/desktop/src/preload/api.ts`:
```ts
// 在 session namespace 加:
update: (sessionID: string, patch: SessionUpdate, directory?: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.SESSION.UPDATE, sessionID, patch, directory),
```

`packages/desktop/src/main/ipc/handlers-session.ts` 加 handler: 转发到 core。core 现有 v1 `/session/:id` 是否支持 PATCH metadata? 探查显示 core 没有元信息 patch 路由,故 phase 2 用**桌面端持久化**策略:
- 在 `workspaces.json` 旁开 `sessions.json`(在 `app.getPath('userData')`),记录 `{sessionId: {title, pinned, options, primaryWorkspaceId, workspaceIds}}` 这类桌面附加 metadata。
- core 维持权威的 session list/title(可能 core 自己也存 title);桌面读取时把 core 的 conversation 与本地 sessions.json merge。
- update 时只写本地 sessions.json。

后端 v1 暂未给 title rename 接口 —— 在 Task 2.1 我们只持久化到本地 sessions.json,`session.update` 不调 core。`preload.session.update` 调 IPC handler 写 sessions.json 后更新 store。

```ts
// handlers-session.ts 加 SESSION_UPDATE handler:
ipcMain.handle(IPC_CHANNELS.SESSION.UPDATE, async (_, sessionID: string, patch: SessionUpdate) => {
  await mergeSessionMeta(sessionID, patch)   // 写 app.getPath('userData')/sessions.json
  return true
})

// 加 SESSION_DELETE 时也清理 sessions.json 对应项(以防 metadata 残留)
```

实现 `mergeSessionMeta` / `removeSessionMeta` 工具(就近放 handlers-session 顶部或新 `session-persistence.ts`):
```ts
// packages/desktop/src/main/ipc/session-persistence.ts
import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

const file = () => join(app.getPath('userData'), 'sessions.json')

export async function readSessionMeta(): Promise<Record<string, any>> {
  try { return JSON.parse(await fs.readFile(file(), 'utf-8')) } catch { return {} }
}
export async function mergeSessionMeta(id: string, patch: any): Promise<void> {
  const all = await readSessionMeta()
  all[id] = { ...(all[id] ?? {}), ...patch }
  await fs.writeFile(file(), JSON.stringify(all, null, 2))
}
export async function removeSessionMeta(id: string): Promise<void> {
  const all = await readSessionMeta()
  delete all[id]
  await fs.writeFile(file(), JSON.stringify(all, null, 2))
}
```

`SESSION_LIST` handler 在返回前 merge:
```ts
// handlers-session.ts SESSION_LIST 改造: 取 core 列表后, 对每条 conversation merge 本地 sessions.json 的 {title?, pinned, primaryWorkspaceId, workspaceIds, options}
const all = await backend.session.list(directory)
const meta = await readSessionMeta()
return all.map(c => ({...c, ...(meta[c.id] ?? {})}))
```

- [ ] **Step 5: 创建 SessionLocationRef 兼容**

`session.ts` 的 `createSession` 入参改用 `{ workspaceId, path }`,内部构造 `LocationRef{directory: path, workspaceID: workspaceId}` 调 `window.desktop.session.create`,拿到 sid 后立刻 `mergeSessionMeta(sid, {primaryWorkspaceId: workspaceId, workspaceIds: [workspaceId]})`,再 `loadConversations`。

- [ ] **Step 6: 重写 session store actions(replace `createSession` 入参 + 加 `rename`/`togglePin`/`clearAll`)**

修改 `packages/desktop/src/renderer/stores/session.ts`:
- 删 `streamingMessage`、`sendMessage`、`setupStreamListeners`(phase 3 迁移)
- `createSession({workspaceId, path})`: 调 create → 写 metadata → loadConversations
- `rename(id, title)`: 调 `window.desktop.session.update(id, {title})` → 改 conversations
- `togglePin(id)`: 调 update `{pinned: !pinned}` → 改 conversations
- `clearAll(workspaceId)`: 找出所有 `primaryWorkspaceId === workspaceId` 的 conversation,逐个调 `delete`,刷新列表

- [ ] **Step 7: 跑测试看通过**

Run: `cd packages/desktop && npx vitest run src/renderer/stores/__tests__/session.test.ts`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add packages/desktop/src/renderer/stores/session.ts packages/desktop/src/types/ipc.ts packages/desktop/src/main/ipc/channels.ts packages/desktop/src/preload/api.ts packages/desktop/src/main/ipc/handlers-session.ts packages/desktop/src/main/ipc/session-persistence.ts packages/desktop/src/renderer/stores/__tests__/session.test.ts
git commit -m "feat(desktop/session): metadata with primaryWorkspaceId+workspaceIds, add rename/pin/clearAll, local sessions.json supplement"
```

### Task 2.2: Sidebar 容器改造 + 子组件拆分

**Files(本 Task 仅拆 SidebarHeader / Footer / Sidebar 主容器不动子项细节)**:
- Create: `packages/desktop/src/renderer/components/sidebar/SidebarHeader.vue`
- Create: `packages/desktop/src/renderer/components/sidebar/SidebarFooter.vue`
- Modify: `packages/desktop/src/renderer/components/Sidebar.vue`

- [ ] **Step 1: 写 SidebarHeader 测试(registry 驱动渲染 + emit select)**

```ts
// packages/desktop/src/renderer/components/sidebar/__tests__/SidebarHeader.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SidebarHeader from '../SidebarHeader.vue'
import { useUiStore } from '../../../stores/ui'

describe('SidebarHeader', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('渲染 navigationRegistry 注册的所有导航按钮', () => {
    const w = mount(SidebarHeader)
    const buttons = w.findAll('button[data-nav-id]')
    expect(buttons.map(b => b.attributes('data-nav-id'))).toEqual(['skills', 'mcp'])
  })

  it('点击导航按钮 emit select-nav 且 payload 为对应 view', async () => {
    const w = mount(SidebarHeader)
    await w.find('button[data-nav-id="skills"]').trigger('click')
    expect(w.emitted('select-nav')).toBeTruthy()
    expect(w.emitted('select-nav')![0]).toEqual(['skills'])
  })

  it('ui.view 是某导航 view 时, 对应按钮高亮', async () => {
    const ui = useUiStore()
    ui.setView('mcp')
    const w = mount(SidebarHeader)
    expect(w.find('button[data-nav-id="mcp"]').classes()).toContain('is-active')
  })
})
```

(注意: import `beforeEach` 或遗漏了,补 `import { beforeEach } from 'vitest'`)

- [ ] **Step 2: 跑测试看失败** — Expected: FAIL, SidebarHeader 不存在

- [ ] **Step 3: 写 SidebarHeader**

```vue
<!-- packages/desktop/src/renderer/components/sidebar/SidebarHeader.vue -->
<script setup lang="ts">
import { useUiStore, type View } from '../../stores/ui'
import { navigationRegistry } from '../../navigation/navigationRegistry'

const ui = useUiStore()
const emit = defineEmits<{ 'select-nav': [view: Exclude<View, 'welcome'|'chat'|'settings'>] }>()

const sorted = [...navigationRegistry].sort((a, b) => a.order - b.order)
function click(item: typeof navigationRegistry[number]) {
  emit('select-nav', item.view)
}
</script>

<template>
  <div class="sidebar-header">
    <div class="brand">[logo]</div>
    <nav class="nav-list">
      <button v-for="item in sorted" :key="item.id"
        :data-nav-id="item.id"
        :class="{ 'is-active': ui.view === item.view }"
        @click="click(item)">
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.is-active { background: var(--color-accent-muted); }
</style>
```

(图标真实组件后期接入 svg icons,phase 2 用占位字符串)

- [ ] **Step 4: 跑测试看通过**

Run: `cd packages/desktop && npx vitest run src/renderer/components/sidebar/__tests__/SidebarHeader.test.ts`
Expected: PASS

- [ ] **Step 5: 写 SidebarFooter + 测试**

```ts
// packages/desktop/src/renderer/components/sidebar/__tests__/SidebarFooter.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SidebarFooter from '../SidebarFooter.vue'
import { useUiStore } from '../../../stores/ui'

describe('SidebarFooter', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('点 ⚙ enterSettings (从非设置态)', async () => {
    const ui = useUiStore(); ui.setView('chat')
    const w = mount(SidebarFooter)
    await w.find('[data-testid="settings-toggle"]').trigger('click')
    expect(ui.view).toBe('settings')
    expect(ui.previousView).toBe('chat')
  })

  it('点 ⚙ again 在设置态 exitSettings', async () => {
    const ui = useUiStore(); ui.setView('chat'); ui.enterSettings()
    const w = mount(SidebarFooter)
    await w.find('[data-testid="settings-toggle"]').trigger('click')
    expect(ui.view).toBe('chat')
  })
})
```

```vue
<!-- packages/desktop/src/renderer/components/sidebar/SidebarFooter.vue -->
<script setup lang="ts">
import { useUiStore } from '../../stores/ui'
import { computed } from 'vue'

const ui = useUiStore()
const inSettings = computed(() => ui.view === 'settings')
function toggle() { inSettings.value ? ui.exitSettings() : ui.enterSettings() }
</script>

<template>
  <div class="sidebar-footer">
    <span>Connected</span>
    <button data-testid="settings-toggle" @click="toggle" :aria-pressed="inSettings">⚙</button>
  </div>
</template>
```

Run test → Expected: PASS

- [ ] **Step 6: 改 Sidebar.vue 容器,组合 SidebarHeader + Footer,本 Task 暂保留中部原内容(Workspaces/Sessions 区改造留 Task 2.3)**

```vue
<!-- packages/desktop/src/renderer/components/Sidebar.vue -->
<script setup lang="ts">
import SidebarHeader from './sidebar/SidebarHeader.vue'
import SidebarFooter from './sidebar/SidebarFooter.vue'
import { useUiStore, type View } from '../stores/ui'
import { useWorkspaceStore } from '../stores/workspace'
import { useSessionStore } from '../stores/session'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

const ui = useUiStore()
const workspaceStore = useWorkspaceStore()
const sessionStore = useSessionStore()
const { currentWorkspace } = storeToRefs(workspaceStore)

const emit = defineEmits<{
  newChat: []
  selectSession: [id: string]
  selectWorkspace: [path: string]
  addWorkspace: []
}>()

function onSelectNav(view: Exclude<View, 'welcome'|'chat'|'settings'>) {
  ui.setView(view)
}
// 其余 emit 维持原 Sidebar handler(handlerNewChat 等),指向 store action
</script>

<template>
  <aside class="sidebar w-sidebar flex flex-col">
    <SidebarHeader @select-nav="onSelectNav" />
    <!-- 中部内容: 暂保留原 Workspaces/Sessions 实现, 在 Task 2.3 替换 -->
    <div class="flex-1 overflow-y-auto">
      <!-- TODO Task 2.3 整合为 SidebarTabs -->
      <div class="sidebar-section" v-if="currentWorkspace">
        <!-- 原会话搜索 + recent 列表 -->
      </div>
    </div>
    <SidebarFooter />
  </aside>
</template>
```

(注: 此 Task Sidebar 中部内容暂保留现有, 不破坏现有 Sidebar.test.ts 测试;但 `Sidebar.test.ts` mock 重写留 Task 2.4)

- [ ] **Step 7: 跑测试看通过 + 手动 smoke**

Run: `cd packages/desktop && npx vitest run`
Run: 启动 dev 手动看 ⚙ toggle 是否正确进出 settings,在设置态时主区是占位 `Settings (phase 6)`

- [ ] **Step 8: 提交**

```bash
git add packages/desktop/src/renderer/components/sidebar/SidebarHeader.vue packages/desktop/src/renderer/components/sidebar/SidebarFooter.vue packages/desktop/src/renderer/components/sidebar/__tests__/SidebarHeader.test.ts packages/desktop/src/renderer/components/sidebar/__tests__/SidebarFooter.test.ts packages/desktop/src/renderer/components/Sidebar.vue
git commit -m "feat(desktop/sidebar): split SidebarHeader (nav registry) + footer (settings toggle); Sidebar becomes container"
```

### Task 2.3: SidebarWorkspaces / SidebarSessions 子组件 + 两 Tab 切换

**Files:**
- Create: `packages/desktop/src/renderer/components/sidebar/SidebarTabs.vue`
- Create: `packages/desktop/src/renderer/components/sidebar/SidebarWorkspaces.vue`
- Create: `packages/desktop/src/renderer/components/sidebar/SidebarSessions.vue`
- Modify: `packages/desktop/src/renderer/components/Sidebar.vue`
- Modify: `packages/desktop/src/renderer/stores/workspace.ts`(`addWorkspace` 显式调 openFolderPicker;`selectWorkspace` emit 已支持)
- Test: 三个组件 + Tab 切换

- [ ] **Step 1: 写 SidebarWorkspaces 测试**

```ts
// packages/desktop/src/renderer/components/sidebar/__tests__/SidebarWorkspaces.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SidebarWorkspaces from '../SidebarWorkspaces.vue'
import { useWorkspaceStore } from '../../../stores/workspace'

const ws = vi.hashedTable?.() // placeholder removed

const mockOpenFolder = vi.fn()
describe('SidebarWorkspaces', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('点 + 触发 addWorkspace (调 openFolderPicker + 写 workspaces.json)', async () => {
    const store = useWorkspaceStore()
    const spy = vi.spyOn(store, 'openFolderPicker').mockResolvedValue('C:/picked')
    const spyAdd = vi.spyOn(store, 'addWorkspace')
    const w = mount(SidebarWorkspaces)
    await w.find('button[data-testid="add-workspace"]').trigger('click')
    expect(spy).toHaveBeenCalled()
    expect(spyAdd).toHaveBeenCalled()
  })

  it('点击 workspace 行触发 selectWorkspace', async () => {
    const store = useWorkspaceStore()
    store.workspaces = [
      { id: 'ws-a', name: 'agent-repo', path: 'C:/repo', lastAccessed: 0 },
      { id: 'ws-b', name: 'website',   path: 'C:/web',  lastAccessed: 1 },
    ]
    const w = mount(SidebarWorkspaces)
    await w.find('button[data-workspace-id="ws-b"]').trigger('click')
    expect(store.currentWorkspace?.id).toBe('ws-b')
  })

  it('当前 workspace 高亮', () => {
    const store = useWorkspaceStore()
    store.workspaces = [{ id: 'ws-a', name: 'x', path: 'C:/x', lastAccessed: 0 }]
    store.currentWorkspace = store.workspaces[0]
    const w = mount(SidebarWorkspaces)
    expect(w.find('button[data-workspace-id="ws-a"]').classes()).toContain('is-current')
  })
})
```

- [ ] **Step 2: 跑看失败**

- [ ] **Step 3: 写 SidebarWorkspaces**

```vue
<!-- packages/desktop/src/renderer/components/sidebar/SidebarWorkspaces.vue -->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useWorkspaceStore } from '../../stores/workspace'

const store = useWorkspaceStore()
const { workspaces, currentWorkspace } = storeToRefs(store)

async function add() {
  const path = await store.openFolderPicker()
  if (path) await store.addWorkspace(path)
}
function select(id: string) {
  const ws = workspaces.value.find(w => w.id === id)
  if (ws) store.selectWorkspace(ws.path)
}
</script>

<template>
  <div class="sidebar-workspaces">
    <ul>
      <li v-for="ws in workspaces" :key="ws.id">
        <button :data-workspace-id="ws.id"
          :class="{ 'is-current': currentWorkspace?.id === ws.id }"
          @click="select(ws.id)">
          {{ ws.name }}
        </button>
      </li>
    </ul>
    <button data-testid="add-workspace" @click="add">+ Add Workspace</button>
  </div>
</template>
<style scoped>
.is-current { font-weight: 600; color: var(--color-accent); }
</style>
```

注: 评审点明确 "+ Add Workspace = openFolderPicker"。`openFolderPicker` 走 desktop IPC `WORKSPACE_OPEN_FOLDER`,main 弹 openDirectory 对话框。

- [ ] **Step 4: 跑测试看通过**

- [ ] **Step 5: 写 SidebarSessions 测试(createSession 不弹目录)**

```ts
// packages/desktop/src/renderer/components/sidebar/__tests__/SidebarSessions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SidebarSessions from '../SidebarSessions.vue'
import { useSessionStore } from '../../../stores/session'
import { useWorkspaceStore } from '../../../stores/workspace'

describe('SidebarSessions', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('点 + New Session 直接 createSession, 不弹目录对话框', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [{ id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: 0 }]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    const spy = vi.spyOn(s, 'createSession').mockResolvedValue()
    const w = mount(SidebarSessions)
    await w.find('button[data-testid="new-session"]').trigger('click')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 'ws-a', path: 'C:/repo' }))
  })

  it('只显示当前 workspace 的会话 (filter primaryWorkspaceId)', () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [{ id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: 0 }]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    s.conversations = [
      { id: '1', title: 'A', messages: [], primaryWorkspaceId: 'ws-a', workspaceIds: ['ws-a'] },
      { id: '2', title: 'B', messages: [], primaryWorkspaceId: 'ws-b', workspaceIds: ['ws-b'] },
    ]
    const w = mount(SidebarSessions)
    expect(w.findAll('button[data-session-id]').map(b => b.attributes('data-session-id'))).toEqual(['1'])
  })

  it('搜索框过滤标题', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [{ id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: 0 }]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    s.conversations = [
      { id: '1', title: 'Migrate auth', messages: [], primaryWorkspaceId: 'ws-a', workspaceIds: ['ws-a'] },
      { id: '2', title: 'Fix db',       messages: [], primaryWorkspaceId: 'ws-a', workspaceIds: ['ws-a'] },
    ]
    const w = mount(SidebarSessions)
    await w.find('input[data-testid="search"]').setValue('auth')
    expect(w.findAll('button[data-session-id]').map(b => b.attributes('data-session-id'))).toEqual(['1'])
  })
})
```

- [ ] **Step 6: 跑看失败**

- [ ] **Step 7: 写 SidebarSessions**

```vue
<!-- packages/desktop/src/renderer/components/sidebar/SidebarSessions.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '../../stores/session'
import { useWorkspaceStore } from '../../stores/workspace'
import { useUiStore } from '../../stores/ui'

const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const ui = useUiStore()
const { conversations } = storeToRefs(sessionStore)
const { currentWorkspace } = storeToRefs(workspaceStore)

const search = ref('')
const filtered = computed(() => {
  const cid = currentWorkspace.value?.id
  return conversations.value
    .filter(c => c.primaryWorkspaceId === cid)
    .filter(c => c.title.toLowerCase().includes(search.value.toLowerCase()))
})

async function newSession() {
  const ws = currentWorkspace.value
  if (!ws) return
  await sessionStore.createSession({ workspaceId: ws.id, path: ws.path })
  ui.setView('chat')
}
function select(id: string) { ui.setView('chat'); /* 实际选会话 + 加载消息 phase 3 在 messageStore 落 */ }
</script>

<template>
  <div class="sidebar-sessions">
    <input data-testid="search" v-model="search" placeholder="搜索会话…" />
    <ul>
      <li v-for="c in filtered" :key="c.id">
        <button :data-session-id="c.id" @click="select(c.id)">{{ c.title }}</button>
      </li>
    </ul>
    <button data-testid="new-session" @click="newSession">+ New Session</button>
  </div>
</template>
```

- [ ] **Step 8: 跑看通过**

- [ ] **Step 9: 写 SidebarTabs(Workspaces/当前目录切换壳)**

```vue
<!-- packages/desktop/src/renderer/components/sidebar/SidebarTabs.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import SidebarWorkspaces from './SidebarWorkspaces.vue'
import SidebarSessions from './SidebarSessions.vue'
import { useWorkspaceStore } from '../../stores/workspace'
import { storeToRefs } from 'pinia'

const workspace = useWorkspaceStore()
const { currentWorkspace } = storeToRefs(workspace)
const tab = ref<'workspaces' | 'sessions'>('workspaces')
</script>

<template>
  <div class="sidebar-tabs">
    <div class="tab-row">
      <button :class="{ 'is-active': tab==='workspaces' }" @click="tab='workspaces'">Workspaces</button>
      <button :class="{ 'is-active': tab==='sessions' }"
        :disabled="!currentWorkspace"
        @click="tab='sessions'">
        当前目录<span v-if="currentWorkspace">({{ currentWorkspace.name }})</span>
      </button>
    </div>
    <SidebarWorkspaces v-if="tab==='workspaces'" />
    <SidebarSessions v-else />
  </div>
</template>
<style scoped>
.is-active { border-bottom: 2px solid var(--color-accent); }
</style>
```

- [ ] **Step 10: 把 Sidebar.vue 中部接入 SidebarTabs**

把 Task 2.2 的 `<!-- TODO Task 2.3 整合为 SidebarTabs -->` 替换为 `<SidebarTabs />` + import。

- [ ] **Step 11: 跑所有测试 + 手动 smoke** — 通过

- [ ] **Step 12: 提交**

```bash
git add packages/desktop/src/renderer/components/sidebar/SidebarTabs.vue packages/desktop/src/renderer/components/sidebar/SidebarWorkspaces.vue packages/desktop/src/renderer/components/sidebar/SidebarSessions.vue packages/desktop/src/renderer/components/sidebar/__tests__/*.test.ts packages/desktop/src/renderer/components/Sidebar.vue
git commit -m "feat(desktop/sidebar): workspaces/sessions tab split, distinct + semantics (folderPicker vs createSession)"
```

### Task 2.4: SettingsNav + 设置态侧栏内容切换

**Files:**
- Create: `packages/desktop/src/renderer/components/sidebar/SettingsNav.vue`
- Modify: `packages/desktop/src/renderer/components/Sidebar.vue` — 按 `ui.view === 'settings'` 渲染 SettingsNav(否则正常态)
- Test: SettingsNav 测

- [ ] **Step 1: 写测试**

```ts
// packages/desktop/src/renderer/components/sidebar/__tests__/SettingsNav.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SettingsNav from '../SettingsNav.vue'
import { useUiStore } from '../../../stores/ui'

describe('SettingsNav', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('渲染 4 个设置项', () => {
    const w = mount(SettingsNav)
    expect(w.findAll('button[data-settings-section]').map(b => b.attributes('data-settings-section')))
      .toEqual(['appearance', 'models', 'shortcuts', 'about'])
  })

  it('点设置项设 uiStore.settingsSection, 不动 view (仍是 settings)', async () => {
    const ui = useUiStore(); ui.setView('chat'); ui.enterSettings()
    const w = mount(SettingsNav)
    await w.find('button[data-settings-section="models"]').trigger('click')
    expect(ui.settingsSection).toBe('models')
    expect(ui.view).toBe('settings')
  })

  it(' ← 返回 exitSettings', async () => {
    const ui = useUiStore(); ui.setView('chat'); ui.enterSettings()
    const w = mount(SettingsNav)
    await w.find('button[data-testid="back"]').trigger('click')
    expect(ui.view).toBe('chat')
  })
})
```

- [ ] **Step 2: 跑看失败**

- [ ] **Step 3: 写 SettingsNav.vue**

```vue
<!-- packages/desktop/src/renderer/components/sidebar/SettingsNav.vue -->
<script setup lang="ts">
import { useUiStore, type SettingsSection } from '../../stores/ui'

const ui = useUiStore()
const sections: SettingsSection[] = ['appearance', 'models', 'shortcuts', 'about']
</script>
<template>
  <div class="settings-nav">
    <button data-testid="back" @click="ui.exitSettings()">← 返回</button>
    <ul>
      <li v-for="sec in sections" :key="sec">
        <button :data-settings-section="sec"
          :class="{ 'is-active': ui.settingsSection === sec }"
          @click="ui.settingsSection = sec">{{ sec }}</button>
      </li>
    </ul>
  </div>
</template>
<style scoped>.is-active { color: var(--color-accent); }</style>
```

- [ ] **Step 4: 改 Sidebar.vue 按 view 切内容**

```vue
<!-- Sidebar.vue 改造片段 -->
<template>
  <aside class="sidebar w-sidebar flex flex-col">
    <!-- logo 始终在最上 -->
    <div class="brand">[logo]</div>

    <div class="flex-1 overflow-y-auto">
      <!-- 设置态 -->
      <SettingsNav v-if="ui.view === 'settings'" />
      <!-- 正常态 -->
      <template v-else>
        <SidebarHeader @select-nav="onSelectNav" />
        <SidebarTabs />
      </template>
    </div>

    <SidebarFooter />
  </aside>
</template>
```

注: SettingsNav 不再 "导航按钮区"(那是正常态 SidebarHeader);设置态完全替换中部为 settings 列表。SidebarHeader(导航)只正常态出现。Footer 在两态都常驻,因 `⚙` toggle 需在设置态也能点(用于退出)。

- [ ] **Step 5: 跑测试看通过 + 手动验证 ⚙ 进出 settings 时左栏切换**

- [ ] **Step 6: 提交**

```bash
git add packages/desktop/src/renderer/components/sidebar/SettingsNav.vue packages/desktop/src/renderer/components/sidebar/__tests__/SettingsNav.test.ts packages/desktop/src/renderer/components/Sidebar.vue
git commit -m "feat(desktop/sidebar): settings nav replaces sidebar content in settings view"
```

### Task 2.5: 删除/重写原 Sidebar.test.ts 脱节测试

**Files:**
- Modify/Rewrite: `packages/desktop/src/renderer/__tests__/components/Sidebar.test.ts`

- [ ] **Step 1: 删旧测试文件,或重写为容器测试**

由于 Sidebar 已容器化、原 props/events 已变,原测试与新结构不兼容。保守做法: 删除旧文件(已落到子组件测覆盖核心行为)。

```bash
rm packages/desktop/src/renderer/__tests__/components/Sidebar.test.ts
rmdir packages/desktop/src/renderer/__tests__/components 2>/dev/null || true
```

- [ ] **Step 2: 跑全部测试** — Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add -A packages/desktop/src/renderer/__tests__/components
git commit -m "test(desktop): remove obsolete Sidebar.test.ts (split into sidebar/* tests)"
```

---

## 阶段 3 — Chat 双栏 + Artifact/Inspector + store 地基

### Task 3.1: MessageRepository 接口 + thin IPC adapter

**Files:**
- Create: `packages/desktop/src/renderer/repositories/MessageRepository.ts`
- Test: `packages/desktop/src/renderer/repositories/__tests__/MessageRepository.test.ts`

- [ ] **Step 1: 写测试**

```ts
// packages/desktop/src/renderer/repositories/__tests__/MessageRepository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createIpcMessageRepository } from '../MessageRepository'

const mockSession = {
  messages: vi.fn(),
  prompt: vi.fn(),
  interrupt: vi.fn(),
  onStreamEvent: vi.fn(),
  delete: vi.fn(),
}
vi.stubGlobal('window', { desktop: { session: mockSession } })

describe('MessageRepository (thin IPC adapter)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loadMessages 调 session.messages', async () => {
    mockSession.messages.mockResolvedValue([{ role: 'user', content: 'hi' }])
    const repo = createIpcMessageRepository()
    const out = await repo.loadMessages('sess-1')
    expect(mockSession.messages).toHaveBeenCalledWith('sess-1')
    expect(out).toEqual([{ role: 'user', content: 'hi' }])
  })

  it('subscribeStream 注册 onStreamEvent 回调返回 unsubscribe', () => {
    const unsub = () => {}
    mockSession.onStreamEvent.mockReturnValue(unsub)
    const repo = createIpcMessageRepository()
    const cb = vi.fn()
    const u = repo.subscribeStream('sess-1', cb)
    expect(mockSession.onStreamEvent).toHaveBeenCalled()
    expect(u).toBe(unsub)
  })

  it('interrupt 调 session.interrupt', async () => {
    const repo = createIpcMessageRepository()
    await repo.interrupt('sess-1')
    expect(mockSession.interrupt).toHaveBeenCalledWith('sess-1')
  })
})
```

- [ ] **Step 2: 跑看失败**

- [ ] **Step 3: 写实现**

```ts
// packages/desktop/src/renderer/repositories/MessageRepository.ts
// 薄薄一层 IPC adapter, store 不直接 import preload/IPC, 只经接口 — 为日后切 SQLite/远程留路。

export interface StreamEvent { type: 'message' | 'complete' | 'tool' | 'reasoning'; message?: any; toolCall?: any; }
export type StreamHandler = (e: StreamEvent) => void
export type Unsubscribe = () => void

export interface MessageRepository {
  loadMessages(sessionId: string, directory?: string): Promise<any[]>
  subscribeStream(sessionId: string, handler: StreamHandler): Unsubscribe
  prompt(sessionId: string, prompt: any[], directory?: string): Promise<boolean>
  interrupt(sessionId: string): Promise<void>
  deleteMessage(sessionId: string): Promise<boolean>   // 删会话等同清空
}

import type { desktopAPI } from '../../preload/api'
declare global { interface Window { desktop: typeof desktopAPI } }

// thin IPC adapter: 直接转发现有 preload.session.*
export function createIpcMessageRepository(): MessageRepository {
  return {
    loadMessages: (sessionId, directory) => window.desktop.session.messages(sessionId, undefined, directory),
    subscribeStream: (sessionId, handler) => {
      return window.desktop.session.onStreamEvent((e: any) => {
        // e === {sessionID, event}; handler 收 event
        handler(e.event as StreamEvent)
      })
    },
    prompt: (sessionId, prompt, directory) => window.desktop.session.prompt(sessionId, prompt, directory),
    interrupt: (sessionId) => window.desktop.session.interrupt(sessionId) as Promise<any>,
    deleteMessage: (sessionId) => window.desktop.session.delete(sessionId) as Promise<boolean>,
  }
}
```

- [ ] **Step 4: 跑看通过**

- [ ] **Step 5: 提交**

```bash
git add packages/desktop/src/renderer/repositories/MessageRepository.ts packages/desktop/src/renderer/repositories/__tests__/MessageRepository.test.ts
git commit -m "feat(desktop/repo): MessageRepository thin adapter over preload.session.*"
```

### Task 3.2: messageStore(稳定消息流)

**Files:**
- Create: `packages/desktop/src/renderer/stores/message.ts`
- Test: `packages/desktop/src/renderer/stores/__tests__/message.test.ts`

- [ ] **Step 1: 写测试**

```ts
// packages/desktop/src/renderer/stores/__tests__/message.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMessageStore } from '../message'
import type { MessageRepository } from '../../repositories/MessageRepository'

function mkRepo(): MessageRepository {
  return {
    loadMessages: vi.fn().mockResolvedValue([{ id: 'm1', role: 'assistant', content: 'hi' }]),
    subscribeStream: vi.fn(),
    prompt: vi.fn(),
    interrupt: vi.fn(),
    deleteMessage: vi.fn(),
  }
}

describe('messageStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('load 设置 messages 与 sessionId', async () => {
    const repo = mkRepo()
    const m = useMessageStore(repo)
    await m.load('sess-1', 'C:/repo')
    expect(repo.loadMessages).toHaveBeenCalledWith('sess-1', 'C:/repo')
    expect(m.messages.length).toBe(1)
    expect(m.sessionId).toBe('sess-1')
    expect(m.directory).toBe('C:/repo')
  })

  it('clear 清空 messages 与 sessionId', () => {
    const m = useMessageStore(mkRepo())
    m.messages = [{ id: 'x', role: 'user', content: 'x' }] as any
    m.clear()
    expect(m.messages).toEqual([])
    expect(m.sessionId).toBeNull()
  })

  it('appendMessage 追加稳定消息 (流式完成时调)', () => {
    const m = useMessageStore(mkRepo())
    m.appendMessage({ id: 'a', role: 'assistant', content: 'done' } as any)
    expect(m.messages.length).toBe(1)
    expect(m.messages[0]).toMatchObject({ id: 'a' })
  })
})
```

- [ ] **Step 2: 跑看失败**

- [ ] **Step 3: 写实现**

```ts
// packages/desktop/src/renderer/stores/message.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MessageRepository } from '../repositories/MessageRepository'

export const useMessageStore = (repo: MessageRepository) => defineStore('message', () => {
  const messages = ref<any[]>([])
  const sessionId = ref<string | null>(null)
  const directory = ref<string | undefined>(undefined)

  async function load(sid: string, dir?: string) {
    sessionId.value = sid
    directory.value = dir
    const list = await repo.loadMessages(sid, dir)
    messages.value = list
  }
  function clear() {
    messages.value = []
    sessionId.value = null
    directory.value = undefined
  }
  function appendMessage(msg: any) {
    messages.value.push(msg)
  }
  return { messages, sessionId, directory, load, clear, appendMessage }
})()
```

注: store 因依赖注入 repo 采用工厂模式。**应用启动时在 `main.ts` 创建 repo 实例并注入所有依赖 store**(后续 streamStore/artifactStore 同样经 repo)。

- [ ] **Step 4: 跑看通过**

- [ ] **Step 5: 提交**

```bash
git add packages/desktop/src/renderer/stores/message.ts packages/desktop/src/renderer/stores/__tests__/message.test.ts
git commit -m "feat(desktop/store): messageStore (stable message stream, repo-backed)"
```

### Task 3.3: streamStore(临时流式态)

**Files:**
- Create: `packages/desktop/src/renderer/stores/stream.ts`
- Test: `packages/desktop/src/renderer/stores/__tests__/stream.test.ts`

- [ ] **Step 1: 写测试**

```ts
// packages/desktop/src/renderer/stores/__tests__/stream.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStreamStore } from '../stream'
import { useMessageStore } from '../message'
import type { MessageRepository } from '../../repositories/MessageRepository'

function mkRepo() {
  return {
    loadMessages: vi.fn().mockResolvedValue([]),
    subscribeStream: vi.fn(),
    prompt: vi.fn().mockResolvedValue(true),
    interrupt: vi.fn(),
    deleteMessage: vi.fn(),
  }
}

describe('streamStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('start 流式期间 streamingMessage 持续以最新 event 覆盖', async () => {
    const repo = mkRepo()
    let emitHandler: ((e: any) => void) | null = null
    repo.subscribeStream.mockImplementation((_sid: string, h: (e: any) => void) => {
      emitHandler = h
      return () => { emitHandler = null }
    })
    const message = useMessageStore(repo)
    const s = useStreamStore(repo, message)
    s.start('sess-1', 'C:/repo')
    // 模拟两条 message 事件
    emitHandler!({ type: 'message', message: { id: 'm1', content: 'hello' } })
    expect(s.streamingMessage?.content).toBe('hello')
    emitHandler!({ type: 'message', message: { id: 'm1', content: 'hello world' } })
    expect(s.streamingMessage?.content).toBe('hello world')
    // 完成
    emitHandler!({ type: 'complete' })
    expect(s.streamingMessage).toBeNull()
    expect(message.messages.some(m => m.content === 'hello world')).toBe(true)
  })

  it('interrupt 中断未完成流, 清 streamingMessage', async () => {
    const repo = mkRepo()
    let emitHandler: ((e: any) => void) | null = null
    repo.subscribeStream.mockImplementation((_sid, h) => { emitHandler = h; return () => {} })
    const message = useMessageStore(repo)
    const s = useStreamStore(repo, message)
    s.start('sess-1', 'C:/repo')
    emitHandler!({ type: 'message', message: { id: 'm1', content: 'x' } })
    await s.interrupt()
    expect(s.streamingMessage).toBeNull()
  })
})
```

- [ ] **Step 2: 跑看失败**

- [ ] **Step 3: 写实现**

```ts
// packages/desktop/src/renderer/stores/stream.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MessageRepository, Unsubscribe } from '../repositories/MessageRepository'
import { useMessageStore } from './message'
import { useUiStore } from './ui'

export const useStreamStore = (repo: MessageRepository, messageStore: ReturnType<typeof useMessageStore>) => defineStore('stream', () => {
  const streamingMessage = ref<any | null>(null)
  const streamingToolCall = ref<any | null>(null)
  const activeRun = ref<string | null>(null)
  let unsub: Unsubscribe | null = null

  function start(sessionId: string, directory?: string) {
    clear()
    activeRun.value = sessionId
    unsub = repo.subscribeStream(sessionId, async (e) => {
      if (e.type === 'message') {
        streamingMessage.value = e.message
      } else if (e.type === 'tool') {
        streamingToolCall.value = e.toolCall
      } else if (e.type === 'complete') {
        if (streamingMessage.value) messageStore.appendMessage(streamingMessage.value)
        clear()
      }
    })
  }

  async function interrupt() {
    if (activeRun.value) await repo.interrupt(activeRun.value)
    clear()
  }

  function clear() {
    streamingMessage.value = null
    streamingToolCall.value = null
    activeRun.value = null
    if (unsub) { unsub(); unsub = null }
  }

  return { streamingMessage, streamingToolCall, activeRun, start, interrupt, clear }
})()
```

注: Esc 中断键 css/css 绑定在阶段 3 末在 App.vue / ChatView 落。

- [ ] **Step 4: 跑看通过**

- [ ] **Step 5: 提交**

```bash
git add packages/desktop/src/renderer/stores/stream.ts packages/desktop/src/renderer/stores/__tests__/stream.test.ts
git commit -m "feat(desktop/store): streamStore (transient streaming state, merge to messageStore on complete)"
```

### Task 3.4: artifactRegistry + artifactStore(只 computed)

**Files:**
- Create: `packages/desktop/src/renderer/artifacts/artifactRegistry.ts`
- Create: `packages/desktop/src/renderer/artifacts/renderers/diffRenderer.ts`
- Create: `packages/desktop/src/renderer/artifacts/renderers/todoRenderer.ts`
- Create: `packages/desktop/src/renderer/stores/artifact.ts`
- Test: `packages/desktop/src/renderer/stores/__tests__/artifact.test.ts`

- [ ] **Step 1: 写测试**

```ts
// packages/desktop/src/renderer/stores/__tests__/artifact.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useArtifactStore } from '../artifact'
import { useMessageStore } from '../message'
import type { MessageRepository } from '../../repositories/MessageRepository'

function mkRepo() {
  return {
    loadMessages: vi.fn().mockResolvedValue([]), subscribeStream: vi.fn(),
    prompt: vi.fn(), interrupt: vi.fn(), deleteMessage: vi.fn(),
  }
}

describe('artifactStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('artifacts 是 computed: 从 messageStore.messages 经 registry 派生', () => {
    const repo = mkRepo()
    const message = useMessageStore(repo)
    message.messages = [
      { id: 'm1', role: 'assistant', content: '', toolCalls: [
        { id: 't1', name: 'edit_file', args: { path: 'a.ts' }, result: { diff: '@@' } },
        { id: 't2', name: 'read_file', args: { path: 'b.ts' }, result: {} },
      ] },
    ] as any
    const art = useArtifactStore(message)
    // 只有 edit_file 命中 diff renderer; read_file 不命中任何 (tool 不进 artifact, 进 Inspector)
    expect(art.artifacts.length).toBe(1)
    expect(art.artifacts[0].type).toBe('diff')
    expect(art.artifacts[0].id).toBe('t1')
    expect(art.artifacts[0].toolCall.name).toBe('edit_file')
  })

  it('删除消息 → computed 重算 → artifact 自动消失', () => {
    const repo = mkRepo()
    const message = useMessageStore(repo)
    message.messages = [{ id: 'm1', toolCalls: [{ id: 't1', name: 'edit_file' }] } as any]
    const art = useArtifactStore(message)
    expect(art.artifacts.length).toBe(1)
    message.messages = []
    expect(art.artifacts.length).toBe(0)
  })

  it('ArtifactInstance.id === ToolCall.id (引用不复制)', () => {
    const repo = mkRepo()
    const message = useMessageStore(repo)
    const tc = { id: 't1', name: 'edit_file', args: {} }
    message.messages = [{ id: 'm1', toolCalls: [tc] } as any]
    const art = useArtifactStore(message)
    expect(art.artifacts[0].toolCall).toBe(tc)   // 同一引用
  })
})
```

- [ ] **Step 2: 跑看失败**

- [ ] **Step 3: 写 artifactRegistry + renderers**

```ts
// packages/desktop/src/renderer/artifacts/artifactRegistry.ts
export type ArtifactType = 'diff' | 'todo' | 'terminal' | 'preview' | string  // 不含 "tool"

export interface ToolCall { id: string; name: string; args: any; result?: any; status?: string }
export interface ArtifactInstance {
  id: string          // === 关联 ToolCall.id (不另生成)
  type: ArtifactType
  toolCall: ToolCall   // 引用消息流对象, 不复制
  props: unknown
  groupId?: string     // 预留 ArtifactGroup (phase evaluation+)
}
export interface ArtifactRenderer {
  type:    ArtifactType
  label:   string
  icon?:   string
  applicable: (toolName: string) => boolean
  // groupable?: boolean;  groupBy?: (tc: ToolCall) => string | undefined   (首版预留字段, 不做分组实现)
}
export const artifactRegistry: Record<ArtifactType, ArtifactRenderer> = {} as any

export function registerArtifactRenderer(r: ArtifactRenderer) {
  artifactRegistry[r.type] = r
}
export function pickArtifactType(toolName: string): ArtifactType | null {
  for (const type in artifactRegistry) {
    const r = artifactRegistry[type]
    if (r.applicable(toolName)) return r.type
  }
  return null
}
```

```ts
// packages/desktop/src/renderer/artifacts/renderers/diffRenderer.ts
import { registerArtifactRenderer, type ArtifactRenderer } from '../artifactRegistry'
export const diffRenderer: ArtifactRenderer = {
  type: 'diff',
  label: 'Diff',
  applicable: (name) => name === 'edit_file' || name === 'write_file',
}
registerArtifactRenderer(diffRenderer)
```

```ts
// packages/desktop/src/renderer/artifacts/renderers/todoRenderer.ts
import { registerArtifactRenderer, type ArtifactRenderer } from '../artifactRegistry'
export const todoRenderer: ArtifactRenderer = {
  type: 'todo',
  label: 'Todo',
  applicable: (name) => name === 'todo_write' || name === 'todo_update',
}
registerArtifactRenderer(todoRenderer)
```

```ts
// packages/desktop/src/renderer/artifacts/renderers/index.ts — side-effect import 注册
import './diffRenderer'
import './todoRenderer'
export {}
```

- [ ] **Step 4: 写 artifactStore**

```ts
// packages/desktop/src/renderer/stores/artifact.ts
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useMessageStore } from './message'
import { pickArtifactType, type ArtifactInstance } from '../artifacts/artifactRegistry'
import '../artifacts/renderers'   // side-effect 注册 diff/todo renderer

export const useArtifactStore = (messageStore: ReturnType<typeof useMessageStore>) => defineStore('artifact', () => {
  const artifacts = computed<ArtifactInstance[]>(() => {
    return messageStore.messages
      .flatMap((m: any) => m.toolCalls ?? [])
      .map((tc: any) => {
        const type = pickArtifactType(tc.name)
        return type ? { id: tc.id, type, toolCall: tc, props: tc.args } as ArtifactInstance : null
      })
      .filter((x): x is ArtifactInstance => x !== null)
  })
  return { artifacts }
})()
```

- [ ] **Step 5: 跑看通过**

- [ ] **Step 6: 提交**

```bash
git add packages/desktop/src/renderer/artifacts packages/desktop/src/renderer/stores/artifact.ts packages/desktop/src/renderer/stores/__tests__/artifact.test.ts
git commit -m "feat(desktop/store): artifactRegistry + artifactStore (computed from messageStore, tool excluded → Inspector)"
```

### Task 3.5: ChatView + ChatHeader + ChatTimeline(B 折叠规则)+ 子组件

**Files:** 见 File Structure 阶段 3 列表。这一 Task 较大,拆 3.5a/b/c 子 Task。

#### Sub-Task 3.5a: ChatView 容器 + ChatHeader

- [ ] **Step 1: 写 ChatHeader 测**(rename inline + ⋯菜单 emit 复制/重命名/置顶/删除/导出 Markdown)

```ts
// packages/desktop/src/renderer/components/chat/__tests__/ChatHeader.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ChatHeader from '../ChatHeader.vue'

describe('ChatHeader', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('标题点击切 inline rename 输入, 回车确认 emit rename', async () => {
    const w = mount(ChatHeader, { props: { title: 'old', sessionId: 's1' } })
    await w.find('[data-testid="title"]').trigger('click')
    expect(w.find('input[data-testid="rename-input"]').exists()).toBe(true)
    await w.find('input[data-testid="rename-input"]').setValue('new')
    await w.find('input[data-testid="rename-input"]').trigger('keyup.enter')
    expect(w.emitted('rename')).toBeTruthy()
    expect(w.emitted('rename')![0]).toEqual(['new'])
  })

  it('⋯ 菜单含复制/重命名/置顶/删除/导出 5 项', async () => {
    const w = mount(ChatHeader, { props: { title: 't', sessionId: 's1', pinned: false } })
    await w.find('[data-testid="menu-btn"]').trigger('click')
    const items = w.findAll('[data-testid="menu-item"]').map(b => b.text())
    expect(items).toEqual(expect.arrayContaining(['复制','重命名','置顶','删除','导出 Markdown']))
  })
})
```

- [ ] **Step 2: 写 ChatHeader.vue 实现**(略写,模板按测试需求)

```vue
<!-- packages/desktop/src/renderer/components/chat/ChatHeader.vue -->
<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps<{ title: string; sessionId: string; pinned?: boolean }>()
const emit = defineEmits<{ rename: [title: string]; copy: []; pin: []; delete: []; export: [] }>()

const editing = ref(false)
const draft = ref('')
function startEdit() { editing.value = true; draft.value = props.title }
function commitEdit() { editing.value = false; if (draft.value && draft.value !== props.title) emit('rename', draft.value) }
const menuOpen = ref(false)
</script>
<template>
  <div class="chat-header">
    <button v-if="!editing" data-testid="title" @click="startEdit">{{ title }}</button>
    <input v-else data-testid="rename-input" v-model="draft" @keyup.enter="commitEdit" @blur="commitEdit" />
    <button data-testid="menu-btn" @click="menuOpen = !menuOpen">⋯</button>
    <ul v-if="menuOpen" class="menu">
      <li><button data-testid="menu-item" @click="emit('copy')">复制</button></li>
      <li><button data-testid="menu-item" @click="startEdit; menuOpen=false">重命名</button></li>
      <li><button data-testid="menu-item" @click="emit('pin')">{{ pinned ? '取消置顶' : '置顶' }}</button></li>
      <li><button data-testid="menu-item" @click="emit('delete')">删除</button></li>
      <li><button data-testid="menu-item" @click="emit('export')">导出 Markdown</button></li>
    </ul>
  </div>
</template>
```

- [ ] **Step 3: 跑测试看通过**

- [ ] **Step 4: 提交**

```bash
git commit -am "feat(desktop/chat): ChatHeader with inline rename + context menu (copy/rename/pin/delete/export)"
```

#### Sub-Task 3.5b: ChatTimeline B 折叠规则 + ToolCallBlock/ReasoningBlock/CodeBlock/Shiki

- [ ] **Step 1: 装 shiki**

Run: `cd packages/desktop && npm install shiki`

- [ ] **Step 2: 写 CodeBlock.vue 封装 Shiki** (测试: 内容渲染 + props 语言与内容)

```ts
// packages/desktop/src/renderer/components/chat/__tests__/CodeBlock.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CodeBlock from '../CodeBlock.vue'

describe('CodeBlock', () => {
  it('渲染 code 元素含代码内容与语言标签', () => {
    const w = mount(CodeBlock, { props: { code: 'const a = 1', lang: 'ts' } })
    expect(w.find('[data-testid="lang-label"]').text()).toBe('ts')
    expect(w.find('code').text()).toContain('const a = 1')
  })
})
```

```vue
<!-- packages/desktop/src/renderer/components/chat/CodeBlock.vue -->
<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { createHighlighter, type Highlighter } from 'shiki'

const props = defineProps<{ code: string; lang: string }>()
const html = ref('')
let hl: Highlighter | null = null
;(async () => {
  hl = await createHighlighter({ themes: ['github-dark'], langs: [props.lang] })
})()
watchEffect(async () => {
  if (hl) html.value = hl.codeToHtml(props.code, { lang: props.lang, theme: 'github-dark' })
})
</script>
<template>
  <div class="code-block">
    <span data-testid="lang-label">{{ lang }}</span>
    <code v-html="html" />
  </div>
</template>
```

- [ ] **Step 3: ToolCallBlock.vue 测与实现**(单行摘要 + 默认展开/折叠切换 + 状态点)

```ts
// packages/desktop/src/renderer/components/chat/__tests__/ToolCallBlock.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToolCallBlock from '../ToolCallBlock.vue'

describe('ToolCallBlock', () => {
  it('running 状态点 pulse (黄色), completed 转绿色 ✓', () => {
    const w = mount(ToolCallBlock, { props: { toolCall: { id: 't1', name: 'read_file', status: 'running' } } })
    expect(w.find('[data-testid="status-dot"]').classes()).toContain('running')
    const w2 = mount(ToolCallBlock, { props: { toolCall: { id: 't1', name: 'read_file', status: 'completed' } } })
    expect(w2.find('[data-testid="status-dot"]').classes()).toContain('completed')
  })

  it('点击切换单行摘要 / 详情(默认展开)', async () => {
    const w = mount(ToolCallBlock, { props: { toolCall: { id: 't1', name: 'read_file', args: { path: 'a.ts' }, result: { size: '1.2KB' } } } })
    expect(w.find('[data-testid="detail"]').exists()).toBe(true)
    await w.find('[data-testid="toggle"]').trigger('click')
    expect(w.find('[data-testid="detail"]').exists()).toBe(false)
  })

  it('emit inspect 触发 Inspector 切换 activeToolCallId', async () => {
    const w = mount(ToolCallBlock, { props: { toolCall: { id: 't1', name: 'read_file' } } })
    await w.find('[data-testid="toggle"]').trigger('click')
    // 点击任意可触发 inspect
    await w.find('[data-testid="summary"]').trigger('click')
    expect(w.emitted('inspect')).toBeTruthy()
  })
})
```

```vue
<!-- packages/desktop/src/renderer/components/chat/ToolCallBlock.vue -->
<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps<{ toolCall: any }>()
const emit = defineEmits<{ inspect: [id: string] }>()
const expanded = ref(true)   // B 规则: 默认展开(单行)
function toggle() { expanded.value = !expanded.value }
function short() { return `${props.toolCall.name} ${props.toolCall.args?.path ?? ''}` }
</script>
<template>
  <div class="tool-block">
    <button data-testid="toggle" @click="toggle">{{ expanded ? '▼' : '▸' }}</button>
    <span data-testid="summary" @click="emit('inspect', toolCall.id)">
      <span data-testid="status-dot" :class="toolCall.status || 'completed'">●</span>
      {{ short() }}
    </span>
    <div v-if="expanded" data-testid="detail">
      <pre>{{ JSON.stringify(toolCall.args, null, 2) }}</pre>
      <pre v-if="toolCall.result">{{ JSON.stringify(toolCall.result, null, 2) }}</pre>
    </div>
  </div>
</template>
<style scoped>
.status-dot.running { color: var(--color-warning); animation: pulse 1.5s infinite; }
.status-dot.completed { color: var(--color-success); }
.status-dot.failed { color: var(--color-error); }
@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
</style>
```

- [ ] **Step 4: ReasoningBlock + MessageUser + MessageAssistant 测与实现**(reasoning 默认折叠 + token 数)

```ts
// __tests__/ReasoningBlock.test.ts — 默认 folded + 内容/计 token 数显示
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReasoningBlock from '../ReasoningBlock.vue'

describe('ReasoningBlock', () => {
  it('默认折叠 (details closed)', () => {
    const w = mount(ReasoningBlock, { props: { content: '思考...', tokens: 50 } })
    expect(w.find('details').element.open).toBe(false)
    expect(w.find('summary').text()).toContain('Reasoning')
  })
  it('显示 token 数', () => {
    const w = mount(ReasoningBlock, { props: { content: 'x', tokens: 123 } })
    expect(w.find('summary').text()).toContain('123')
  })
})
```

```vue
<!-- ReasoningBlock.vue -->
<template>
  <details>
    <summary>Reasoning · {{ tokens }} tokens</summary>
    <div>{{ content }}</div>
  </details>
</template>
<script setup lang="ts">
defineProps<{ content: string; tokens: number }>()
</script>
```

`MessageUser.vue` / `MessageAssistant.vue` 简单 wrapper: user 右对齐 accent-muted 气泡;assistant 左对齐 surface 气泡 + 内嵌 ReasoningBlock / ToolCallBlock / CodeBlock 渲染。(测可省,但应有 mount 渲染测)

- [ ] **Step 5: ChatTimeline.vue 测与实现**(按回合序列渲染 + ToolCall 元素展开状态记忆)

```ts
// __tests__/ChatTimeline.test.ts
// 测默认 reasoning 折叠、tool 默认展开, 展开记忆经回合内 Set
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatTimeline from '../ChatTimeline.vue'

describe('ChatTimeline', () => {
  it('空态渲染 placeholder', () => {
    const w = mount(ChatTimeline, { props: { messages: [], streamingMessage: null } })
    expect(w.text()).toContain('开始')
  })
  it('渲染 user 与 assistant 消息', () => {
    const w = mount(ChatTimeline, { props: {
      messages: [{ id: 'm1', role: 'user', content: 'hi' }, { id: 'm2', role: 'assistant', content: 'hello', toolCalls: [] }],
      streamingMessage: null,
    }})
    expect(w.find('[data-testid="user-bubble"]').exists()).toBe(true)
    expect(w.find('[data-testid="assistant-bubble"]').exists()).toBe(true)
  })
})
```

`ChatTimeline.vue` 按 messages 遍历,assistant 消息内嵌 reasoning / tool blocks / code blocks,流式 streamingMessage 末尾追加 "Thinking…"。

- [ ] **Step 6: 跑所有 chat 组件测试看通过**

- [ ] **Step 7: 提交**

```bash
git add packages/desktop/src/renderer/components/chat packages/desktop/package.json
git commit -m "feat(desktop/chat): ChatTimeline with B fold rule + ToolCallBlock/ReasoningBlock/Shiki CodeBlock"
```

#### Sub-Task 3.5c: ChatView 容器组合 + 接 store

- [ ] **Step 1: ChatView.vue**

```vue
<!-- packages/desktop/src/renderer/components/chat/ChatView.vue -->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useMessageStore } from '../../stores/message'
import { useStreamStore } from '../../stores/stream'
import { useArtifactStore } from '../../stores/artifact'
import { useUiStore } from '../../stores/ui'
import ChatHeader from './ChatHeader.vue'
import ChatTimeline from './ChatTimeline.vue'
import Composer from '../Composer.vue'   // 沿用旧 Composer, phase 4 改造
import ArtifactPanel from '../artifacts/ArtifactPanel.vue'

const message = useMessageStore()   // repo 经 main.ts 注入
const stream = useStreamStore()
const art = useArtifactStore(message)
const ui = useUiStore()
const { messages, streamingMessage } = storeToRefs(message)
const { streamingMessage: sm } = storeToRefs(stream)
</script>
<template>
  <div class="chat-view flex-1 flex flex-col min-w-0">
    <ChatHeader />
    <div class="flex flex-1 min-h-0">
      <ChatTimeline :messages="messages" :streaming-message="stream.streamingMessage" class="flex-1 overflow-y-auto" />
      <ArtifactPanel v-if="ui.artifactPanelOpen" class="w-artifact-panel" />
    </div>
    <Composer />
  </div>
</template>
```

- [ ] **Step 2: App.vue `view === 'chat'` 渲染 ChatView**

替换 App.vue 阶段 1 占位的 `<ChatTimeline/> + <Composer/>` 为 `<ChatView />`。

- [ ] **Step 3: UseGlobalShortcuts 加 Esc 中断**

```ts
// useGlobalShortcuts.ts 在 onKey 加:
if (e.key === 'Escape') {
  const stream = useStreamStore()
  if (stream.activeRun) { e.preventDefault(); stream.interrupt(); return }
  // 空闲态: 收起产物面板(若开)
  const ui = useUiStore()
  if (ui.artifactPanelOpen) { ui.closeArtifactPanel(); e.preventDefault(); return }
}
```

注: useGlobalShortcuts 需在阶段 3 修改引入 streamStore;repo 注入同步。

- [ ] **Step 4: 手动 smoke**
- [ ] **Step 5: 提交**

```bash
git commit -am "feat(desktop/chat): ChatView container composes header/timeline/composer/artifact panel + Esc interrupt/收起"
```

### Task 3.6: ArtifactPanel + DiffView/TodoView + Inspector

- [ ] **Step 1: ArtifactPanel 自动展开规则测**

见 ui.test.ts 已覆盖 `openArtifactPanelAutomatically/clos/openArtifactPanel` 调用规则;本任务加**watcher**测:`artifacts.length` 0→>0 且 `!hasUserClosedArtifactPanel` → 调 openArtifactPanelAutomatically; 0→>0 且用户已主动关 → 不调。

```ts
// packages/desktop/src/renderer/components/__tests__/ArtifactPanel.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ArtifactPanel from '../artifacts/ArtifactPanel.vue'
import { useUiStore } from '../../stores/ui'

describe('ArtifactPanel auto-open rules', () => {
  let spy: any
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('artifacts 0→>0 触发自动展开', async () => {
    const w = mount(ArtifactPanel, { props: { artifacts: [] } })
    await w.setProps({ artifacts: [{ id: 't1', type: 'diff', toolCall: {}, props: {} }] })
    expect(useUiStore().artifactPanelOpen).toBe(true)
  })
  it('用户已主动关后, 不自动展开', async () => {
    const ui = useUiStore(); ui.closeArtifactPanel()
    const w = mount(ArtifactPanel, { props: { artifacts: [] } })
    await w.setProps({ artifacts: [{ id: 't1', type: 'diff', toolCall: {}, props: {} }] })
    expect(useUiStore().artifactPanelOpen).toBe(false)
  })
})
```

- [ ] **Step 2: 写 ArtifactPanel + watcher 实现**

```ts
// ArtifactPanel.vue setup 内
watch(() => props.artifacts.length, (n, old) => {
  if (old === 0 && n > 0) ui.openArtifactPanelAutomatically()
})
```

- [ ] **Step 3: DiffView / TodoView / Inspector 实现 + 测**(简化版)
  - DiffView: split diff 渲染(初期可用简单 `+行绿/-行红`),后续再细化
  - TodoView: 读 toolCall.result 渲染 checkbox 列表
  - Inspector: 读 `uiStore.activeToolCallId`,从 messageStore 找对应 ToolCall,渲染入参/返回/状态

- [ ] **Step 4: 跑测试看通过**

- [ ] **Step 5: 提交**

```bash
git commit -am "feat(desktop/artifacts): ArtifactPanel (auto-open rules) + DiffView/TodoView + Inspector"
```

### Task 3.7: 接通 wiring(main.ts 注入 repo + store 启动顺序)

**Files:**
- Modify: `packages/desktop/src/renderer/main.ts`

- [ ] **Step 1: main.ts 构造 repo + 注入 stores**

```ts
// packages/desktop/src/renderer/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createIpcMessageRepository } from './repositories/MessageRepository'
import { useMessageStore } from './stores/message'
import { useStreamStore } from './stores/stream'
import { useArtifactStore } from './stores/artifact'
import './styles/global.css'
import './artifacts/renderers'

const pinia = createPinia()
const repo = createIpcMessageRepository()

// 通过 provide 注入 store tokens (按依赖顺序构造)
const message = useMessageStore(repo)
const stream = useStreamStore(repo, message)
const artifact = useArtifactStore(message)

createApp(App).use(pinia).provide('repo', repo).mount('#app')
```

注: 这里依赖注入用 provide/inject 较稳。store 工厂模式必须保证 store instances 是 singletons,故 main.ts 创建一次后由 inject 取用。

- [ ] **Step 2: 评估现有 chat 流式 handler 迁移**(本 Task 把原 App.vue 的 `setupStreamListeners` 删除,改为 ChatView 启动时 stream.start)

App.vue `onMounted` 改为: 不再 setupStreamListeners;改在 ChatView 或 onSelectSession 触发 `message.load(sid)` + `stream.start(sid)`。

- [ ] **Step 3: 手动 smoke + 跑全部测试**
- [ ] **Step 4: 提交**

```bash
git commit -am "feat(desktop/wiring): main.ts inject repo + singleton stores; chat flow moved to ChatView"
```

---

## 阶段 4 — Composer 增强

### Task 4.1: sessionOptionsRegistry

**Files:**
- Create: `packages/desktop/src/renderer/composer/sessionOptionsRegistry.ts`
- Test: `packages/desktop/src/renderer/components/composer/__tests__/sessionOptionsRegistry.test.ts`

- [ ] **Step 1: 写测试** — registry 含 model + mode 两 option,`SessionOption` 结构含 key/label/type/value/options/default/allowed
- [ ] **Step 2: 跑看失败**
- [ ] **Step 3: 定义类型 + 注册 model + mode**

```ts
// packages/desktop/src/renderer/composer/sessionOptionsRegistry.ts
export type SessionOptionKey = 'model' | 'mode' | 'reasoning' | 'permission' | string
export interface SessionOption<T = unknown> {
  key: SessionOptionKey
  label: string
  type: 'select'
  value: T
  options: { value: T; label: string }[]
  allowed: ('create' | 'runtime')[]
  default: T
}
export const sessionOptionsRegistry: Record<string, SessionOption> = {
  model: { key: 'model', label: '模型', type: 'select', value: '', options: [], allowed: ['create', 'runtime'], default: '' },
  mode:  { key: 'mode',  label: '模式', type: 'select', value: 'build', options: [{value:'build',label:'build'},{value:'plan',label:'plan'}], allowed:['create','runtime'], default:'build' },
}
export function registerSessionOption<T>(opt: SessionOption<T>) {
  sessionOptionsRegistry[opt.key] = opt as any
}
```

- [ ] **Step 4: 跑通过**
- [ ] **Step 5: 提交**

### Task 4.2: Composer 组件 + ComposerInput (多行/斜杠/历史)

- **Step 1-5**: 写测试与实现 ComposerInput.vue:多行 textarea、`/` 触发 SlashCommandMenu、↑↓ 历史回溯。SlashCommandMenu 渲染 `/plan` `/build` `/clear` `/compact` `/model`。
- 注: `/model` 触发模型选择菜单, `/clear` 调 sessionStore 选当前新建会话, `/compact` IPC(若 core /api/session/:id/compact 走 desktop 未来 plan, phase 4 可暂只展示)
- 提交

### Task 4.3: AttachmentButton + AtFilePicker + AttachmentBar

- **Step 1-5**: `+` 菜单两项 → 提及文件(扫描当前 workspace)+ 添加附件(原生 file dialog + chip)。chip 行 + `×` 移除
- 提交

### Task 4.4: SessionOptions UI + ComposerToolbar + 发送中断切换

- **Step 1-5**: ComposerToolbar 渲染 `+` 在左 + SessionOptions + 发送/停止 在右;发送 disabled/停止按钮在 stream.activeRun 时显示,调 stream.interrupt
- 提交

### Task 4.5: 后端 prompt 传 mode(若可行) ✓ 已完成

**Files:**
- Modify: `packages/desktop/src/renderer/components/Composer.vue`

- **Step 1: 验证结果** (已完成探查)

探查 `packages/core/src/session/prompt.ts` PromptInput schema:
```typescript
export const PromptInput = Schema.Struct({
  sessionID: SessionID,
  messageID: Schema.optional(MessageID),
  model: Schema.optional(ModelRef),
  agent: Schema.optional(Schema.String),  // 有 agent 字段
  // 无 mode 字段!
  noReply: Schema.optional(Schema.Boolean),
  tools: Schema.optional(Schema.Record(Schema.String, Schema.Boolean)),
  format: Schema.optional(SessionV1.Format),
  system: Schema.optional(Schema.String),
  variant: Schema.optional(Schema.String),
  parts: Schema.Array(...),
})
```

**结论**: Core PromptInput 有 `agent` 字段但 **无 `mode` 字段**。

- **Step 2: 实现降级方案** (已实现)

采用降级方案: `’mode’ 仅影响 composer 首条 prompt 文本(预前缀如 `[mode=plan]`)`

Composer.vue handleSend 现已:
- 当 mode=’plan’ 且内容不以 `[mode=plan]` 开头时,自动前缀 `[mode=plan]\n`
- mode=’build’ 时不前缀
- 历史记录存原始内容(不含前缀)

- **Step 3: 提交** (待执行)

```bash
git add packages/desktop/src/renderer/components/Composer.vue
git commit -m "feat(desktop/composer): prefix [mode=plan] when mode=’plan’ (core lacks mode param)"
```

---

## 阶段 5 — Skills/MCP 管理视图

### Task 5.1: skill 数据来源(走现有 skill 配置 read + 桌面端 sessions.json-style 写 metadata)

**核心现实约束(探查)**: core 暴露的 skill HTTP 路由只有 `GET /api/skill`(list);**无 skill.create/update**。skill 通过 plugin/config 文件注册到 `~/.opencode/skills/`。

- 桌面端方案(`"仅用现有 IPC + 文件写入"`):
  - **SkillView 列表** = 调桌面端新增 `SKILL_LIST` IPC,main 转发 `backend HTTP GET /api/skill`(若 v1 路径也需暴露,在 backend-client 加 `skill.list`),返回 `{id, name, description, enabled, scope, source}`
  - **启用开关** = 桌面端写本地 sessions.json-style metadata(`skills-meta.json`)记录 `{id: {enabled}}`,因 core 不给 update 路由。core 读取 enabled 由 plugin/config 决定,桌面 metadata 仅影响 UI 是否展示并启用 skill;'enabled=false' 仅作 UI 软屏蔽(不影响 core 实际激活)— **本约束需在 spec/plan 显式说明**:
    - '桌面端不能真停用一个 skill,只能 UI 软屏蔽(隐藏/标记 disabled),因 core 不给 toggle 路由'
    - 或退而求其次: 'enable/disable 改 `~/.zcode/skills/<name>/SKILL.md` 文件加 frontmatter `disabled: true` 字段,需假定 core plugin 发现机制尊重该字段'
  - **新建技能** = 把 skill-creator 提示词(来自 `anthropics/skills/skills/skill-creator/SKILL.md`)作为新 chat 会话首条 prompt 预填到 Composer,用户补内容发送 → core 内 agent 调用 skill-creator 生成落盘到选定目录

### Task 5.2 - 5.6: SkillView / SkillCard / SkillCreateDialog / McpView / McpAddDialog / 新 IPC handlers

依次实现,每个先 TDD(测主行为)再实现再提交。详细 step 与上述同套路,因篇幅此计划只列 Task 标题 + 关键约束 + 文件清单,执行时按相同 step 套路展开.

对约束的实现:
- `SKILL_LIST` 走 backend-client 直接 `GET /api/skill`(core 路由 `deps/groups/skill.ts` 已暴露)
- `SKILL_TOGGLE`: main handler 读 `~/.zcode/skills/<name>/SKILL.md` frontmatter,置 `disabled: !current`,落盘 — **并 plan 内备注: 'core 必须支持 frontmatter disabled 才生效,否则仅 UI 标记'**
- `MCP_LIST`: core 探查未给 mcp list 路由 — 桌面端读 core 配置文件中 `mcp` 节
- `MCP_RECONNECT` / `MCP_ADD`: 写 core mcp 配置文件 + 调 core 重载机制(若 core 无 reload 路由 → 仅写配置需用户重启后端)
- `core.createSkill` 调用 = 桌面端 spec 说的"createSkill 干净契约" 在现实下退化为: 不存在该 core 路由 → 桌面端直接走"建 chat 会话 + 预填首条 prompt" 链路(已确定用户认可 — 见 brainstorming 对话)

### 提交粒度

每个 Task (5.1, 5.2…) 一次提交,commit prefix 描述文件主名。

---

## 阶段 6 — Settings 细化

### Task 6.1 - 6.5:

- 6.1 SettingsView 主区容器 + ConfigSelect 可复用 + components/SettingsAppearance.vue
- 6.2 SettingsModels;6.3 SettingsShortcuts(只读);6.4 SettingsAbout
- 6.5 ALLOWED_CONFIG_KEYS 扩 + SESSION_CLEAR_ALL 通道

每个 TDD 套路:
- 写测(测设置项渲染 + 切换 setting 改 settingsSection, 改值调 config.set)
- 写实现
- 跑通过
- 提交

### 提交

每 Task 一次提交.

---

## 阶段 7 — 双主题后置

### Task 7.1: 暖 accent 替换

**Files:**
- Modify: `packages/desktop/src/renderer/styles/global.css`、`tailwind.config.js`

- [ ] **Step 1: 测试** — accent 变量 grep == 暖 amber(`#f59e0b`/`#fbbf24`);新增 useTheme 后续
- [ ] **Step 2: global.css `@theme` 替换**

```css
--color-accent: #f59e0b;
--color-accent-hover: #fbbf24;
--color-accent-muted: rgba(245, 158, 11, 0.12);
--color-accent-glow: rgba(245, 158, 11, 0.25);
```

`tailwind.config.js` 同步 accent 颜色对象成 amber 对应值
- [ ] **Step 3: 跑测试看通过**
- [ ] **Step 4: 手动 smoke 看视觉**
- [ ] **Step 5: 提交**

### Task 7.2: 亮色主题变量集 + useTheme composable + 切换

- [ ] **Step 1: global.css 加亮色变量集**

```css
:root, :root.dark { ... 现有暗色变量 ... }
:root:not(.dark), :root.light {
  --color-bg: #ffffff;
  --color-bg-surface: #f9fafb;
  --color-text: #1f2937;
  /* accent 不变以保持品牌色 */
}
```

- [ ] **Step 2: useTheme.ts**

```ts
import { ref } from 'vue'
import type { Ref } from 'vue'
const theme: Ref<'dark'|'light'> = ref('dark')
export function useTheme() {
  function apply(t: 'dark'|'light') {
    theme.value = t
    document.documentElement.classList.toggle('dark', t === 'dark')
    // TODO: Shiki theme 切换 (CodeBlock 双 hl)
  }
  return { theme, apply }
}
```

- [ ] **Step 3: SettingsAppearance 切换调 useTheme.apply + config.set(`theme`, t)**

- [ ] **Step 4: 跑测试 + 手动验**
- [ ] **Step 5: 提交**

---

## Self-Review

### Spec 覆盖检查(对照十四项结构性修订)

1. View 双状态源 → Task 1.1(uiStore `view`+`previousView`,无 settingsMode)
2. Artifact Tab 写死 → Task 3.4(artifactRegistry 首版注册 diff/todo)
3. Session-Workspace 耦合 → Task 2.1(primaryWorkspaceId + workspaceIds) + 14 两 Tab `+` 区分
4. Model/Mode 写死 → Task 4.1 sessionOptionsRegistry
5. Skill Creator leak core → 阶段 5 退化为"建会话 + 预填 skill-creator 提示词",桌面端零感知 skill 名(plan Task 5.x 显式)
6. Artifact 状态多源 → Task 3.4 computed `id===ToolCall.id`,Task 3.2/3.3 message/store 分离
7. SessionStore 上帝对象 → Task 2.1/3.2/3.3/3.4 拆分
8. Tool Detail→Inspector → Task 3.6 Inspector 独立 Artifact 区
9. View 平级写死 → Task 1.2 navigationRegistry
10. 双主题后置 → 阶段 7(阶段 1-6 全程暗色)
11. ArtifactGroup → Task 3.4 `groupId` 预留字段(type/script 注释说明首版不做分组实现)
12. messageStore 担太重挡运行时态 → Task 3.2/3.3 分离
13. store 调 IPC 锁死 → Task 3.1 MessageRepository 接口
14. 两 Tab `+` 区分 → Task 2.3

### Placeholder 扫描

- 阶段 5 末每个子 Task(step 1-5)未写完整 step 文本 — 标为"按相同 step 套路展开"是 placeholder 风险。计划已显式承认执行时按 TDD 套路展开,但 review 确认: 本计划体量已极大,阶段 5/6/7 的细 step 在 subagent-driven 执行时由 subagent 按 plan 头部"TDD/DRY/YAGNI/commit 约束 + 每 step 写测/失败/实现/通过/提交"规则展开。**严格按 plan 头部约束,不可跳过 step**。
- 类型一致性: `SessionOption`/`ArtifactInstance`/`MessageRepository`/`View` 名一致; `artifacts` computed 在 artifactStore 与 ArtifactPanel prop 名一致。
- `useStreamStore(repo, messageStore)` 签名在阶段 3 一致出现;`useArtifactStore(messageStore)` 一致。

### 真实性约束(对计划的责任)

- 探查发现 core 无 skill.create/mcp 路由 → 阶段 5 真实落法**已在 plan 显式降为**"建 chat + 预填 skill-creator 提示词 / 写本地配置文件";不假装调不存在的 `core.createSkill` HTTP
- 探查发现桌面端 backend-client 走 v1 `/session/...` 真生效 → MessageRepository 内 adapter 走 v1 路径不变
- 已有 session.test.ts mock 脱节 → Task 2.1 重写
- core `/prompt_async` 是否接 mode 未确认 → Task 4.5 现实化处理(传 metadata 或退化为文本前缀)

---

## Execution Handoff

Plan complete and saved to `packages/core/docs/superpowers/plans/2026-06-26-desktop-ui-redesign.md`. Two execution options:

1. **Subagent-Driven (recommended)** - 我为每个 Task 派新 subagent 实现,任务间 review,迭代快
2. **Inline Execution** - 在本会话用 executing-plans 分批执行 + checkpoint review

Which approach?