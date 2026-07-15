# Desktop App Question Handling Design

Date: 2026-07-15

## Overview

为桌面端添加 question 交互功能，参考 TUI 的实现。当 AI 需要用户回答问题时，在底部显示 QuestionPanel 替换 Composer，用户必须回答或拒绝才能继续。

## Architecture

```
Backend SSE
    ↓ question.asked
normalizer.ts → QUESTION_ASKED action
    ↓
reducer.ts → questionStore.addQuestion()
    ↓
ChatView.vue → 渲染 QuestionPanel（替换 Composer）
    ↓ 用户选择
questionStore.reply() / reject()
    ↓
IPC → POST /question/{requestID}/reply 或 /reject
    ↓
Backend 处理 → question.replied 事件
    ↓
normalizer.ts → QUESTION_RESOLVED action
    ↓
questionStore.removeQuestion() → 切换回 Composer
```

## Data Structures

### 接收事件（Backend → Frontend）

**question.asked**:
```ts
{
  id: string              // 事件 ID
  type: "question.asked"
  properties: {
    id: string            // requestID（用于回复）
    sessionID: string     // 会话 ID
    questions: QuestionInfo[]
    tool?: {
      messageID: string
      callID: string
    }
  }
}
```

**QuestionInfo**:
```ts
{
  question: string        // 完整问题
  header: string          // 短标签（max 30 chars）
  options: QuestionOption[]
  multiple?: boolean      // 是否多选
  custom?: boolean        // 是否允许自定义输入
}
```

**QuestionOption**:
```ts
{
  label: string           // 显示文本
  description: string     // 解释说明
}
```

### 发送请求（Frontend → Backend）

**question.reply**:
```ts
{
  requestID: string       // 必填
  directory?: string      // 可选
  workspace?: string      // 可选
  answers?: string[][]    // QuestionAnswer[]
}
```

**question.reject**:
```ts
{
  requestID: string       // 必填
  directory?: string
  workspace?: string
}
```

## File Changes

### New Files

| 文件 | 职责 |
|------|------|
| `stores/question.ts` | Pinia store，管理 question 状态，按 sessionID 索引 |
| `components/question/QuestionPanel.vue` | Question 面板 UI |

### Modified Files

| 文件 | 修改内容 |
|------|----------|
| `stores/streaming/normalizer.ts` | 添加 `question.asked` / `question.replied` / `question.rejected` 事件解析 |
| `stores/streaming/reducer.ts` | 添加 `QUESTION_ASKED` / `QUESTION_RESOLVED` action 处理 |
| `components/chat/ChatView.vue` | 条件渲染 QuestionPanel 或 Composer |
| `main/ipc/handlers-session.ts` | 添加 `questionReply` / `questionReject` IPC |
| `preload/index.d.ts` | 添加类型声明 |

## Store Design

### `stores/question.ts`

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from './session'

export interface QuestionRequest {
  id: string
  sessionID: string
  questions: QuestionInfo[]
  tool?: QuestionTool
}

export interface QuestionInfo {
  question: string
  header: string
  options: QuestionOption[]
  multiple?: boolean
  custom?: boolean
}

export interface QuestionOption {
  label: string
  description: string
}

export interface QuestionTool {
  messageID: string
  callID: string
}

export const useQuestionStore = defineStore('question', () => {
  const requests = ref<Map<string, QuestionRequest>>(new Map())
  const sessionStore = useSessionStore()
  
  const current = computed(() => {
    const sessionID = sessionStore.currentSessionId
    return sessionID ? requests.value.get(sessionID) ?? null : null
  })
  
  const hasPending = computed(() => current.value !== null)
  
  function addQuestion(request: QuestionRequest) {
    requests.value.set(request.sessionID, request)
  }
  
  function removeQuestion(sessionID: string, requestID: string) {
    const existing = requests.value.get(sessionID)
    if (existing?.id === requestID) {
      requests.value.delete(sessionID)
    }
  }
  
  async function reply(answers: string[][]) {
    const question = current.value
    if (!question) return
    await window.desktop.session.questionReply({
      requestID: question.id,
      answers
    })
    requests.value.delete(question.sessionID)
  }
  
  async function reject() {
    const question = current.value
    if (!question) return
    await window.desktop.session.questionReject({
      requestID: question.id
    })
    requests.value.delete(question.sessionID)
  }
  
  return {
    requests,
    current,
    hasPending,
    addQuestion,
    removeQuestion,
    reply,
    reject
  }
})
```

## Event Normalization

### `stores/streaming/normalizer.ts`

```ts
// 新增事件解析
case 'question.asked':
  return {
    type: 'QUESTION_ASKED',
    request: {
      id: props.id,
      sessionID: props.sessionID,
      questions: props.questions,
      tool: props.tool
    },
    version
  }

case 'question.replied':
case 'question.rejected':
  return {
    type: 'QUESTION_RESOLVED',
    sessionID: props.sessionID,
    requestID: props.requestID,
    version
  }
```

### `stores/streaming/reducer.ts`

```ts
// 新增 action 处理
case 'QUESTION_ASKED':
  questionStore.addQuestion(action.request)
  return state

case 'QUESTION_RESOLVED':
  questionStore.removeQuestion(action.sessionID, action.requestID)
  return state
```

## UI Component

### `components/question/QuestionPanel.vue`

- 支持单题模式（选择即提交）和多题模式（Tab 切换 + Confirm）
- 支持多选（`multiple: true`）
- 支持自定义输入（`custom: true`）
- Dismiss 按钮拒绝问题

### `components/chat/ChatView.vue`

```vue
<template>
  <div class="chat-view flex flex-col h-full">
    <ChatTimeline ... />
    <QuestionPanel v-if="questionStore.hasPending" />
    <Composer v-else ... />
  </div>
</template>
```

## IPC Handlers

### `main/ipc/handlers-session.ts`

```ts
ipcMain.handle('session:questionReply', async (_, params) => {
  const client = getBackendClient()
  await client.question.reply({
    requestID: params.requestID,
    directory: params.directory,
    workspace: params.workspace,
    answers: params.answers
  })
})

ipcMain.handle('session:questionReject', async (_, params) => {
  const client = getBackendClient()
  await client.question.reject({
    requestID: params.requestID,
    directory: params.directory,
    workspace: params.workspace
  })
})
```

## Session Switching

- Question 按 `sessionID` 存储在 `questionStore.requests`
- 切换会话时，`current` computed 自动切换到目标会话的 question
- 如果目标会话无 pending question，显示 Composer
- 支持跨会话保持 question 状态

## Interaction Behavior

- Question 到达时，必须回答或拒绝才能继续
- Dismiss 按钮调用 `question.reject` API
- 单题模式：选择选项即提交
- 多题模式：Tab 切换各问题，Confirm 页面确认提交

## Reference

- TUI 实现: `packages/core/src/cli/cmd/run/footer.question.tsx`
- TUI 状态机: `packages/core/src/cli/cmd/run/question.shared.ts`
- SDK 类型: `packages/core/src/sdk/v2/gen/types.gen.ts`