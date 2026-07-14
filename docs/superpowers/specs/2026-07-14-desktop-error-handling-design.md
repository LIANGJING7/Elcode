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

```typescript
// StreamingToolCall.error 改为对象
export interface StreamingToolCall {
  // ... 其他字段不变
  error: {
    type: string
    message: string
  } | null
}

// StreamingState 增加 stepError
export interface StreamingState {
  // ... 其他字段不变
  stepError: {
    type: string
    message: string
  } | null
}
```

### 2. types/ipc.ts

```typescript
export interface Message {
  // ... 其他字段不变
  error?: {
    type: string
    message: string
  }
}
```

### 3. streaming/reducer.ts

```typescript
// TOOL_FAILED - 保存完整对象
case 'TOOL_FAILED':
  toolForFailed.error = action.error  // { type, message }

// STEP_FAILED - 保存消息级错误
case 'STEP_FAILED':
  state.stepError = {
    type: 'unknown',
    message: action.error
  }
```

## Presentation Layer

### 1. utils/error-utils.ts（新增）

```typescript
export function isDeniedError(error: string | undefined | null): boolean {
  if (!error) return false
  return (
    error.includes("QuestionRejectedError") ||
    error.includes("rejected permission") ||
    error.includes("specified a rule") ||
    error.includes("user dismissed")
  )
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

## File Changes

```
packages/desktop/src/renderer/stores/streaming/types.ts     # 修改
packages/desktop/src/types/ipc.ts                           # 修改
packages/desktop/src/renderer/stores/streaming/reducer.ts   # 修改
packages/desktop/src/renderer/utils/error-utils.ts          # 新增
packages/desktop/src/renderer/components/part/InlineTool.vue # 修改
packages/desktop/src/renderer/components/part/BlockTool.vue  # 修改
packages/desktop/src/renderer/components/part/MessageError.vue # 新增
```