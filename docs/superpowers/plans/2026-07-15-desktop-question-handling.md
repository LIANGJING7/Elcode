# Desktop Question Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add question interaction feature to desktop app, allowing users to respond to AI questions via a bottom panel.

**Architecture:** Pinia store manages question state by sessionID. SSE events flow through normalizer → reducer → questionStore. QuestionPanel replaces Composer when question is pending. IPC handlers call backend API.

**Tech Stack:** Vue 3, Pinia, TypeScript, Electron IPC

## Global Constraints

- Event field names must match SDK: `requestID`, `sessionID`, `answers`
- QuestionRequest structure matches TUI: `{ id, sessionID, questions, tool? }`
- API parameters match SDK: `question.reply({ requestID, answers? })`, `question.reject({ requestID })`

---

## File Structure

### New Files
- `packages/desktop/src/renderer/stores/question.ts` - Pinia store for question state
- `packages/desktop/src/renderer/components/question/QuestionPanel.vue` - Question UI panel

### Modified Files
- `packages/desktop/src/renderer/stores/streaming/normalizer.ts` - Add question event parsing
- `packages/desktop/src/renderer/stores/streaming/reducer.ts` - Add QUESTION_ASKED/RESOLVED actions
- `packages/desktop/src/renderer/stores/streaming/types.ts` - Add action types
- `packages/desktop/src/renderer/stores/streaming/store.ts` - Import questionStore
- `packages/desktop/src/renderer/components/chat/ChatView.vue` - Conditional render QuestionPanel
- `packages/desktop/src/main/ipc/handlers-session.ts` - Add questionReply/questionReject IPC
- `packages/desktop/src/preload/index.d.ts` - Add type declarations

---

### Task 1: Add Question Action Types

**Files:**
- Modify: `packages/desktop/src/renderer/stores/streaming/types.ts`

**Interfaces:**
- Produces: `QUESTION_ASKED` and `QUESTION_RESOLVED` action types for reducer

- [ ] **Step 1: Add action types to StreamAction union**

```ts
// In packages/desktop/src/renderer/stores/streaming/types.ts
// Add to StreamAction union type (around line 180)

export type StreamAction =
  | { type: 'STREAM_START'; messageId: string; version: number }
  | { type: 'STREAM_END'; version: number }
  | { type: 'TEXT_STARTED'; partId: string; messageId: string; version: number }
  // ... existing actions ...
  | { type: 'QUESTION_ASKED'; request: QuestionRequest; version: number }
  | { type: 'QUESTION_RESOLVED'; sessionID: string; requestID: string; version: number }

// Add types at top of file (after imports)
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
```

- [ ] **Step 2: Verify types compile**

Run: `cd packages/desktop && npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/stores/streaming/types.ts
git commit -m "feat(question): add question action types"
```

---

### Task 2: Create Question Store

**Files:**
- Create: `packages/desktop/src/renderer/stores/question.ts`

**Interfaces:**
- Produces: `useQuestionStore()` with `current`, `hasPending`, `addQuestion()`, `removeQuestion()`, `reply()`, `reject()`

- [ ] **Step 1: Create question store file**

```ts
// packages/desktop/src/renderer/stores/question.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from './session'
import type { QuestionRequest } from './streaming/types'

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

- [ ] **Step 2: Verify store compiles**

Run: `cd packages/desktop && npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/stores/question.ts
git commit -m "feat(question): add question pinia store"
```

---

### Task 3: Add Event Normalization

**Files:**
- Modify: `packages/desktop/src/renderer/stores/streaming/normalizer.ts`

**Interfaces:**
- Consumes: SSE event with `type: 'question.asked'` or `'question.replied'` or `'question.rejected'`
- Produces: `QUESTION_ASKED` and `QUESTION_RESOLVED` actions

- [ ] **Step 1: Add question event parsing to normalizer**

```ts
// In packages/desktop/src/renderer/stores/streaming/normalizer.ts
// Add inside the createNormalizer function, in the main switch statement
// After the 'session.next.step.failed' case (around line 364)

    // Question events
    case 'question.asked':
      return {
        type: 'QUESTION_ASKED',
        request: {
          id: props.id as string,
          sessionID: props.sessionID as string,
          questions: props.questions as QuestionInfo[],
          tool: props.tool as QuestionTool | undefined
        },
        version
      }

    case 'question.replied':
    case 'question.rejected':
      return {
        type: 'QUESTION_RESOLVED',
        sessionID: props.sessionID as string,
        requestID: props.requestID as string,
        version
      }
```

- [ ] **Step 2: Add imports at top of file**

```ts
// Add to imports at top of packages/desktop/src/renderer/stores/streaming/normalizer.ts
import type { QuestionInfo, QuestionTool } from './types'
```

- [ ] **Step 3: Verify normalizer compiles**

Run: `cd packages/desktop && npm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/renderer/stores/streaming/normalizer.ts
git commit -m "feat(question): add question event normalization"
```

---

### Task 4: Add Reducer Actions

**Files:**
- Modify: `packages/desktop/src/renderer/stores/streaming/reducer.ts`

**Interfaces:**
- Consumes: `QUESTION_ASKED` and `QUESTION_RESOLVED` actions
- Produces: Calls to `questionStore.addQuestion()` and `removeQuestion()`

- [ ] **Step 1: Add question store import**

```ts
// Add to imports at top of packages/desktop/src/renderer/stores/streaming/reducer.ts
import { useQuestionStore } from '../question'
```

- [ ] **Step 2: Add action handlers in reducer**

```ts
// In packages/desktop/src/renderer/stores/streaming/reducer.ts
// Add inside the streamingReducer function, in the switch statement
// After the 'STEP_FAILED' case (around line 65)

    case 'QUESTION_ASKED': {
      const questionStore = useQuestionStore()
      questionStore.addQuestion(action.request)
      return state
    }

    case 'QUESTION_RESOLVED': {
      const questionStore = useQuestionStore()
      questionStore.removeQuestion(action.sessionID, action.requestID)
      return state
    }
```

- [ ] **Step 3: Verify reducer compiles**

Run: `cd packages/desktop && npm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/renderer/stores/streaming/reducer.ts
git commit -m "feat(question): add question action handlers in reducer"
```

---

### Task 5: Add IPC Handlers

**Files:**
- Modify: `packages/desktop/src/main/ipc/handlers-session.ts`

**Interfaces:**
- Consumes: `window.desktop.session.questionReply(params)` from renderer
- Produces: POST to `/question/{requestID}/reply` and `/question/{requestID}/reject`

- [ ] **Step 1: Add questionReply IPC handler**

```ts
// In packages/desktop/src/main/ipc/handlers-session.ts
// Add at end of registerIpcHandlers function (before the last closing brace)

  // Question reply
  ipcMain.handle('session:questionReply', async (_, params: {
    requestID: string
    directory?: string
    workspace?: string
    answers?: string[][]
  }) => {
    const client = getBackendClient()
    await client.question.reply({
      requestID: params.requestID,
      directory: params.directory,
      workspace: params.workspace,
      answers: params.answers
    })
  })

  // Question reject
  ipcMain.handle('session:questionReject', async (_, params: {
    requestID: string
    directory?: string
    workspace?: string
  }) => {
    const client = getBackendClient()
    await client.question.reject({
      requestID: params.requestID,
      directory: params.directory,
      workspace: params.workspace
    })
  })
```

- [ ] **Step 2: Verify handlers compile**

Run: `cd packages/desktop && npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/main/ipc/handlers-session.ts
git commit -m "feat(question): add questionReply and questionReject IPC handlers"
```

---

### Task 6: Add Preload Type Declarations

**Files:**
- Modify: `packages/desktop/src/preload/index.d.ts`

**Interfaces:**
- Produces: TypeScript declarations for `window.desktop.session.questionReply` and `questionReject`

- [ ] **Step 1: Add type declarations to preload**

```ts
// In packages/desktop/src/preload/index.d.ts
// Find the session interface and add these methods

interface DesktopSessionApi {
  // ... existing methods ...
  
  questionReply(params: {
    requestID: string
    answers?: string[][]
  }): Promise<void>
  
  questionReject(params: {
    requestID: string
  }): Promise<void>
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd packages/desktop && npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/preload/index.d.ts
git commit -m "feat(question): add questionReply and questionReject type declarations"
```

---

### Task 7: Create QuestionPanel Component

**Files:**
- Create: `packages/desktop/src/renderer/components/question/QuestionPanel.vue`

**Interfaces:**
- Consumes: `questionStore.current`, `questionStore.reply()`, `questionStore.reject()`
- Produces: UI for selecting options and submitting answers

- [ ] **Step 1: Create question directory**

```bash
mkdir -p packages/desktop/src/renderer/components/question
```

- [ ] **Step 2: Create QuestionPanel.vue**

```vue
<!-- packages/desktop/src/renderer/components/question/QuestionPanel.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuestionStore } from '../../stores/question'

const questionStore = useQuestionStore()
const request = computed(() => questionStore.current)

const tab = ref(0)
const answers = ref<string[][]>([])
const selected = ref(0)
const submitting = ref(false)

const single = computed(() => 
  request.value?.questions.length === 1 && 
  !request.value.questions[0]?.multiple
)

const currentQuestion = computed(() => 
  request.value?.questions[tab.value]
)

const isConfirmTab = computed(() => 
  request.value && tab.value === request.value.questions.length
)

watch(request, () => {
  tab.value = 0
  answers.value = []
  selected.value = 0
}, { immediate: true })

async function handleReply() {
  if (submitting.value) return
  submitting.value = true
  try {
    await questionStore.reply(answers.value)
  } finally {
    submitting.value = false
  }
}

async function handleReject() {
  if (submitting.value) return
  submitting.value = true
  try {
    await questionStore.reject()
  } finally {
    submitting.value = false
  }
}

function selectOption(index: number) {
  const q = currentQuestion.value
  if (!q) return
  
  if (q.multiple) {
    const list = answers.value[tab.value] ?? []
    const idx = list.indexOf(q.options[index].label)
    if (idx === -1) {
      answers.value[tab.value] = [...list, q.options[index].label]
    } else {
      answers.value[tab.value] = list.filter((_, i) => i !== idx)
    }
  } else {
    answers.value[tab.value] = [q.options[index].label]
    if (single.value) {
      handleReply()
    } else {
      tab.value = Math.min(tab.value + 1, (request.value?.questions.length ?? 1))
    }
  }
}

function isOptionSelected(index: number): boolean {
  const q = currentQuestion.value
  if (!q) return false
  return answers.value[tab.value]?.includes(q.options[index].label) ?? false
}
</script>

<template>
  <div v-if="request" class="question-panel p-4 mx-6 mb-6 bg-bg-elevated rounded-2xl border border-border">
    <!-- Tabs for multi-question -->
    <div v-if="!single" class="tabs flex gap-2 mb-4 overflow-x-auto">
      <button
        v-for="(q, i) in request.questions"
        :key="i"
        :class="[
          'tab px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors',
          tab === i ? 'bg-accent text-white' : 'bg-bg-hover text-text-muted hover:text-text-primary'
        ]"
        @click="tab = i"
      >
        {{ q.header }}
        <span v-if="answers[i]?.length" class="ml-1 text-xs opacity-70">✓</span>
      </button>
      <button
        :class="[
          'tab px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors',
          isConfirmTab ? 'bg-accent text-white' : 'bg-bg-hover text-text-muted hover:text-text-primary'
        ]"
        @click="tab = request.questions.length"
      >
        Confirm
      </button>
    </div>

    <!-- Question content -->
    <div v-if="!isConfirmTab" class="question-content">
      <p class="text-text-primary mb-4">{{ currentQuestion?.question }}</p>
      <p v-if="currentQuestion?.multiple" class="text-text-muted text-sm mb-3">
        Select all that apply
      </p>

      <div class="options space-y-2">
        <button
          v-for="(opt, i) in currentQuestion?.options"
          :key="i"
          :class="[
            'option w-full text-left p-3 rounded-lg border transition-colors',
            isOptionSelected(i) 
              ? 'border-accent bg-accent/10' 
              : 'border-border hover:border-border-light bg-bg-surface'
          ]"
          :disabled="submitting"
          @click="selectOption(i)"
        >
          <div class="flex items-center gap-2">
            <span 
              :class="[
                'w-4 h-4 rounded border flex items-center justify-center text-xs',
                isOptionSelected(i) 
                  ? 'border-accent bg-accent text-white' 
                  : 'border-border-muted'
              ]"
            >
              {{ currentQuestion?.multiple ? (isOptionSelected(i) ? '✓' : '') : (i + 1) }}
            </span>
            <span class="font-medium text-text-primary">{{ opt.label }}</span>
          </div>
          <p v-if="opt.description" class="text-text-muted text-sm mt-1 ml-6">
            {{ opt.description }}
          </p>
        </button>
      </div>
    </div>

    <!-- Confirm page -->
    <div v-else class="confirm-content">
      <p class="text-text-primary mb-4">Review your answers:</p>
      <div class="space-y-2">
        <div v-for="(q, i) in request.questions" :key="i" class="p-3 bg-bg-surface rounded-lg">
          <span class="text-text-muted text-sm">{{ q.header }}:</span>
          <span class="text-text-primary ml-2">
            {{ answers[i]?.join(', ') || '(not answered)' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions flex justify-end gap-2 mt-4 pt-4 border-t border-border">
      <button
        class="px-4 py-2 rounded-lg bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
        :disabled="submitting"
        @click="handleReject"
      >
        Dismiss
      </button>
      <button
        v-if="!single || isConfirmTab"
        class="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        :disabled="submitting"
        @click="handleReply"
      >
        {{ submitting ? 'Submitting...' : 'Submit' }}
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Verify component compiles**

Run: `cd packages/desktop && npm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/renderer/components/question/
git commit -m "feat(question): add QuestionPanel component"
```

---

### Task 8: Integrate QuestionPanel in ChatView

**Files:**
- Modify: `packages/desktop/src/renderer/components/chat/ChatView.vue`

**Interfaces:**
- Consumes: `questionStore.hasPending` to decide which component to render
- Produces: Conditional rendering of QuestionPanel or Composer

- [ ] **Step 1: Import questionStore and QuestionPanel**

```vue
<!-- In packages/desktop/src/renderer/components/chat/ChatView.vue -->
<!-- Add to <script setup> imports -->

import { useQuestionStore } from '../../stores/question'
import QuestionPanel from '../question/QuestionPanel.vue'

const questionStore = useQuestionStore()
```

- [ ] **Step 2: Add conditional rendering in template**

```vue
<!-- In packages/desktop/src/renderer/components/chat/ChatView.vue -->
<!-- Replace the Composer section at the bottom of template -->

    <!-- Bottom: Question or Composer -->
    <QuestionPanel v-if="questionStore.hasPending" />
    <Composer
      v-else
      :disabled="!sessionStore.currentSessionId"
      :is-streaming="streamingStore.isCurrentStreaming.value"
      :has-active-session="!!sessionStore.currentSessionId"
      :queue-count="sessionStore.queuedPrompts.length"
      :pending-queue="sessionStore.queuedPrompts"
      @send="handleSend"
      @interrupt="handleInterrupt"
      @slash-command="handleSlashCommand"
      @flush-queued="handleFlushQueued"
      @edit-queued="handleEditQueued"
      @remove-queued="handleRemoveQueued"
    />
```

- [ ] **Step 3: Verify ChatView compiles**

Run: `cd packages/desktop && npm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/renderer/components/chat/ChatView.vue
git commit -m "feat(question): integrate QuestionPanel in ChatView"
```

---

### Task 9: End-to-End Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full typecheck**

Run: `cd packages/desktop && npm run typecheck`
Expected: No errors

- [ ] **Step 2: Run linter**

Run: `cd packages/desktop && npm run lint`
Expected: No errors

- [ ] **Step 3: Build desktop app**

Run: `cd packages/desktop && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test**

1. Start desktop app
2. Trigger a question (if available via skill or demo mode)
3. Verify QuestionPanel appears
4. Click an option, verify it submits
5. Verify Composer reappears after submission

---

## Self-Review Checklist

- [x] Spec coverage: All requirements from design doc have corresponding tasks
- [x] Placeholder scan: No TBD/TODO, all code blocks are complete
- [x] Type consistency: `requestID`, `sessionID`, `QuestionRequest`, `QuestionInfo` names match across tasks