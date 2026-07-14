# Desktop Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善桌面端错误捕获和展示，保存完整 error 对象（type + message），识别 denied 状态，支持消息级错误展示。

**Architecture:** 修改数据层类型定义、reducer、normalizer、历史消息处理器，新增错误工具函数和消息错误组件，保持与 TUI 对齐。

**Tech Stack:** TypeScript, Vue 3, Electron IPC

## Global Constraints

- error 对象格式：`{ type: string; message: string }`
- 兼容旧格式：`error?: string | { type: string; message: string }`
- denied 错误识别：`QuestionRejectedError`, `rejected permission`, `specified a rule`, `user dismissed`

---

### Task 1: 修改数据类型定义

**Files:**
- Modify: `packages/desktop/src/renderer/stores/streaming/types.ts:88,129`
- Modify: `packages/desktop/src/types/ipc.ts:97-112,146`

**Interfaces:**
- Produces: `StreamingToolCall.error` 为对象类型
- Produces: `StreamingState.stepError` 字段
- Produces: `Message.error` 字段
- Produces: `ToolCall.error` 兼容格式

- [ ] **Step 1: 修改 StreamingToolCall.error 类型**

修改 `packages/desktop/src/renderer/stores/streaming/types.ts:88`：

```typescript
// 改前
error: string | null

// 改后
error: { type: string; message: string } | null
```

- [ ] **Step 2: 修改 STEP_FAILED action 类型**

修改 `packages/desktop/src/renderer/stores/streaming/types.ts:129`：

```typescript
// 改前
| { type: 'STEP_FAILED'; error: string; version: number }

// 改后
| { type: 'STEP_FAILED'; error: { type: string; message: string }; version: number }
```

- [ ] **Step 3: StreamingState 增加 stepError 字段**

修改 `packages/desktop/src/renderer/stores/streaming/types.ts:13-30`，在 `StreamingState` 接口中增加：

```typescript
/** Step-level error from STEP_FAILED event */
stepError: { type: string; message: string } | null
```

- [ ] **Step 4: 初始化 state 包含 stepError**

修改 `packages/desktop/src/renderer/stores/streaming/types.ts:160-185` 的 `createInitialState` 函数：

```typescript
export function createInitialState(version: number = 0): StreamingState {
  return {
    version,
    status: 'idle',
    message: {
      id: null,
      content: '',
    },
    reasoning: {
      id: null,
      status: 'idle',
      content: '',
      startedAt: null,
      endedAt: null
    },
    tools: {
      entities: new Map()
    },
    pendingDeltas: new Map(),
    reasoningHistory: [],
    stepError: null,  // 新增
  }
}
```

- [ ] **Step 5: Message 增加 error 字段**

修改 `packages/desktop/src/types/ipc.ts:97-112`，在 `Message` 接口中增加：

```typescript
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
  reasoning?: string
  files?: FilePart[]
  agents?: AgentPart[]
  duration?: number
  reasoningDuration?: number
  error?: { type: string; message: string }  // 新增
}
```

- [ ] **Step 6: ToolCall.error 改为兼容格式**

修改 `packages/desktop/src/types/ipc.ts:146`：

```typescript
// 改前
error?: string

// 改后（兼容旧格式）
error?: string | { type: string; message: string }
```

- [ ] **Step 7: 提交类型修改**

```bash
git add packages/desktop/src/renderer/stores/streaming/types.ts packages/desktop/src/types/ipc.ts
git commit -m "feat(desktop): add error object type support for tool and message errors"
```

---

### Task 2: 修改 reducer 和 normalizer

**Files:**
- Modify: `packages/desktop/src/renderer/stores/streaming/reducer.ts:61-63,228`
- Modify: `packages/desktop/src/renderer/stores/streaming/normalizer.ts:301-336`

**Interfaces:**
- Consumes: `STEP_FAILED` action 类型（Task 1）
- Produces: reducer 保存完整 error 对象

- [ ] **Step 1: reducer 保存完整 TOOL_FAILED error**

修改 `packages/desktop/src/renderer/stores/streaming/reducer.ts:227-230`：

```typescript
// 改前
toolForFailed.error = action.error.message

// 改后
toolForFailed.error = action.error
```

- [ ] **Step 2: reducer 处理 STEP_FAILED**

修改 `packages/desktop/src/renderer/stores/streaming/reducer.ts:61-63`：

```typescript
// 改前
case 'STEP_FAILED':
  state.status = 'error'
  return state

// 改后
case 'STEP_FAILED':
  state.status = 'error'
  state.stepError = action.error
  return state
```

- [ ] **Step 3: normalizer 传递完整 STEP_FAILED error**

修改 `packages/desktop/src/renderer/stores/streaming/normalizer.ts:330-336`：

```typescript
// 改前
case 'session.next.step.failed':
  const stepError = props.error as { message?: string } | undefined
  return {
    type: 'STEP_FAILED',
    error: stepError?.message ?? 'Step failed',
    version
  }

// 改后
case 'session.next.step.failed':
  const stepError = props.error as { type?: string; message?: string } | undefined
  return {
    type: 'STEP_FAILED',
    error: {
      type: stepError?.type ?? 'unknown',
      message: stepError?.message ?? 'Step failed'
    },
    version
  }
```

- [ ] **Step 4: 提交 reducer/normalizer 修改**

```bash
git add packages/desktop/src/renderer/stores/streaming/reducer.ts packages/desktop/src/renderer/stores/streaming/normalizer.ts
git commit -m "feat(desktop): save complete error object in reducer and normalizer"
```

---

### Task 3: 修改历史消息处理器

**Files:**
- Modify: `packages/desktop/src/main/ipc/handlers-session.ts:89,177,372-381`

**Interfaces:**
- Consumes: `ToolCall.error` 兼容格式（Task 1）
- Produces: 历史消息包含完整 error 对象

- [ ] **Step 1: 修改 toToolCall 参数类型**

修改 `packages/desktop/src/main/ipc/handlers-session.ts:89`：

```typescript
// 改前
error?: { message?: string }

// 改后
error?: { type: string; message: string }
```

- [ ] **Step 2: 保存完整 error 对象**

修改 `packages/desktop/src/main/ipc/handlers-session.ts:177`：

```typescript
// 改前
...(state?.error?.message ? { error: state.error.message } : {}),

// 改后
...(state?.error ? { error: state.error } : {}),
```

- [ ] **Step 3: toMessage 增加 error 字段**

修改 `packages/desktop/src/main/ipc/handlers-session.ts:372-381`，找到 `toMessage` 函数的 return 语句，增加 error：

```typescript
return {
  id: msg.id,
  role: 'assistant',
  content,
  ...(msg.error ? { error: msg.error } : {}),
}
```

- [ ] **Step 4: 提交历史消息处理器修改**

```bash
git add packages/desktop/src/main/ipc/handlers-session.ts
git commit -m "feat(desktop): preserve complete error object in history message handlers"
```

---

### Task 4: 新增错误工具函数

**Files:**
- Create: `packages/desktop/src/renderer/utils/error-utils.ts`

**Interfaces:**
- Produces: `isDeniedError()` 函数
- Produces: `getErrorMessage()` 函数

- [ ] **Step 1: 创建 error-utils.ts**

创建文件 `packages/desktop/src/renderer/utils/error-utils.ts`：

```typescript
/**
 * Error handling utilities for desktop app
 */

/**
 * Check if error is a "denied" type (user rejected permission, etc.)
 */
export function isDeniedError(error: string | undefined | null): boolean {
  if (!error) return false
  return (
    error.includes("QuestionRejectedError") ||
    error.includes("rejected permission") ||
    error.includes("specified a rule") ||
    error.includes("user dismissed")
  )
}

/**
 * Extract error message from various error formats
 * Supports: string, { type, message }, { message }
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
  }
  return 'Unknown error'
}

/**
 * Check if error object is denied type
 */
export function isDeniedErrorObject(error: { type: string; message: string } | null | undefined): boolean {
  return isDeniedError(error?.message)
}
```

- [ ] **Step 2: 提交工具函数**

```bash
git add packages/desktop/src/renderer/utils/error-utils.ts
git commit -m "feat(desktop): add error utility functions (isDeniedError, getErrorMessage)"
```

---

### Task 5: 修改 InlineTool 组件

**Files:**
- Modify: `packages/desktop/src/renderer/components/part/InlineTool.vue`

**Interfaces:**
- Consumes: `getErrorMessage()`, `isDeniedErrorObject()`（Task 4）

- [ ] **Step 1: 导入工具函数并修改 props 类型**

修改 `packages/desktop/src/renderer/components/part/InlineTool.vue`：

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ICON_RUNNING, ICON_COMPLETED, ICON_ERROR, ICON_PENDING } from '../../tool/icons'
import { getErrorMessage, isDeniedErrorObject } from '../../utils/error-utils'

const props = defineProps<{
  icon: string
  summary: string
  pending: string
  status: 'pending' | 'running' | 'completed' | 'error'
  error?: string | { type: string; message: string }  // 改为兼容格式
  hideStatusIcon?: boolean
}>()

const emit = defineEmits<{ click: [] }>()
const errorExpanded = ref(false)

// 新增：提取错误消息
const errorMessage = computed(() => getErrorMessage(props.error))

// 新增：判断是否为 denied 状态
const isDenied = computed(() => {
  if (typeof props.error === 'object' && props.error !== null) {
    return isDeniedErrorObject(props.error)
  }
  return false
})

const statusIcon = computed(() => {
  switch (props.status) {
    case 'running': return { char: ICON_RUNNING, class: 'text-warning animate-pulse' }
    case 'completed': return { char: ICON_COMPLETED, class: 'text-success' }
    case 'error': return { char: ICON_ERROR, class: isDenied.value ? 'text-text-muted' : 'text-error' }
    default: return { char: ICON_PENDING, class: 'text-text-muted' }
  }
})

const handleClick = () => {
  if (props.error) errorExpanded.value = !errorExpanded.value
  emit('click')
}
</script>
```

- [ ] **Step 2: 修改模板，增加 denied 样式**

```vue
<template>
  <div class="inline-tool flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-bg-surface" @click="handleClick">
    <template v-if="status === 'running'">
      <span class="animate-pulse text-warning">●</span>
      <span class="text-sm text-text-muted">{{ pending }}</span>
    </template>
    <template v-else>
      <span v-if="!hideStatusIcon" :class="['text-sm w-4 text-center', statusIcon.class]">{{ statusIcon.char }}</span>
      <span v-if="icon" class="text-xs text-accent w-4 text-center">{{ icon }}</span>
      <span 
        :class="['text-xs text-text-primary flex-1 truncate', { 'line-through text-text-muted': isDenied }]" 
        v-html="summary"
      ></span>
    </template>
  </div>
  <div 
    v-if="errorMessage && errorExpanded" 
    :class="['error-detail ml-8 mt-1 text-xs p-2 rounded', isDenied ? 'text-text-muted bg-bg-surface' : 'text-error bg-error/10']"
  >{{ errorMessage }}</div>
</template>

<style scoped>
.animate-pulse { animation: icon-pulse 1.5s ease-in-out infinite; }
@keyframes icon-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>
```

- [ ] **Step 3: 提交 InlineTool 修改**

```bash
git add packages/desktop/src/renderer/components/part/InlineTool.vue
git commit -m "feat(desktop): add denied error styling to InlineTool"
```

---

### Task 6: 修改 BlockTool 组件

**Files:**
- Modify: `packages/desktop/src/renderer/components/part/BlockTool.vue`

**Interfaces:**
- Consumes: `getErrorMessage()`, `isDeniedErrorObject()`（Task 4）

- [ ] **Step 1: 导入工具函数并修改 props 类型**

修改 `packages/desktop/src/renderer/components/part/BlockTool.vue`：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import CollapsiblePanel from './CollapsiblePanel.vue'
import { getErrorMessage, isDeniedErrorObject } from '../../utils/error-utils'

const props = defineProps<{
  title: string
  body: string
  status: 'pending' | 'running' | 'completed' | 'error'
  error?: string | { type: string; message: string }  // 改为兼容格式
}>()

const emit = defineEmits<{ click: [] }>()
const maxLines = 15

const collapsed = computed(() => {
  if (!props.body) return { output: '', overflow: false, lineCount: 0 }
  const lines = props.body.split('\n')
  if (lines.length <= maxLines) return { output: props.body, overflow: false, lineCount: lines.length }
  return { output: lines.slice(0, maxLines).join('\n') + '\n…', overflow: true, lineCount: lines.length }
})

// 新增：提取错误消息
const errorMessage = computed(() => getErrorMessage(props.error))

// 新增：判断是否为 denied 状态
const isDenied = computed(() => {
  if (typeof props.error === 'object' && props.error !== null) {
    return isDeniedErrorObject(props.error)
  }
  return false
})
</script>
```

- [ ] **Step 2: 修改模板，增加 denied 样式**

```vue
<template>
  <CollapsiblePanel :title="title" :spinner="status === 'running'" :default-collapsed="!body">
    <template #header-extra>
      <span v-if="status === 'running'" class="text-xs text-text-muted ml-2">running...</span>
      <span v-else-if="collapsed.lineCount" class="text-xs text-text-muted ml-2">{{ collapsed.lineCount }} 行</span>
    </template>
    <template #body>
      <pre v-if="body" class="text-xs font-mono text-text overflow-auto bg-bg-code p-2 rounded max-h-[400px]">{{ body }}</pre>
      <div v-if="!body && !errorMessage" class="text-xs text-text-muted p-2">（无输出）</div>
      <div 
        v-if="errorMessage" 
        :class="['error mt-2 text-xs p-2 rounded', isDenied ? 'line-through text-text-muted bg-bg-surface' : 'text-error bg-error/10']"
      >{{ errorMessage }}</div>
    </template>
  </CollapsiblePanel>
</template>
```

- [ ] **Step 3: 提交 BlockTool 修改**

```bash
git add packages/desktop/src/renderer/components/part/BlockTool.vue
git commit -m "feat(desktop): add denied error styling to BlockTool"
```

---

### Task 7: 新增 MessageError 组件

**Files:**
- Create: `packages/desktop/src/renderer/components/part/MessageError.vue`

**Interfaces:**
- Consumes: `Message.error` 类型（Task 1）

- [ ] **Step 1: 创建 MessageError.vue**

创建文件 `packages/desktop/src/renderer/components/part/MessageError.vue`：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { getErrorMessage } from '../../utils/error-utils'

const props = defineProps<{
  error: { type: string; message: string }
}>()

const errorMessage = computed(() => props.error.message)
</script>

<template>
  <div class="message-error text-xs text-error bg-error/10 p-2 rounded mt-2">
    {{ errorMessage }}
  </div>
</template>
```

- [ ] **Step 2: 提交 MessageError 组件**

```bash
git add packages/desktop/src/renderer/components/part/MessageError.vue
git commit -m "feat(desktop): add MessageError component for step-level errors"
```

---

### Task 8: 集成消息级错误展示

**Files:**
- Modify: `packages/desktop/src/renderer/components/part/PartRenderer.vue` 或消息渲染组件

**Interfaces:**
- Consumes: `MessageError` 组件（Task 7）
- Consumes: `StreamingState.stepError`（Task 1, 2）

- [ ] **Step 1: 找到消息渲染组件，在底部引入 MessageError**

需要先确认消息渲染组件位置，可能需要查看：
- `packages/desktop/src/renderer/components/part/PartRenderer.vue`
- 或 session 相关的渲染组件

在消息渲染底部增加：

```vue
<MessageError v-if="stepError" :error="stepError" />
```

- [ ] **Step 2: 提交集成修改**

```bash
git add packages/desktop/src/renderer/components/
git commit -m "feat(desktop): integrate MessageError into message rendering"
```

---

### Task 9: 修改 streamingToolToToolCall

**Files:**
- Modify: `packages/desktop/src/renderer/stores/streaming/types.ts:224-263`

**Interfaces:**
- Consumes: `StreamingToolCall.error` 对象类型（Task 1）

- [ ] **Step 1: 修改 streamingToolToToolCall 函数**

修改 `packages/desktop/src/renderer/stores/streaming/types.ts:250-262`：

```typescript
if (tool.error && !output.result) {
  output.result = { error: typeof tool.error === 'string' ? tool.error : tool.error.message }
}

return {
  id: tool.id,
  name: tool.name,
  status: mapLifecycleToStatus(tool.lifecycle),
  args,
  output: output.result || output.content || output.structured ? output : undefined,
  error: tool.error,  // 直接传递对象
  duration: tool.endedAt && tool.startedAt ? tool.endedAt - tool.startedAt : undefined,
}
```

- [ ] **Step 2: 提交修改**

```bash
git add packages/desktop/src/renderer/stores/streaming/types.ts
git commit -m "fix(desktop): pass complete error object in streamingToolToToolCall"
```

---

### Task 10: 修改 ToolDisplay 传递 error

**Files:**
- Modify: `packages/desktop/src/renderer/components/part/ToolDisplay.vue:39,47,109`

**Interfaces:**
- Consumes: `ToolCall.error` 兼容格式（Task 1）
- Consumes: `getErrorMessage()`（Task 4）

- [ ] **Step 1: 确保 inlineProps 和 blockProps 传递完整 error**

修改 `packages/desktop/src/renderer/components/part/ToolDisplay.vue:34-48`：

```typescript
const inlineProps = computed(() => ({
  icon: meta.value.icon,
  summary: meta.value.summary(props.tool),
  pending: meta.value.pending,
  status: props.tool.status,
  error: props.tool.error,  // 直接传递
  hideStatusIcon: (meta.value as any).hideStatusIcon ?? false
}))

const blockProps = computed(() => ({
  title: meta.value.title(props.tool),
  body: meta.value.detail(props.tool),
  status: props.tool.status,
  error: props.tool.error  // 直接传递
}))
```

- [ ] **Step 2: 确保 editBlockProps 传递 error**

修改 `packages/desktop/src/renderer/components/part/ToolDisplay.vue:103-111`：

```typescript
return {
  title: meta.value.title(props.tool),
  body: meta.value.detail(props.tool),
  filePath,
  diff,
  status: props.tool.status,
  error: props.tool.error  // 直接传递
}
```

- [ ] **Step 3: 提交修改**

```bash
git add packages/desktop/src/renderer/components/part/ToolDisplay.vue
git commit -m "fix(desktop): pass complete error object in ToolDisplay"
```

---

## Verification

实现完成后，验证：

1. 流式工具失败时，error 包含 `{ type, message }`
2. 历史消息加载时，error 包含完整信息
3. denied 错误显示删除线 + 灰色文字
4. 消息级错误在消息底部显示