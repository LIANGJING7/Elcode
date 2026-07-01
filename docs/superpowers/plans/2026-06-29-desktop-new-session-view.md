# Desktop 新建会话欢迎界面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建居中的新建会话欢迎界面，移除选择器边框，实现模型选择持久化

**Architecture:** 创建独立的 NewSessionView.vue 组件，在 App.vue 中根据 isPendingNewSession 状态切换视图，修改 SessionOptions.vue 和 ModelSelector.vue 移除边框样式，在 models.ts store 中添加 selectedModel 状态和持久化逻辑

**Tech Stack:** Vue 3, Pinia, TailwindCSS, shadcn-vue components

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `packages/desktop/src/renderer/components/NewSessionView.vue` | 新建 | 居中欢迎输入界面，显示 LCODE 标识、工作区选择器、输入框、Build/模型选择器 |
| `packages/desktop/src/renderer/App.vue` | 修改 | 添加 NewSessionView 条件渲染，修改 effectiveView 计算逻辑 |
| `packages/desktop/src/renderer/components/composer/SessionOptions.vue` | 修改 | 移除 Build 模式选择器边框，绑定 modelsStore.selectedModel |
| `packages/desktop/src/renderer/components/composer/ModelSelector.vue` | 修改 | 移除模型选择器边框，调用 modelsStore.setSelectedModel |
| `packages/desktop/src/renderer/stores/models.ts` | 修改 | 添加 selectedModel 状态、setSelectedModel 方法、loadModels 中恢复持久化模型 |
| `packages/desktop/src/renderer/stores/ui.ts` | 修改 | View 类型添加 'newSession' |

---

### Task 1: 修改 ui.ts store - 添加 'newSession' View 类型

**Files:**
- Modify: `packages/desktop/src/renderer/stores/ui.ts`

- [ ] **Step 1: 修改 View 类型定义**

在 `packages/desktop/src/renderer/stores/ui.ts` 第 5 行，修改 View 类型：

```typescript
// 修改前
export type View = 'welcome' | 'chat' | 'skills' | 'mcp' | 'settings'

// 修改后
export type View = 'welcome' | 'newSession' | 'chat' | 'skills' | 'mcp' | 'settings'
```

- [ ] **Step 2: 提交变更**

```bash
git add packages/desktop/src/renderer/stores/ui.ts
git commit -m "feat(ui): add 'newSession' to View type"
```

---

### Task 2: 修改 models.ts store - 添加 selectedModel 状态和持久化

**Files:**
- Modify: `packages/desktop/src/renderer/stores/models.ts`

- [ ] **Step 1: 添加 selectedModel 状态**

在 `packages/desktop/src/renderer/stores/models.ts` 的 `useModelsStore` 函数内，第 22 行 `const testing = ref(new Set<string>())` 之后添加：

```typescript
const testing = ref(new Set<string>())
const selectedModel = ref<string>('')
```

- [ ] **Step 2: 在 loadModels 函数中恢复持久化模型**

修改 `loadModels` 函数，在 `finally` 块之前添加恢复逻辑：

```typescript
async function loadModels(directory?: string) {
  loading.value = true
  error.value = null
  try {
    const result = await window.desktop.config.models(directory)
    // Only show connected providers (same behavior as TUI)
    const connectedSet = new Set(result.connected || [])
    providers.value = (result.all as ProviderInfo[]).filter(p => connectedSet.has(p.id))
    connectedProviders.value = result.connected || []

    // Update sessionOptionsRegistry after loading
    registerSessionOption<string>({
      key: 'model',
      label: '模型',
      type: 'select',
      value: '',
      options: modelOptions.value,
      allowed: ['create', 'runtime'],
      default: ''
    })

    // 恢复持久化的模型选择
    const saved = await window.desktop.config.get('selectedModel')
    if (saved && modelOptions.value.some(o => o.value === saved)) {
      selectedModel.value = saved
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load models'
    providers.value = []
    connectedProviders.value = []
  } finally {
    loading.value = false
  }
}
```

- [ ] **Step 3: 添加 setSelectedModel 方法**

在 `loadModels` 函数之后添加新方法：

```typescript
async function setSelectedModel(modelId: string) {
  selectedModel.value = modelId
  await window.desktop.config.set('selectedModel', modelId)
}
```

- [ ] **Step 4: 在 clearModels 函数中清除 selectedModel**

修改 `clearModels` 函数，添加清除 selectedModel：

```typescript
function clearModels() {
  providers.value = []
  connectedProviders.value = []
  error.value = null
  selectedModel.value = ''

  // Clear registry
  registerSessionOption<string>({
    key: 'model',
    label: '模型',
    type: 'select',
    value: '',
    options: [],
    allowed: ['create', 'runtime'],
    default: ''
  })
}
```

- [ ] **Step 5: 在 return 中导出新增状态和方法**

修改 return 对象，添加 selectedModel 和 setSelectedModel：

```typescript
return {
  providers,
  connectedProviders,
  loading,
  error,
  saving,
  deleting,
  refreshing,
  testing,
  selectedModel,
  modelOptions,
  loadModels,
  setSelectedModel,
  addProvider,
  updateProvider,
  deleteProvider,
  testProvider,
  refreshModels,
  clearModels
}
```

- [ ] **Step 6: 提交变更**

```bash
git add packages/desktop/src/renderer/stores/models.ts
git commit -m "feat(models): add selectedModel state with persistence"
```

---

### Task 3: 修改 SessionOptions.vue - 移除边框 + 绑定持久化模型

**Files:**
- Modify: `packages/desktop/src/renderer/components/composer/SessionOptions.vue`

- [ ] **Step 1: 移除 Build 模式选择器边框**

修改第 9 行 SelectTrigger 的 class：

```vue
<!-- 修改前 -->
<SelectTrigger class="h-7 px-2.5 text-xs border border-border rounded-lg bg-bg-elevated hover:bg-bg-hover">

<!-- 修改后 -->
<SelectTrigger class="h-7 px-2.5 text-xs rounded-lg bg-bg-elevated hover:bg-bg-hover">
```

- [ ] **Step 2: 添加 modelsStore 导入和初始化逻辑**

在 script setup 中添加导入和初始化：

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { sessionOptionsRegistry, type SessionOption } from '../../composer/sessionOptionsRegistry'
import ModelSelector from './ModelSelector.vue'
import { useModelsStore } from '../../stores/models'

const modelsStore = useModelsStore()

// ... 其他代码 ...
```

- [ ] **Step 3: 使用 modelsStore.selectedModel 初始化 localModel**

修改 localModel 初始化，并在 watch 中监听 modelsStore.selectedModel：

```typescript
const localMode = ref<string>((props.options?.mode as string) || 'build')
const localModel = ref<string>((props.options?.model as string) || modelsStore.selectedModel || '')

// 初始化时从 modelsStore.selectedModel 获取默认值
onMounted(() => {
  if (!props.options?.model && modelsStore.selectedModel) {
    localModel.value = modelsStore.selectedModel
  }
})

// 监听 modelsStore.selectedModel 变化
watch(() => modelsStore.selectedModel, (newModel) => {
  if (newModel && !props.options?.model) {
    localModel.value = newModel
  }
})
```

- [ ] **Step 4: 提交变更**

```bash
git add packages/desktop/src/renderer/components/composer/SessionOptions.vue
git commit -m "feat(SessionOptions): remove border and bind selectedModel from store"
```

---

### Task 4: 修改 ModelSelector.vue - 移除边框 + 调用持久化方法

**Files:**
- Modify: `packages/desktop/src/renderer/components/composer/ModelSelector.vue`

- [ ] **Step 1: 移除模型选择器按钮边框**

修改第 5-6 行 button 的 class：

```vue
<!-- 修改前 -->
<button
  class="h-7 px-2.5 border border-border rounded-lg bg-bg-elevated hover:bg-bg-hover text-xs text-text font-medium flex items-center gap-1 transition-colors"
>

<!-- 修改后 -->
<button
  class="h-7 px-2.5 rounded-lg bg-bg-elevated hover:bg-bg-hover text-xs text-text font-medium flex items-center gap-1 transition-colors"
>
```

- [ ] **Step 2: 修改 selectModel 函数调用 setSelectedModel**

修改第 168-169 行的 selectModel 函数：

```typescript
// 修改前
function selectModel(value: string) {
  selectedModel.value = value
}

// 修改后
async function selectModel(value: string) {
  selectedModel.value = value
  await modelsStore.setSelectedModel(value)
}
```

- [ ] **Step 3: 提交变更**

```bash
git add packages/desktop/src/renderer/components/composer/ModelSelector.vue
git commit -m "feat(ModelSelector): remove border and persist model selection"
```

---

### Task 5: 创建 NewSessionView.vue 组件

**Files:**
- Create: `packages/desktop/src/renderer/components/NewSessionView.vue`

- [ ] **Step 1: 创建 NewSessionView.vue 文件**

创建 `packages/desktop/src/renderer/components/NewSessionView.vue`：

```vue
<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useSessionStore } from '../stores/session'
import { useWorkspaceStore } from '../stores/workspace'
import { useModelsStore } from '../stores/models'
import { useUiStore } from '../stores/ui'
import ComposerInput from './composer/ComposerInput.vue'
import SessionOptions from './composer/SessionOptions.vue'

const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const modelsStore = useModelsStore()
const ui = useUiStore()

const inputRef = ref<{ focus: () => void } | null>(null)
const inputValue = ref('')
const isFocused = ref(false)
const sessionOptions = ref<Record<string, unknown>>({ mode: 'build', model: '' })

// 初始化模型选择
onMounted(() => {
  if (modelsStore.selectedModel) {
    sessionOptions.value.model = modelsStore.selectedModel
  }
  nextTick(() => inputRef.value?.focus())
})

const canSend = computed(() => inputValue.value.trim().length > 0)

async function handleSend(content: string) {
  const mode = sessionOptions.value.mode as string
  const finalContent = mode === 'plan' && !content.startsWith('[mode=plan]')
    ? `[mode=plan]\n${content}`
    : content

  await sessionStore.sendMessage(finalContent)
  ui.setView('chat')
}

function handleManualSend() {
  if (canSend.value) {
    handleSend(inputValue.value)
    inputValue.value = ''
  }
}

function handleWorkspaceChange(workspacePath: string) {
  workspaceStore.selectWorkspace(workspacePath)
}
</script>

<template>
  <div class="new-session-view flex-1 flex items-center justify-center bg-bg">
    <div class="w-full max-w-2xl mx-6">
      <!-- LCODE 标识 -->
      <div class="text-4xl font-bold text-text-muted/30 mb-8 text-center select-none">
        LCODE
      </div>

      <!-- 输入卡片 -->
      <div
        class="bg-bg-elevated rounded-2xl shadow-lg transition-all duration-200 flex flex-col"
        :class="isFocused ? 'shadow-md' : 'shadow-lg'"
      >
        <!-- 工作区选择器 -->
        <div class="px-3 py-2 border-b border-border/60">
          <button
            class="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            <span class="text-lg">📁</span>
            <span class="truncate">{{ workspaceStore.currentWorkspace?.name || 'Select workspace' }}</span>
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>

        <!-- 输入区域 -->
        <div class="flex-1 min-h-[80px] px-3 pt-3 pb-1">
          <ComposerInput
            ref="inputRef"
            v-model="inputValue"
            placeholder="Ask anything... (Shift+Enter for new line)"
            @send="handleSend"
            @focus="isFocused = true"
            @blur="isFocused = false"
          />
        </div>

        <!-- 底部工具栏 -->
        <div class="flex items-center gap-2 px-3 py-2 flex-shrink-0">
          <!-- Plus Button -->
          <button
            class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-bg-hover hover:bg-bg-tertiary text-text-muted transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <!-- Spacer -->
          <div class="flex-1"></div>

          <!-- SessionOptions + Send -->
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <SessionOptions
              v-model:options="sessionOptions"
              :editing-session="false"
            />

            <!-- Send Button -->
            <button
              class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              :class="canSend
                ? 'bg-accent hover:bg-accent-hover text-white'
                : 'bg-bg-hover text-text-muted'"
              :disabled="!canSend"
              title="Send (Enter)"
              @click="handleManualSend"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <!-- Footer hints -->
        <div
          v-if="inputValue.length > 0"
          class="flex items-center justify-end px-4 py-1.5 border-t border-border/60"
        >
          <div class="flex items-center gap-2">
            <kbd class="text-xs text-text-muted bg-bg-hover px-1.5 py-0.5 rounded font-mono">Enter</kbd>
            <span class="text-xs text-text-muted">to send</span>
            <span class="text-border mx-0.5">·</span>
            <kbd class="text-xs text-text-muted bg-bg-hover px-1.5 py-0.5 rounded font-mono">Shift+Enter</kbd>
            <span class="text-xs text-text-muted">new line</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.new-session-view {
  background-image:
    radial-gradient(ellipse at top left, var(--color-accent-glow) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, var(--color-accent-muted) 0%, transparent 50%);
}
</style>
```

- [ ] **Step 2: 提交变更**

```bash
git add packages/desktop/src/renderer/components/NewSessionView.vue
git commit -m "feat(NewSessionView): create centered new session welcome view"
```

---

### Task 6: 修改 App.vue - 添加 NewSessionView 条件渲染

**Files:**
- Modify: `packages/desktop/src/renderer/App.vue`

- [ ] **Step 1: 导入 NewSessionView 组件**

在第 105 行 `import WelcomeView from './components/WelcomeView.vue'` 之后添加：

```typescript
import NewSessionView from './components/NewSessionView.vue'
```

- [ ] **Step 2: 修改 effectiveView 计算逻辑**

修改第 162-166 行的 effectiveView 计算属性：

```typescript
// 修改前
const effectiveView = computed<'welcome' | 'chat' | 'skills' | 'mcp' | 'settings'>(() => {
  if (!hasCurrentWorkspace.value) return 'welcome'
  if (ui.view === 'welcome') return 'chat'
  return ui.view
})

// 修改后
const effectiveView = computed<'welcome' | 'newSession' | 'chat' | 'skills' | 'mcp' | 'settings'>(() => {
  if (!hasCurrentWorkspace.value) return 'welcome'
  if (sessionStore.isPendingNewSession) return 'newSession'
  if (ui.view === 'welcome') return 'chat'
  return ui.view
})
```

- [ ] **Step 3: 在模板中添加 NewSessionView 渲染**

在第 82-93 行之间添加 NewSessionView 条件渲染：

```vue
<main class="main-content flex-1 flex flex-col min-w-0 bg-bg overflow-hidden">
  <WelcomeView v-if="effectiveView === 'welcome'" @open-folder="handleAddWorkspace" />
  <NewSessionView v-else-if="effectiveView === 'newSession'" />
  <ChatView
    v-else-if="effectiveView === 'chat'"
    :session-id="currentSessionId ?? ''"
    :messages="currentMessages"
    :streaming-message="sessionStore.streamingMessage"
    @inspect="handleInspect"
  />
  <SkillView v-else-if="effectiveView === 'skills'" />
  <McpView v-else-if="effectiveView === 'mcp'" />
  <SettingsView v-else-if="effectiveView === 'settings'" />
  <div v-else class="flex-1 p-6 text-text-muted">
    Unknown view
  </div>
</main>
```

- [ ] **Step 4: 提交变更**

```bash
git add packages/desktop/src/renderer/App.vue
git commit -m "feat(App): add NewSessionView conditional rendering"
```

---

### Task 7: 手动验证功能

**Files:**
- 无文件修改，仅验证

- [ ] **Step 1: 启动桌面端开发服务器**

```bash
cd packages/desktop
bun run dev
```

Expected: Electron 应用启动，显示欢迎界面

- [ ] **Step 2: 验证新建会话显示 NewSessionView**

点击侧边栏 "New Session" 按钮

Expected: 显示居中的 LCODE 标识和卡片式输入框

- [ ] **Step 3: 验证选择器无边框**

检查 Build 模式选择器和模型选择器

Expected: 没有外边框，背景色正常

- [ ] **Step 4: 验证发送消息后切换到 ChatView**

在输入框输入文字并发送

Expected: 自动切换到 ChatView，显示消息时间线

- [ ] **Step 5: 验证模型持久化**

选择一个模型，关闭应用，重新打开

Expected: 模型选择器显示上次选择的模型

---

## 完成标记

所有任务完成后：

```bash
git log --oneline -7
```

Expected output:
```
feat(App): add NewSessionView conditional rendering
feat(NewSessionView): create centered new session welcome view
feat(ModelSelector): remove border and persist model selection
feat(SessionOptions): remove border and bind selectedModel from store
feat(models): add selectedModel state with persistence
feat(ui): add 'newSession' to View type
docs: add desktop new session view design spec
```