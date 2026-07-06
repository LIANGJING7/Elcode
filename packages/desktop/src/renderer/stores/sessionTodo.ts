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

export interface TodoUpdatedEvent {
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
    const items = id ? cache[id]?.items ?? [] : []
    console.log('[SessionTodo] currentTodos computed, sessionId:', id, 'items count:', items.length)
    return items
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
    console.log('[SessionTodo] ensureLoaded called for:', sessionId)
    console.log('[SessionTodo] cache state:', JSON.stringify(cache[sessionId]))
    if (cache[sessionId]?.loaded) return
    if (cache[sessionId]?.loading) return
    if (loadingSessions.has(sessionId)) return

    loadingSessions.add(sessionId)
    cache[sessionId] = { items: [], loading: true, loaded: false }

    try {
      console.log('[SessionTodo] fetching todos from API...')
      const todos = await window.desktop.session.todo(sessionId) as TodoItem[]
      console.log('[SessionTodo] fetched todos:', JSON.stringify(todos))
      cache[sessionId] = { items: todos, loading: false, loaded: true }
    } catch (e) {
      console.error('[SessionTodo] fetch error:', e)
      cache[sessionId] = { items: [], loading: false, loaded: true, error: e as Error }
    } finally {
      loadingSessions.delete(sessionId)
    }
  }

  function handleTodoUpdated(event: TodoUpdatedEvent) {
    console.log('[SessionTodo] handleTodoUpdated called:', JSON.stringify(event))
    cache[event.sessionID] = {
      items: event.todos,
      loading: false,
      loaded: true,
      error: undefined,
    }
    console.log('[SessionTodo] cache updated, currentTodos will be:', event.sessionID === sessionStore.currentSessionId ? 'visible' : 'hidden (different session)')
  }

  watch(
    () => sessionStore.currentSessionId,
    (sessionId) => {
      console.log('[SessionTodo] watch triggered, sessionId:', sessionId)
      if (sessionId) ensureLoaded(sessionId)
    },
    { immediate: true }
  )

  function clear() {
    Object.keys(cache).forEach(k => delete cache[k])
  }

  return { currentTodos, loading, error, ensureLoaded, handleTodoUpdated, clear }
})
