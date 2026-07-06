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
