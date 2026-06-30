<script setup lang="ts">
/**
 * ToolCallContainer - Expand/collapse manager for tool call
 *
 * Renders compact row (default) or detail panel (expanded).
 */
import { ref, computed } from 'vue'
import type { StreamingToolCall } from '../../stores/streaming/types'
import { formatDuration } from '../../stores/streaming/types'
import ToolCallCompact from './ToolCallCompact.vue'
import ToolCallDetail from './ToolCallDetail.vue'

const props = defineProps<{
  tool: StreamingToolCall
  isStreaming: boolean
}>()

const expanded = ref(props.tool.expanded)

// Duration for detail view
const duration = computed(() => {
  if (props.tool.endedAt) {
    return formatDuration(props.tool.endedAt - props.tool.startedAt)
  }
  if (props.tool.lifecycle === 'running' || props.tool.lifecycle === 'streaming') {
    return formatDuration(Date.now() - props.tool.startedAt)
  }
  return null
})

function toggleExpanded() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div class="tool-call-container">
    <!-- Compact row (default) -->
    <ToolCallCompact
      v-if="!expanded"
      :tool="tool"
      @expand="toggleExpanded"
    />

    <!-- Detail panel (expanded) -->
    <ToolCallDetail
      v-else
      :tool="tool"
      :duration="duration"
      @collapse="toggleExpanded"
    />
  </div>
</template>
