<script setup lang="ts">
/**
 * ToolCallRow — compact single-line display for a tool call (collapsed state).
 *
 * Layout: [status icon] [meta.icon] [tool name (mono)] [summary (bold)] [→]
 *
 * Click signals:
 *   - @activate : whole-row click — parent decides inline-expand vs inspect
 *                 based on the tool's defaultInteraction.
 *   - @inspect  : summary-area click — always opens the Inspector (so even
 *                 inline-mode tools can be inspected by clicking the summary).
 *   - @expand   : explicit expand arrow click — always toggles inline detail
 *                 (lets inspect-mode tools still be expanded inline if wanted).
 *
 * Accepts both ToolCall (history) and StreamingToolCall (live) since
 * StreamingToolCall extends ToolCall.
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
  inspect: [id: string]
  openFile: [tool: ToolCall]
}>()

// Status icon derived from tool.status (works for both history + streaming)
const statusIcon = computed(() => {
  switch (props.tool.status) {
    case 'completed': return { char: '✓', class: 'text-success' }
    case 'running': return { char: '●', class: 'text-warning animate-pulse' }
    case 'error': return { char: '✗', class: 'text-error' }
    case 'pending':
    default: return { char: '○', class: 'text-text-muted' }
  }
})

// Display name: strip duplicate underscore prefix (e.g. codegraph_codegraph_files)
const displayName = computed(() => {
  const name = props.tool.name
  const parts = name.split('_')
  if (parts.length >= 2 && parts[0] === parts[1]) {
    return parts.slice(1).join('_')
  }
  return name
})

// Summary: prefer meta.summary, fall back to generic extraction
const summaryText = computed(() => {
  if (props.meta) return truncate(props.meta.summary(props.tool))
  // Generic fallback: first string arg
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
    <span
      data-testid="status-dot"
      :class="['status-icon text-sm shrink-0 w-5 text-center', statusIcon.class]"
    >
      {{ statusIcon.char }}
    </span>

    <!-- Tool icon (from meta) -->
    <span v-if="meta" class="tool-meta-icon text-xs text-accent shrink-0 w-4 text-center">
      {{ meta.icon }}
    </span>

    <!-- Tool name (mono, fixed width) — click opens file tab -->
    <span
      class="tool-name text-xs font-mono text-text-secondary w-20 shrink-0 truncate cursor-pointer hover:text-accent"
      @click.stop="emit('openFile', tool)"
    >
      {{ displayName }}
    </span>

    <!-- Summary (bold) — click opens file tab -->
    <span
      class="summary text-xs text-text-primary font-medium flex-1 truncate cursor-pointer hover:text-accent"
      @click.stop="emit('openFile', tool)"
    >
      {{ summaryText }}
    </span>

    <!-- Expand arrow — explicit inline expand (always available) -->
    <svg
      class="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
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
