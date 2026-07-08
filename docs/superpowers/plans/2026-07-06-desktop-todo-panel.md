# Desktop Todo Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent sidebar todo panel in the desktop app that displays AI-generated todo lists with status icons, matching the TUI sidebar todo behavior.

**Architecture:** SessionTodoStore watches SessionStore.currentSessionId via Vue watch, loads todos via HTTP on first access, and receives real-time updates via SSE todo.updated events dispatched from session.ts event handler. SidebarTodo.vue is a pure display component reading from the store.

**Tech Stack:** Vue 3 + Pinia + TypeScript, Electron IPC, SSE events

**Spec:** `docs/superpowers/specs/2026-07-06-desktop-todo-panel-design.md`

---

### Task 1: Add TodoItem type and SESSION_TODO channel

**Files:**
- Modify: `packages/desktop/src/types/ipc.ts`

- [ ] **Step 1: Add TodoItem interface and SESSION_TODO channel**

After the `PromptOptions` interface in `types/ipc.ts`, add:

```typescript
export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}
```

In `IPC_CHANNELS`, after `SESSION_UPDATE`, add:

```typescript
  SESSION_TODO: 'session:todo',
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/types/ipc.ts
git commit -m "feat: add TodoItem type and SESSION_TODO IPC channel"
```

---

### Task 2: Add session.todo() to backend-client

**Files:**
- Modify: `packages/desktop/src/main/backend-client.ts`

- [ ] **Step 1: Add todo method to backend.session**

After the `update` method in `backend.session` (after line 313), add:

```typescript
    todo: async (sessionID: string, directory?: string): Promise<unknown[]> => {
      const params = directory ? new URLSearchParams({ directory: storagePath(directory) }).toString() : ""
      return request("GET", `/session/${sessionID}/todo?${params}`) as Promise<unknown[]>
    },
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/main/backend-client.ts
git commit -m "feat: add session.todo() to backend-client"
```

---

### Task 3: Add SESSION_TODO IPC handler

**Files:**
- Modify: `packages/desktop/src/main/ipc/handlers-session.ts`

- [ ] **Step 1: Add handler**

After the SESSION_UPDATE handler (after line 358), add:

```typescript
  ipcMain.handle(CHANNELS.SESSION_TODO, async (_event, sessionID: string, directory?: string) => {
    return await backend.session.todo(sessionID, directory)
  })
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/main/ipc/handlers-session.ts
git commit -m "feat: add SESSION_TODO IPC handler"
```

---

### Task 4: Expose session.todo() in preload API

**Files:**
- Modify: `packages/desktop/src/preload/api.ts`

- [ ] **Step 1: Add todo to session API**

After the `update` method in `desktopAPI.session` (after `onStreamEvent` closing `}`), add:

```typescript
    todo: (sessionID: string, directory?: string): Promise<unknown[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_TODO, sessionID, directory),
```

The updated `session` object should look like:

```typescript
  session: {
    create: (/* ... */) => /* ... */,
    get: (/* ... */) => /* ... */,
    list: (/* ... */) => /* ... */,
    messages: (/* ... */) => /* ... */,
    prompt: (/* ... */) => /* ... */,
    interrupt: (/* ... */) => /* ... */,
    resume: (/* ... */) => /* ... */,
    delete: (/* ... */) => /* ... */,
    update: (/* ... */) => /* ... */,
    onStreamEvent: (/* ... */) => /* ... */,
    todo: (sessionID: string, directory?: string): Promise<unknown[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_TODO, sessionID, directory),
  },
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/preload/api.ts
git commit -m "feat: expose session.todo() in preload API"
```

---

### Task 5: Create SessionTodoStore

**Files:**
- Create: `packages/desktop/src/renderer/stores/sessionTodo.ts`

- [ ] **Step 1: Create the store file**

```typescript
import { defineStore } from 'pinia'
import { reactive, computed, watch, type ComputedRef } from 'vue'
import type { TodoItem } from '../../types/ipc'
import { useSessionStore } from './session'

interface SessionTodoCache {
  items: TodoItem[]
  loading: boolean
  loaded: boolean
  error?: Error
}

interface TodoUpdatedEvent {
  type: 'todo.updated'
  sessionID: string
  todos: TodoItem[]
}

export const useSessionTodoStore = defineStore('sessionTodo', () => {
  const cache = reactive<Record<string, SessionTodoCache>>({})
  const loadingSessions = new Set<string>()
  const sessionStore = useSessionStore()

  const currentTodos: ComputedRef<TodoItem[]> = computed(() => {
    const id = sessionStore.currentSessionId
    return id ? cache[id]?.items ?? [] : []
  })

  const loading = computed(() => {
    const id = sessionStore.currentSessionId
    return id ? cache[id]?.loading ?? false : false
  })

  const error = computed(() => {
    const id = sessionStore.currentSessionId
    return id ? cache[id]?.error : undefined
  })

  async function ensureLoaded(sessionId: string) {
    if (cache[sessionId]?.loaded) return
    if (cache[sessionId]?.loading) return
    if (loadingSessions.has(sessionId)) return

    loadingSessions.add(sessionId)
    cache[sessionId] = { items: [], loading: true, loaded: false }

    try {
      const todos = await window.desktop.session.todo(sessionId) as TodoItem[]
      cache[sessionId] = { items: todos, loading: false, loaded: true }
    } catch (e) {
      cache[sessionId] = { items: [], loading: false, loaded: true, error: e as Error }
    } finally {
      loadingSessions.delete(sessionId)
    }
  }

  function handleTodoUpdated(event: TodoUpdatedEvent) {
    cache[event.sessionID] = {
      items: event.todos,
      loading: false,
      loaded: true,
      error: undefined,
    }
  }

  watch(
    () => sessionStore.currentSessionId,
    (sessionId) => {
      if (sessionId) ensureLoaded(sessionId)
    },
    { immediate: true }
  )

  return { currentTodos, loading, error, ensureLoaded, handleTodoUpdated }
})
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit --project packages/desktop/tsconfig.json 2>&1 | Select-String "sessionTodo"
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/stores/sessionTodo.ts
git commit -m "feat: add SessionTodoStore with cache, ensureLoaded, and SSE handling"
```

---

### Task 6: Dispatch todo.updated events in session store

**Files:**
- Modify: `packages/desktop/src/renderer/stores/session.ts`

- [ ] **Step 1: Add import**

After line 4 (`import { useWorkspaceStore } from './workspace'`), add:

```typescript
import { useSessionTodoStore } from './sessionTodo'
```

- [ ] **Step 2: Add usage import inside store**

Inside `useSessionStore`, after `const ui = useUiStore()` (after line 38), add:

```typescript
const sessionTodoStore = useSessionTodoStore()
```

- [ ] **Step 3: Add event dispatch**

Replace the existing `if (eventSessionId)` block at line 781:

```typescript
      if (eventSessionId) {
        streamingStore.handleEvent(eventSessionId, data.event)
```

With:

```typescript
      if (eventSessionId) {
        const rawEvent = data.event as { type?: string }
        if (rawEvent.type === 'todo.updated') {
          sessionTodoStore.handleTodoUpdated(data.event as { type: 'todo.updated'; sessionID: string; todos: unknown[] })
        } else {
          streamingStore.handleEvent(eventSessionId, data.event)
        }
```

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/renderer/stores/session.ts
git commit -m "feat: dispatch todo.updated events to SessionTodoStore"
```

---

### Task 7: Create SidebarTodo.vue component

**Files:**
- Create: `packages/desktop/src/renderer/components/sidebar/SidebarTodo.vue`

- [ ] **Step 1: Create the component**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSessionTodoStore } from '../../stores/sessionTodo'

type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

const STATUS_META: Record<TodoStatus, { icon: string; cls: string }> = {
  pending:      { icon: '\u25CB', cls: 'text-text-muted' },
  in_progress:  { icon: '\u25CF', cls: 'text-warning' },
  completed:    { icon: '\u2713', cls: 'text-text-muted line-through' },
  cancelled:    { icon: '\u2717', cls: 'text-text-muted' },
}

const sessionTodoStore = useSessionTodoStore()
const { currentTodos } = storeToRefs(sessionTodoStore)

const items = computed(() =>
  currentTodos.value.map(t => ({
    ...t,
    icon: STATUS_META[t.status as TodoStatus]?.icon ?? '\u25CB',
    cls: STATUS_META[t.status as TodoStatus]?.cls ?? 'text-text-muted',
  }))
)

const show = computed(() =>
  currentTodos.value.length > 0 &&
  currentTodos.value.some(t => t.status !== 'completed')
)

const expanded = ref(true)
</script>

<template>
  <div v-if="show" class="todo-panel px-3 py-2 border-t border-border/60">
    <div
      class="flex items-center gap-1 cursor-pointer text-sm text-text-muted select-none"
      @click="expanded = !expanded"
    >
      <span class="w-4 text-center">{{ expanded ? '\u25BC' : '\u25B6' }}</span>
      <span class="font-semibold text-text-primary">Todo</span>
    </div>
    <div
      class="todo-list mt-1"
      :class="{ collapsed: !expanded }"
    >
      <div
        v-for="(item, i) in items"
        :key="i"
        class="flex items-center gap-1.5 text-xs py-0.5"
      >
        <span :class="item.cls" class="shrink-0 w-4 text-center">{{ item.icon }}</span>
        <span :class="item.cls" class="truncate">{{ item.content }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.todo-panel {
  flex-shrink: 0;
}
.todo-list {
  max-height: none;
  overflow: hidden;
  transition: max-height 0.2s;
}
.todo-list.collapsed {
  max-height: 3lh;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/components/sidebar/SidebarTodo.vue
git commit -m "feat: add SidebarTodo.vue component with status icons and CSS collapsing"
```

---

### Task 8: Register SidebarTodo in Sidebar.vue

**Files:**
- Modify: `packages/desktop/src/renderer/components/Sidebar.vue`

- [ ] **Step 1: Add import**

After line 27 (`import SidebarTabs from './sidebar/SidebarTabs.vue'`), add:

```typescript
import SidebarTodo from './sidebar/SidebarTodo.vue'
```

- [ ] **Step 2: Add component to template**

Between `<SidebarTabs />` and `<SidebarFooter`, insert `<SidebarTodo />`:

```vue
      <SidebarTabs />

      <SidebarTodo />

      <SidebarFooter
```

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/components/Sidebar.vue
git commit -m "feat: register SidebarTodo in Sidebar layout"
```

---

### Verification

- [ ] **Step 1: Build check**

```bash
Set-Location packages/desktop; npx vue-tsc --noEmit 2>&1 | Select-String "error"
```

Expected: no type errors from changed files.

- [ ] **Step 2: Manual smoke test**

1. Launch desktop app
2. Open a session where AI has generated todos (or trigger a `todowrite` call)
3. Verify todo panel appears at the bottom of the sidebar
4. Verify status icons render correctly (pending ○, in_progress ●, completed ✓)
5. Click header to collapse/expand
6. Switch to another session — verify panel updates or hides appropriately

---

### Technical Notes

- The backend API `GET /session/:id/todo` already exists in `packages/core/src/server/routes/instance/httpapi/handlers/session.ts:92`
- The SSE event `todo.updated` is already published by `packages/core/src/core/session/todo.ts:69`
- `status` field in the existing `tool/rules/todo.ts` TodoViewModel is already `string` type, no change needed
- `import type { TodoItem }` is used intentionally in sessionTodo.ts to avoid runtime imports
- The `ensureLoaded` watch uses `immediate: true` to load todo on app start if a session is already selected
