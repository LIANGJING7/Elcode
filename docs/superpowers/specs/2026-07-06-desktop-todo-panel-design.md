# Desktop Todo Panel Design

## Overview

为桌面端 sidebar 新增持久化 todo 面板，复刻 TUI 的 sidebar todo 功能。仅展示 AI 通过 `todowrite` 工具生成的 todo 列表，用户不可手动编辑。

---

## TUI Todo 功能分析

### 数据结构（core/session/todo.ts）

```typescript
const Info = Schema.Struct({
  content: Schema.String,   // 任务描述
  status: Schema.String,    // pending | in_progress | completed | cancelled
  priority: Schema.String,  // high | medium | low（UI 不显示）
})
```

### Sidebar 组件（tui/sidebar/todo.tsx）

- 从 session state 获取 todo 列表
- 面板显示条件：`list.length > 0 && list.some(item => item.status !== "completed")`（全完成则隐藏）
- 折叠逻辑：默认展开，list.length > 2 时显示折叠按钮
- 遍历全部 todo（含 completed），completed 以灰色弱化显示

### TodoItem 组件（tui/todo-item.tsx）

- completed: `[✓]` + `textMuted`
- in_progress: `[•]` + `warning`
- pending: `[ ]` + `textMuted`

---

## 桌面端现状

- `components/tool/views/TodoView.vue`：仅 tool call 结果的临时列表展示，非持久面板
- `tool/rules/todo.ts`：已定义 `TodoViewModel`，status 已是 string 类型
- streaming store 的 normalizer 未处理 `todo.updated` 事件

---

## 设计决策

| 决策 | 选择 | 原因 |
|---|---|---|
| 用户交互 | 仅展示 | 和 TUI 一致 |
| 位置 | Sidebar 底部 | 和 TUI 一致，固定可见 |
| priority | 不显示 | TUI 也不显示 |
| completed 样式 | 灰色 + 删除线 | GUI 独有优势 |
| 折叠方式 | CSS max-height | 不用 magic number |
| 状态图标 | STATUS_META 配置化 | 数据驱动，易扩展 |
| 排序 | 保持后端原始顺序 | 保留执行时间线 |
| loading | 静默等待 | 避免 UI 闪烁 |
| expanded | 不按 session 保存 | YAGNI，保持简单 |

---

## 架构设计

```
SessionStore
  currentSessionId
        │
        ▼ watch()
SessionTodoStore
  cache: Record<string, SessionTodoCache>
  ensureLoaded(sessionId)
  handleTodoUpdated(event)
  currentTodos (computed)
  loading (computed)
        │
        ▼ storeToRefs()
SidebarTodo.vue
  STATUS_META
  items (ViewModel)
  expanded + overflow (CSS)
```

**Store 之间不互相调用** —— SessionTodoStore 通过 watch 监听 SessionStore.currentSessionId，SessionStore 不知道 Todo 的存在。

---

## SessionTodo Store

### 接口

```typescript
export const useSessionTodoStore = defineStore('sessionTodo', () => {
  // 缓存结构（包含加载状态）
  const cache = reactive<Record<string, SessionTodoCache>>({})
  const loadingSessions = new Set<string>()

  // 从 SessionStore 获取 currentSessionId（Single Source of Truth）
  const sessionStore = useSessionStore()

  interface SessionTodoCache {
    items: TodoItem[]
    loading: boolean
    loaded: boolean
    error?: Error
  }

  // 计算属性（隐藏缓存结构）
  const currentTodos = computed(() => {
    const id = sessionStore.currentSessionId
    return id ? cache[id]?.items ?? [] : []
  })
  const loading = computed(() => { /* ... */ })
  const error = computed(() => { /* ... */ })

  // 保证已加载（缓存 + 去重 + 并发保护）
  async function ensureLoaded(sessionId: string) {
    if (cache[sessionId]?.loaded) return
    if (cache[sessionId]?.loading) return
    if (loadingSessions.has(sessionId)) return

    loadingSessions.add(sessionId)
    cache[sessionId] = { items: [], loading: true, loaded: false }

    try {
      const todos = await window.desktop.session.todo(sessionId)
      cache[sessionId] = { items: todos, loading: false, loaded: true }
    } catch (e) {
      cache[sessionId] = { items: [], loading: false, loaded: true, error: e as Error }
    } finally {
      loadingSessions.delete(sessionId)
    }
  }

  // 处理 SSE todo.updated（全量替换，所有 session 的 cache 实时更新）
  function handleTodoUpdated(event: TodoUpdatedEvent) {
    cache[event.sessionID] = {
      items: event.todos,
      loading: false,
      loaded: true,
      error: undefined,  // 清除之前可能的错误
    }
  }

  return { currentTodos, loading, error, ensureLoaded, handleTodoUpdated }
})
```

---

## SidebarTodo 组件

### STATUS_META

```typescript
type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

const STATUS_META: Record<TodoStatus, { icon: string; cls: string }> = {
  pending:      { icon: '\u25CB', cls: 'text-text-muted' },
  in_progress:  { icon: '\u25CF', cls: 'text-warning' },
  completed:    { icon: '\u2713', cls: 'text-text-muted line-through' },
  cancelled:    { icon: '\u2717', cls: 'text-text-muted' },
}
```

### 核心逻辑

```typescript
const { currentTodos } = storeToRefs(sessionTodoStore)

// ViewModel 层
const items = computed(() =>
  currentTodos.value.map(t => ({
    ...t,
    icon: STATUS_META[t.status]?.icon ?? '\u25CB',
    cls: STATUS_META[t.status]?.cls ?? 'text-text-muted',
  }))
)

// 面板显示条件（和 TUI 一致）
const show = computed(() =>
  currentTodos.value.length > 0 &&
  currentTodos.value.some(t => t.status !== 'completed')
)

// 折叠：CSS 控制，不依赖 magic number
const expanded = ref(true)
```

### 模板

```vue
<template>
  <div v-if="show" class="todo-panel">
    <div class="todo-header" @click="expanded = !expanded">
      <span>{{ expanded ? '\u25BC' : '\u25B6' }}</span>
      <span>Todo</span>
    </div>
    <div class="todo-list" :class="{ collapsed: !expanded }" ref="listRef">
      <div v-for="(item, i) in items" :key="i" class="todo-row">
        <span :class="item.cls">{{ item.icon }}</span>
        <span :class="item.cls">{{ item.content }}</span>
      </div>
    </div>
  </div>
</template>
```

### CSS

```css
.todo-list {
  max-height: none;
  overflow: hidden;
  transition: max-height 0.2s;
}
.todo-list.collapsed {
  max-height: 3lh;
}
```

---

## 事件分发 & API

### 分发点

在 `renderer/stores/session.ts` 的 SSE 事件处理函数中（`session.ts:782` 附近）：

```typescript
// session.ts 的 SSE 事件处理
if (eventSessionId) {
  const rawEvent = data.event as { type?: string }
  if (rawEvent.type === 'todo.updated') {
    sessionTodoStore.handleTodoUpdated(data.event as TodoUpdatedEvent)
  } else {
    streamingStore.handleEvent(eventSessionId, data.event)
  }
}
```

两个 Store 平级，streamingStore 不知道 sessionTodoStore 的存在。

### TodoUpdatedEvent

```typescript
interface TodoUpdatedEvent {
  type: 'todo.updated'
  sessionID: string
  todos: TodoItem[]
}

interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}
```

### API

| 层 | 文件 | 内容 |
|---|---|---|
| Channel | `types/ipc.ts` | `SESSION_TODO: 'session:todo'` |
| Main | `ipc/handlers-session.ts` | `ipcMain.handle(SESSION_TODO, ...)` |
| Main | `backend-client.ts` | `session.todo(sessionID, directory)` |
| Preload | `preload/api.ts` | `session.todo(sessionID)` → `ipcRenderer.invoke(...)` |

### 初始化流程

```
打开 Session
  ↓
watch(currentSessionId) → ensureLoaded(sessionId)
  ↓
GET /session/:id/todo → 存入 cache
  ↓
SidebarTodo 显示
  ↓
SSE todo.updated → 分发点 → handleTodoUpdated → replace cache
  ↓
SidebarTodo 响应式更新
```

---

## 文件变更清单

```
packages/desktop/src/

types/
├── ipc.ts                              # [修改] +SESSION_TODO, +TodoItem

main/
├── ipc/
│   └── handlers-session.ts            # [修改] +ipcMain.handle(SESSION_TODO)
├── backend-client.ts                   # [修改] +session.todo()

preload/
├── api.ts                              # [修改] +session.todo()

renderer/
├── stores/
│   ├── session.ts                      # [修改] 事件入口分发 todo.updated
│   └── sessionTodo.ts                  # [新建] useSessionTodoStore
├── components/
│   ├── Sidebar.vue                     # [修改] 注册 <SidebarTodo />
│   └── sidebar/
│       └── SidebarTodo.vue             # [新建] 展示组件
```

### 不改动的文件

```
renderer/stores/streaming/normalizer.ts
renderer/stores/streaming/reducer.ts
renderer/stores/streaming/types.ts
renderer/tool/rules/todo.ts
renderer/components/tool/views/TodoView.vue
```

---

## 设计原则

1. **单向 watch** —— SessionTodoStore 通过 watch 监听 SessionStore，不反向依赖
2. **SSOT** —— currentSessionId 只存在于 SessionStore，不重复维护
3. **Replace over Patch** —— todo.updated 全量替换，不做增量合并
4. **缓存含状态** —— cache entry 包含 loading/loaded/error，不只是数据
5. **去重保护** —— loadingSessions Set 防止同一 session 重复请求
6. **配置化展示** —— STATUS_META 记录所有状态元数据，新增状态不改逻辑
7. **CSS 折叠** —— 折叠由布局驱动，不依赖 todo 数量 magic number
