<script setup lang="ts">
/**
 * TimelineRenderer - Dumb dispatcher for timeline nodes.
 *
 * Just maps node.type to sub-components. No business logic, no computation.
 * All summaries/icons are computed in child components via registry.
 * Converts StreamingToolCall → ToolCall for compatibility with presentation layer.
 */
import type { TimelineNode } from '../../stores/streaming/selectors'
import type { ToolCall } from '../../../types/ipc'
import type { StreamingToolCall } from '../../stores/streaming/types'
import { streamingToolToToolCall } from '../../stores/streaming/types'
import PartRenderer from '../part/PartRenderer.vue'
import SearchFoldGroup from './SearchFoldGroup.vue'

const props = defineProps<{ 
  nodes: TimelineNode[]
  isStreaming?: boolean
}>()
const emit = defineEmits<{ 
  openFile: [tool: ToolCall]
  navigateSession: [sessionId: string]
  openSubagentPanel: [sessionId: string]  // New
}>()

const handleNavigateSession = (sessionId: string) => {
  console.log('[TimelineRenderer] Navigate to session:', sessionId)
  // TODO: implement session navigation
}

function handleOpenSubagentPanel(sessionId: string) {
  console.log('[TimelineRenderer] handleOpenSubagentPanel:', sessionId)
  emit('openSubagentPanel', sessionId)
}

function getReasoningPayload(node: TimelineNode) {
  return node.payload as { content: string; status: 'idle' | 'thinking' | 'done'; duration: string | null }
}

function getTextPayload(node: TimelineNode) {
  return node.payload as { content: string }
}

function getStreamingTool(node: TimelineNode): StreamingToolCall {
  return node.payload as StreamingToolCall
}

function getToolCall(node: TimelineNode): ToolCall {
  return streamingToolToToolCall(getStreamingTool(node))
}

function getQueryGroupTools(node: TimelineNode): StreamingToolCall[] {
  return node.payload as StreamingToolCall[]
}
</script>

<template>
  <div class="timeline-renderer">
    <div v-for="node in nodes" :key="node.id" class="timeline-node">
      <PartRenderer
        v-if="node.type === 'reasoning'"
        :node="node"
      />
      
      <PartRenderer
        v-else-if="node.type === 'tool'"
        :node="node"
        :is-streaming="isStreaming"
        @open-file="emit('openFile', $event)"
        @navigate-session="handleNavigateSession($event)"
        @open-subagent-panel="handleOpenSubagentPanel($event)"
      />
      
      <SearchFoldGroup
        v-else-if="node.type === 'queryGroup'"
        :tools="getQueryGroupTools(node)"
        @open-file="emit('openFile', $event)"
      />
      
      <PartRenderer
        v-else-if="node.type === 'text'"
        :node="node"
        :is-streaming="isStreaming"
      />
    </div>
  </div>
</template>

<style scoped>
.timeline-node {
  display: contents;
}
</style>