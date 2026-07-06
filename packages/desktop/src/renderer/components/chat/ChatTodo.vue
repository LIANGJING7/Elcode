<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSessionTodoStore } from '../../stores/sessionTodo'

type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

const STATUS_META: Record<TodoStatus, { icon: string; cls: string }> = {
  pending:      { icon: '☐', cls: 'text-text-muted' },
  in_progress:  { icon: '☐', cls: 'text-text-muted' },
  completed:    { icon: '☑', cls: 'text-text-muted' },
  cancelled:    { icon: '☐', cls: 'text-text-muted' },
}

const sessionTodoStore = useSessionTodoStore()
const { currentTodos } = storeToRefs(sessionTodoStore)

watch(currentTodos, (todos) => {
  console.log('[ChatTodo] currentTodos changed:', todos.length, 'items')
  todos.forEach(t => {
    console.log('  - status:', JSON.stringify(t.status), 'type:', typeof t.status, 'content:', t.content.substring(0, 50))
    console.log('    t.status !== "completed":', t.status !== 'completed')
  })
}, { immediate: true })

const items = computed(() =>
  currentTodos.value.map(t => ({
    ...t,
    icon: STATUS_META[t.status as TodoStatus]?.icon ?? '\u25CB',
    cls: STATUS_META[t.status as TodoStatus]?.cls ?? 'text-text-muted',
  }))
)

const show = computed(() => {
  console.log('[ChatTodo] show computed - currentTodos.value:', JSON.stringify(currentTodos.value.map(t => t.status)))
  const hasItems = currentTodos.value.length > 0
  const hasIncomplete = currentTodos.value.some(t => t.status !== 'completed')
  console.log('[ChatTodo] hasItems:', hasItems, 'hasIncomplete:', hasIncomplete)
  const result = hasItems && hasIncomplete
  console.log('[ChatTodo] show result:', result)
  return result
})

const expanded = ref(true)
</script>

<template>
  <div v-if="show" class="todo-panel py-2">
    <div class="max-w-chat-max mx-auto px-6">
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
