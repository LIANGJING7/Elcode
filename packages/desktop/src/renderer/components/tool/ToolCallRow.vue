<script setup lang="ts">
/**
 * ToolCallRow — compact single-line display for a tool call.
 *
 * NOTE: This component is now mostly superseded by ToolRenderer.vue
 * which integrates header + expanded content in VS Code search panel style.
 *
 * Kept for backward compatibility and potential direct usage.
 */
import { computed } from 'vue'
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta } from '../../tool/registry'
import { truncate } from '../../tool/summary'

const props = defineProps<{
  tool: ToolCall
  meta?: ToolMeta
}>()

const emit = defineEmits<{
  activate: []
  expand: []
}>()

// Status icon
const statusIcon = computed(() => {
  switch (props.tool.status) {
    case 'completed': return { char: '✓', class: 'text-success' }
    case 'running': return { char: '●', class: 'text-warning animate-pulse' }
    case 'error': return { char: '✗', class: 'text-error' }
    case 'pending':
    default: return { char: '○', class: 'text-text-muted' }
  }
})

// Display name
const displayName = computed(() => {
  const name = props.tool.name
  const parts = name.split('_')
  if (parts.length >= 2 && parts[0] === parts[1]) {
    return parts.slice(1).join('_')
  }
  return name
})

// Summary
const summaryText = computed(() => {
  if (props.meta) return truncate(props.meta.summary(props.tool))
  for (const val of Object.values(props.tool.args)) {
    if (typeof val === 'string' && val.length > 0) return truncate(val)
  }
  return ''
})
</script>

<template>
  <div
    class="tool-call-row w-full flex items-center gap-2 text-left cursor-pointer rounded px-2 py-1.5 transition-colors hover:bg-bg-surface group"
    @click="emit('activate')"
  >
    <!-- Status icon -->
    <span :class="['text-sm shrink-0 w-5 text-center', statusIcon.class]">
      {{ statusIcon.char }}
    </span>

    <!-- Tool icon -->
    <span v-if="meta" class="text-xs text-accent shrink-0 w-4 text-center">
      {{ meta.icon }}
    </span>

    <!-- Tool name -->
    <span class="text-xs font-mono text-text-secondary w-20 shrink-0 truncate">
      {{ displayName }}
    </span>

    <!-- Summary -->
    <span class="text-xs text-text-primary font-medium flex-1 truncate">
      {{ summaryText }}
    </span>

    <!-- Expand arrow (chevron-right) -->
    <svg
      class="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      @click.stop="emit('expand')"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </div>
</template>

<style scoped>
.animate-pulse {
  animation: icon-pulse 1.5s ease-in-out infinite;
}
@keyframes icon-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>