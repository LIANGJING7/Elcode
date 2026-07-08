<script setup lang="ts">
/**
 * TodoView — renders a TodoViewModel (todo list with checkbox icons).
 *
 * Completed: CheckSquare + strikethrough gray text
 * In-progress: Circle (filled) indicator
 * Pending: Square (outline)
 */
import { computed } from 'vue'
import { Square, CheckSquare, Circle } from 'lucide-vue-next'
import type { TodoViewModel } from '../../../tool/rules/todo'

const props = defineProps<{ vm: TodoViewModel }>()

interface DisplayTodo {
  status: string
  content: string
  icon: typeof Square | typeof CheckSquare | typeof Circle
  iconClass: string
  textClass: string
}

function getIconAndClasses(t: { status: string; content: string }): DisplayTodo {
  if (t.status === 'completed') {
    return { ...t, icon: CheckSquare, iconClass: 'icon-completed', textClass: 'text-completed' }
  }
  if (t.status === 'in_progress') {
    return { ...t, icon: Circle, iconClass: 'icon-progress', textClass: '' }
  }
  if (t.status === 'cancelled') {
    return { ...t, icon: Square, iconClass: '', textClass: 'text-muted' }
  }
  return { ...t, icon: Square, iconClass: '', textClass: '' }
}

const todos = computed<DisplayTodo[]>(() =>
  props.vm.todos.map(getIconAndClasses),
)

const doneCount = computed(() => props.vm.todos.filter((t) => t.status === 'completed').length)
</script>

<template>
  <div class="todo-view text-xs space-y-0.5">
    <div v-for="(todo, i) in todos" :key="i" class="flex items-center gap-1.5">
      <component :is="todo.icon" :class="['shrink-0 w-4 h-4', todo.iconClass]" />
      <span class="truncate" :class="todo.textClass">
        {{ todo.content }}
      </span>
    </div>
    <div v-if="todos.length" class="text-text-muted mt-1">
      {{ doneCount }}/{{ todos.length }} done
    </div>
  </div>
</template>

<style scoped>
.icon-completed {
  color: #71717a;
}

.icon-progress {
  color: #d4d0c8;
  fill: #d4d0c8;
  animation: pulse-ring 2s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.text-completed {
  color: #71717a;
  text-decoration: line-through;
}

.text-muted {
  color: #52525b;
}
</style>
