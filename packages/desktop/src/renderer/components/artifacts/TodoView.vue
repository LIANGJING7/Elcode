<script setup lang="ts">
import type { ToolCall } from '../../../types/ipc'

const props = defineProps<{ toolCall: ToolCall }>()

// 从 result.todos 提取 checkbox 列表
const todos = computed(() => {
  const result = props.toolCall.result as { todos?: Array<{ content: string; status: string }> } | undefined
  return result?.todos ?? []
})

import { computed } from 'vue'
</script>

<template>
  <div class="todo-view text-xs mt-1 space-y-1">
    <div v-for="(todo, i) in todos.slice(0, 5)" :key="i" class="flex items-center gap-1">
      <span :class="todo.status === 'completed' ? 'text-success' : 'text-accent-muted'">
        {{ todo.status === 'completed' ? '☑' : '☐' }}
      </span>
      <span class="truncate">{{ todo.content }}</span>
    </div>
    <div v-if="todos.length > 5" class="text-accent-muted">
      +{{ todos.length - 5 }} more
    </div>
  </div>
</template>