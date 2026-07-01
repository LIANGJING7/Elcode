<script setup lang="ts">
/**
 * TaskView — renders a TaskViewModel (subagent task card).
 *
 * Layout: title (# <Type> Task) + description + state status badge.
 */
import { computed } from 'vue'
import type { TaskViewModel } from '../../../tool/rules/task'

const props = defineProps<{ vm: TaskViewModel }>()

const stateClass = computed(() => {
  switch (props.vm.state) {
    case 'completed': return 'text-success'
    case 'error': return 'text-error'
    case 'running': return 'text-warning'
    default: return 'text-text-muted'
  }
})

const stateIcon = computed(() => {
  switch (props.vm.state) {
    case 'completed': return '✓'
    case 'error': return '✗'
    case 'running': return '●'
    default: return '○'
  }
})
</script>

<template>
  <div class="task-view text-xs">
    <!-- Title -->
    <div class="text-text-muted mb-1 font-mono"># {{ vm.subagentType }} Task</div>

    <!-- Description + state -->
    <div class="flex items-center gap-2">
      <span :class="stateClass">{{ stateIcon }}</span>
      <span class="text-text-primary">{{ vm.description }}</span>
    </div>

    <!-- Summary (if any) -->
    <div v-if="vm.summary" class="text-text-muted mt-1">{{ vm.summary }}</div>
  </div>
</template>
