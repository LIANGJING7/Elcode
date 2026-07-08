<!-- packages/desktop/src/renderer/components/subagent/SubagentHeader.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { SubagentHeaderVM } from '../../types/subagent'

const props = defineProps<{ vm: SubagentHeaderVM }>()

const statusClass = computed(() => {
  switch (props.vm.status) {
    case 'completed': return 'text-success'
    case 'error': return 'text-error'
    case 'cancelled': return 'text-text-muted'
    default: return 'text-warning'
  }
})
</script>

<template>
  <div class="subagent-header flex items-center gap-2 px-2 py-1.5 border-b border-border">
    <span :class="['text-sm', statusClass]">{{ vm.icon }}</span>
    <span class="text-sm font-semibold flex-1 truncate">{{ vm.title }}</span>
    <span v-if="vm.toolCount" class="text-xs text-text-muted">{{ vm.toolCount }} tools</span>
    <span v-if="vm.duration" class="text-xs text-text-muted">{{ vm.duration }}</span>
  </div>
</template>