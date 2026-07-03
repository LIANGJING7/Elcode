<script setup lang="ts">
/**
 * ToolCallExpanded — expanded detail content for a tool call.
 *
 * NOTE: Header is now in ToolRenderer.vue. This component only
 * renders the tool-specific content (with left border indentation).
 */
import { computed } from 'vue'
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../../tool/registry'

const props = defineProps<{
  tool: ToolCall
  meta?: ToolMeta
  vm?: ToolViewModel
}>()

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
  <div class="tool-call-content space-y-3">
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
</template>