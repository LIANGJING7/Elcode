<script setup lang="ts">
/**
 * ToolCallExpanded — expanded detail panel for a tool call.
 *
 * Layout:
 *   [← collapse] [meta.title or tool name] [status] [duration]
 *   ─ Tool-specific view (meta.component + vm) if meta exists
 *   ─ OR generic Input/Output JSON fallback
 *   ─ Error block (if any)
 *
 * Accepts both ToolCall (history) and StreamingToolCall (live).
 */
import { computed } from 'vue'
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../../tool/registry'
import { formatDuration } from '../../stores/streaming/types'

const props = defineProps<{
  tool: ToolCall
  meta?: ToolMeta
  vm?: ToolViewModel
}>()

const emit = defineEmits<{ collapse: [] }>()

// Display name (strip duplicate prefix)
const displayName = computed(() => {
  const name = props.tool.name
  const parts = name.split('_')
  if (parts.length >= 2 && parts[0] === parts[1]) {
    return parts.slice(1).join('_')
  }
  return name
})

const headerTitle = computed(() => props.meta?.title ?? displayName.value)

// Status badge
const statusBadge = computed(() => {
  switch (props.tool.status) {
    case 'completed': return { text: 'completed', class: 'text-success' }
    case 'running': return { text: 'running', class: 'text-warning' }
    case 'error': return { text: 'error', class: 'text-error' }
    default: return { text: props.tool.status, class: 'text-text-muted' }
  }
})

// Duration: prefer tool.duration, fall back to streaming timestamps
const durationText = computed(() => {
  if (props.tool.duration != null) return formatDuration(props.tool.duration)
  return null
})

// Generic fallback: show args + output as JSON
const showGenericFallback = computed(() => !props.meta)
const argsJson = computed(() => {
  const args = props.tool.args
  if (!args || Object.keys(args).length === 0) return ''
  return JSON.stringify(args, null, 2)
})
const outputJson = computed(() => {
  const result = props.tool.output?.result
  if (result === undefined || result === null) return ''
  return typeof result === 'string' ? result : JSON.stringify(result, null, 2)
})
</script>

<template>
  <div class="tool-call-expanded bg-bg-elevated rounded-lg border border-border mt-1">
    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border">
      <button
        class="text-text-muted hover:text-text transition-colors cursor-pointer"
        @click="emit('collapse')"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span class="text-xs font-semibold text-accent font-mono">{{ headerTitle }}</span>
      <span :class="['text-xs ml-auto', statusBadge.class]">{{ statusBadge.text }}</span>
      <span v-if="durationText" class="text-xs text-text-muted tabular-nums">{{ durationText }}</span>
    </div>

    <div class="p-3 space-y-3">
      <!-- Tool-specific structured view -->
      <component
        v-if="meta && vm"
        :is="meta.component"
        :vm="vm"
        :tool="tool"
      />

      <!-- Generic fallback: Input args -->
      <div v-if="showGenericFallback && argsJson">
        <div class="text-xs text-text-muted mb-1">Input</div>
        <pre class="bg-code-bg p-2 rounded text-xs overflow-x-auto font-mono leading-relaxed">{{ argsJson }}</pre>
      </div>

      <!-- Generic fallback: Output -->
      <div v-if="showGenericFallback && outputJson">
        <div class="text-xs text-text-muted mb-1">Output</div>
        <pre class="bg-code-bg p-2 rounded text-xs overflow-x-auto font-mono leading-relaxed max-h-64">{{ outputJson }}</pre>
      </div>

      <!-- Error (always shown if present) -->
      <div v-if="tool.error">
        <div class="text-xs text-error mb-1">Error</div>
        <div class="bg-error/20 p-2 rounded text-xs text-error border border-error/30">
          {{ tool.error }}
        </div>
      </div>
    </div>
  </div>
</template>
