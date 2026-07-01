<script setup lang="ts">
/**
 * TodoView — renders a TodoViewModel (todo list with status icons).
 *
 * Supports three states: completed (✓), in_progress (●), pending (○).
 */
import { computed } from 'vue'
import type { TodoViewModel } from '../../../tool/rules/todo'

const props = defineProps<{ vm: TodoViewModel }>()

interface DisplayTodo {
  status: string
  content: string
  icon: string
  cls: string
}

const todos = computed<DisplayTodo[]>(() =>
  props.vm.todos.map((t) => {
    if (t.status === 'completed') return { ...t, icon: '✓', cls: 'text-success' }
    if (t.status === 'in_progress') return { ...t, icon: '●', cls: 'text-warning' }
    if (t.status === 'cancelled') return { ...t, icon: '✗', cls: 'text-text-muted' }
    return { ...t, icon: '○', cls: 'text-text-muted' }
  }),
)

const doneCount = computed(() => props.vm.todos.filter((t) => t.status === 'completed').length)
</script>

<template>
  <div class="todo-view text-xs space-y-0.5">
    <div v-for="(todo, i) in todos" :key="i" class="flex items-center gap-1.5">
      <span :class="todo.cls" class="shrink-0 w-4 text-center">{{ todo.icon }}</span>
      <span class="truncate" :class="todo.status === 'completed' ? 'text-text-muted line-through' : 'text-text-primary'">
        {{ todo.content }}
      </span>
    </div>
    <div v-if="todos.length" class="text-text-muted mt-1">
      {{ doneCount }}/{{ todos.length }} done
    </div>
  </div>
</template>
