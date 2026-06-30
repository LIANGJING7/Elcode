<script setup lang="ts">
/**
 * ToolCallCompact - Compact list row for tool calls
 *
 * Shows: status icon + tool name + summary + optional gray detail
 * Hover: background highlight + right arrow indicator
 */
import type { StreamingToolCall } from '../../stores/streaming/types'
import { computed } from 'vue'
import { toolSummary, type ToolSummary } from '../../stores/streaming/selectors'

const props = defineProps<{
  tool: StreamingToolCall
}>()

const emit = defineEmits<{
  expand: []
}>()

// Get structured summary
const summary: ToolSummary = toolSummary(props.tool).value

// Status icon based on lifecycle
const statusIcon = computed(() => {
  switch (props.tool.lifecycle) {
    case 'preparing': return { char: '○', class: 'text-text-muted' }
    case 'waiting': return { char: '○', class: 'text-warning animate-pulse' }
    case 'running': return { char: '●', class: 'text-warning animate-pulse-glow' }
    case 'streaming': return { char: '●', class: 'text-warning animate-pulse-glow' }
    case 'completed': return { char: '✓', class: 'text-success' }
    case 'failed': return { char: '✗', class: 'text-error' }
    case 'cancelled': return { char: '○', class: 'text-text-muted line-through' }
    default: return { char: '○', class: 'text-text-muted' }
  }
})
</script>

<template>
  <button
    class="tool-call-row w-full flex items-center gap-2 text-left cursor-pointer rounded px-2 py-1.5 transition-colors hover:bg-bg-surface group"
    @click="emit('expand')"
  >
    <!-- Status icon -->
    <span
      class="status-icon text-sm shrink-0 w-5 text-center"
      :class="statusIcon.class"
    >
      {{ statusIcon.char }}
    </span>

    <!-- Tool name (mono, fixed width) -->
    <span class="tool-name text-xs font-mono text-text-secondary w-20 shrink-0 truncate">
      {{ summary.name }}
    </span>

    <!-- Summary (bold) -->
    <span class="summary text-xs text-text-primary font-medium flex-1 truncate">
      {{ summary.summary }}
    </span>

    <!-- Optional gray detail -->
    <span
      v-if="summary.detail"
      class="detail text-xs text-text-muted shrink-0 truncate max-w-40"
    >
      {{ summary.detail }}
    </span>

    <!-- Hover arrow (only visible on hover) -->
    <svg
      class="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</template>

<style scoped>
.animate-pulse {
  animation: icon-pulse 1.5s ease-in-out infinite;
}

.animate-pulse-glow {
  animation: icon-pulse-glow 1.2s ease-in-out infinite;
}

@keyframes icon-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes icon-pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

.line-through {
  text-decoration: line-through;
}
</style>
