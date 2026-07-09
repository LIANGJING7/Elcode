<script setup lang="ts">
/**
 * SearchFoldGroup - Foldable group of query-type tools (read/grep/glob/web_*).
 *
 * Displays as a collapsible panel with tool summaries. Click header to expand.
 * Click individual tool row to emit openFile event.
 *
 * Summary is computed lazily at render time using registry.getTool().
 * Converts StreamingToolCall → ToolCall for compatibility with presentation layer.
 * Shows status icons (✓ success, ✗ failed) and failure styling.
 */
import { ref, computed } from 'vue'
import type { ToolCall } from '../../../types/ipc'
import type { StreamingToolCall } from '../../stores/streaming/types'
import { streamingToolToToolCall, mapLifecycleToStatus } from '../../stores/streaming/types'
import { getTool } from '../../tool/registry'

const props = defineProps<{ tools: StreamingToolCall[] }>()
const emit = defineEmits<{ openFile: [tool: ToolCall] }>()

const expanded = ref(false)

const toolSummaries = computed(() => {
  return props.tools.map(tool => {
    const meta = getTool(tool.name)
    const toolCall = streamingToolToToolCall(tool)
    const status = mapLifecycleToStatus(tool.lifecycle)
    const isFailed = tool.lifecycle === 'failed' || tool.lifecycle === 'cancelled'
    return {
      tool,
      toolCall,
      icon: meta?.icon ?? '?',
      title: meta?.summary(toolCall) ?? tool.name,
      status,
      isFailed,
    }
  })
})

const hasFailures = computed(() => props.tools.some(t => t.lifecycle === 'failed' || t.lifecycle === 'cancelled'))

const failedCount = computed(() => props.tools.filter(t => t.lifecycle === 'failed' || t.lifecycle === 'cancelled').length)

function toggle() {
  expanded.value = !expanded.value
}

function openTool(toolCall: ToolCall) {
  emit('openFile', toolCall)
}

function getStatusClass(status: string, isFailed: boolean): string {
  if (isFailed) return 'text-error'
  if (status === 'running') return 'text-warning'
  if (status === 'completed') return 'text-success'
  return 'text-text-muted'
}

function getStatusChar(status: string, isFailed: boolean): string {
  if (isFailed) return '✗'
  if (status === 'running') return '●'
  if (status === 'completed') return '✓'
  return '○'
}
</script>

<template>
  <div class="search-fold-group">
    <div class="fold-header flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-bg-surface transition-colors" @click="toggle">
      <svg class="w-3 h-3 text-text-muted transition-transform duration-150" :class="{ 'rotate-90': expanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <span class="text-xs font-medium">已搜索</span>
      <span class="text-xs text-text-muted">({{ tools.length }})</span>
      <span v-if="hasFailures" class="text-xs text-error font-medium">✗ {{ failedCount }}</span>
    </div>
    
    <div v-if="expanded" class="fold-content ml-6 mt-1 mb-1 pl-4 border-l-2 border-border space-y-0.5">
      <div
        v-for="{ toolCall, icon, title, status, isFailed } in toolSummaries"
        :key="toolCall.id"
        class="tool-row flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-bg-surface transition-colors"
        :class="{ 'bg-error/10': isFailed }"
        @click="openTool(toolCall)"
      >
        <span class="text-xs shrink-0 w-4 text-center" :class="getStatusClass(status, isFailed)">
          {{ getStatusChar(status, isFailed) }}
        </span>
        <span class="text-xs text-accent shrink-0 w-4 text-center">{{ icon }}</span>
        <span class="text-xs font-mono shrink-0" :class="isFailed ? 'text-error' : 'text-text-secondary'">
          {{ toolCall.name.split('_').pop() }}
        </span>
        <span class="text-xs font-medium flex-1 truncate" :class="isFailed ? 'text-error' : 'text-text-primary'">
          {{ title }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-fold-group {
  font-family: system-ui, -apple-system, sans-serif;
}
</style>