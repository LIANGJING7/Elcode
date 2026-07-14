# Desktop Error Handling Design

## Overview

完善桌面端的错误捕获和展示，与 TUI 对齐。

## Scope

### 工具级别错误（TOOL_FAILED）
- 保存完整 error 对象（type + message）
- 识别 "denied" 状态并特殊展示

### 消息级别错误（STEP_FAILED / Message.error）
- 数据来源：流式事件 + 历史消息
- 在消息底部展示

## Data Layer

### 1. streaming/types.ts

**行 88** - StreamingToolCall.error 改为对象：
```typescript
// 改前
error: string | null

// 改后
error: { type: string; message: string } | null
```

**行 13-30** - StreamingState 增加 stepError：
```typescript
export interface StreamingState {
  // ... 其他字段不变
  stepError: { type: string; message: string } | null  // 新增
}
```

**行 129** - STEP_FAILED action 类型修改：
```typescript
// 改前
| { type: 'STEP_FAILED'; error: string; version: number }

// 改后
| { type: 'STEP_FAILED'; error: { type: string; message: string }; version: number }
```

### 2. types/ipc.ts

**行 97-112** - Message 增加 error 字段：
```typescript
export interface Message {
  // ... 其他字段不变
  error?: {
    type: string
    message: string
  }
}
```

**行 146** - ToolCall.error 支持两种格式（兼容历史数据）：
```typescript
// 改前
error?: string

// 改后（兼容旧格式）
error?: string | { type: string; message: string }
```

### 3. main/ipc/handlers-session.ts

**行 89** - toToolCall 参数类型修改：
```typescript
// 改前
error?: { message?: string }

// 改后
error?: { type: string; message: string }
```

**行 177** - TOOL_FAILED 历史消息转换，保存完整 error：
```typescript
// 改前
...(state?.error?.message ? { error: state.error.message } : {}),

// 改后
...(state?.error ? { error: state.error } : {}),
```

**行 372-381** - toMessage 转换，新增 error 字段：
```typescript
return {
  id: msg.id,
  role: 'assistant',
  content,
  ...(msg.error ? { error: msg.error } : {}),  // 新增
}
```

### 4. streaming/reducer.ts

**行 228** - TOOL_FAILED 保存完整对象：
```typescript
// 改前
toolForFailed.error = action.error.message

// 改后
toolForFailed.error = action.error
```

**行 61-63** - STEP_FAILED 保存消息级错误：
```typescript
case 'STEP_FAILED':
  state.stepError = action.error
  return state
```

### 4. streaming/normalizer.ts

**session.next.step.failed** - 传递完整 error 对象：
```typescript
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

## Data Flow

```
后端 TOOL_FAILED: { type: "unknown", message: string }
    ↓
normalizer.ts:302-310 ✓ 已正确转换
    ↓
reducer.ts:228 → 保存完整 error 对象
    ↓
store → StreamingToolCall.error: { type, message } | null
    ↓
streamingToolToToolCall:260 → ToolCall.error: { type, message }
    ↓
ToolDisplay → InlineTool/BlockTool → props.error: { type, message }
```

## Presentation Layer

### 1. utils/error-utils.ts（新增）

```typescript
/**
 * 判断是否为"已拒绝"类错误
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
 * 从 error 中提取 message（兼容旧格式）
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as { message: string }).message
  }
  return 'Unknown error'
}
```

### 2. InlineTool.vue

- 判断 denied 状态
- denied 时使用删除线 + 灰色文字

```vue
<script setup lang="ts">
import { isDeniedError } from '../../utils/error-utils'

const isDenied = computed(() => isDeniedError(props.error))
</script>

<template>
  <!-- error 文案增加样式 -->
  <span :class="{ 'line-through text-text-muted': isDenied }">
    {{ error }}
  </span>
</template>
```

### 3. BlockTool.vue

同 InlineTool，错误文本增加 denied 样式判断。

### 4. MessageError.vue（新增）

消息底部错误展示组件：

```vue
<script setup lang="ts">
defineProps<{
  error: { type: string; message: string }
}>()
</script>

<template>
  <div class="message-error text-xs text-error p-2">
    {{ error.message }}
  </div>
</template>
```

### 5. 消息底部集成

在消息渲染组件底部引入 MessageError，显示 `stepError` 或 `message.error`。

## Error Type

后端目前 `error.type` 固定返回 `"unknown"`，桌面端保存该字段为未来扩展预留。

## Denied Error Types

识别以下 4 种情况为 "denied" 状态：
- `QuestionRejectedError`
- `rejected permission`
- `specified a rule`
- `user dismissed`

denied 状态展示样式：删除线 + 灰色文字。

## Type Compatibility

修改后 `ToolCall.error` 和 `StreamingToolCall.error` 变为对象类型。

### 需要验证的调用点

| 文件 | 行号 | 说明 |
|------|------|------|
| InlineTool.vue | 10 | props.error 类型需改为对象 |
| BlockTool.vue | 9 | props.error 类型需改为对象 |
| ToolDisplay.vue | 39, 47 | error 传递需使用 getErrorMessage |
| streamingToolToToolCall | 260 | error 提取需兼容两种格式 |

### 兼容方案

`ToolCall.error` 支持两种格式（兼容历史数据）：
```typescript
error?: string | { type: string; message: string }
```

组件中使用 `getErrorMessage()` 统一处理：
```typescript
const errorMsg = getErrorMessage(props.error)
```

## File Changes

```
packages/desktop/src/renderer/stores/streaming/types.ts     # StreamingToolCall.error 改对象，增加 stepError，修改 STEP_FAILED action 类型
packages/desktop/src/types/ipc.ts                           # Message 增加 error 字段，ToolCall.error 兼容格式
packages/desktop/src/main/ipc/handlers-session.ts           # toToolCall/toMessage 保存完整 error
packages/desktop/src/renderer/stores/streaming/reducer.ts   # 保存完整 error，处理 STEP_FAILED
packages/desktop/src/renderer/stores/streaming/normalizer.ts # session.next.step.failed 传递完整 error 对象
packages/desktop/src/renderer/utils/error-utils.ts          # 新增：isDeniedError, getErrorMessage
packages/desktop/src/renderer/components/part/InlineTool.vue # denied 样式
packages/desktop/src/renderer/components/part/BlockTool.vue  # denied 样式
packages/desktop/src/renderer/components/part/MessageError.vue # 新增：消息级错误展示
```