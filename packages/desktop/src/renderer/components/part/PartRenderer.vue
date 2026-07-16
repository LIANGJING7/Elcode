<script setup lang="ts">
/**
 * PartRenderer — entry component, routes by part.type.
 * Part types: text, tool, reasoning. Does NOT know any tool names.
 */
import { computed } from 'vue'
import TextBlock from './TextBlock.vue'
import ToolDisplay from './ToolDisplay.vue'
import ReasoningBlock from './ReasoningBlock.vue'
import type { TimelineNode } from '../../stores/streaming/selectors'
import type { ToolCall } from '../../../types/ipc'
import type { StreamingToolCall } from '../../stores/streaming/types'
import { streamingToolToToolCall } from '../../stores/streaming/types'

const props = defineProps<{
  node: TimelineNode
  isStreaming?: boolean
}>()

const emit = defineEmits<{
  openFile: [tool: ToolCall]
  openOriginalFile: [{ filePath: string; diff: string }]
  openDiffFile: [string]
  navigateSession: [sessionId: string]
  openSubagentPanel: [sessionId: string]  // New
}>()

function handleOpenSubagentPanel(sessionId: string) {
  emit('openSubagentPanel', sessionId)
}

const textPayload = computed(() => props.node.payload as { content: string })
const toolPayload = computed(() => {
  const payload = props.node.payload
  if ('lifecycle' in payload || 'progress' in payload) {
    const streamingTool = payload as StreamingToolCall
    return streamingToolToToolCall(streamingTool)
  }
  return payload as ToolCall
})
const reasoningPayload = computed(() => props.node.payload as { content: string; status: 'idle' | 'thinking' | 'done'; duration: string | null })
</script>

<template>
  <div class="part-renderer">
    <TextBlock v-if="node.type === 'text'" :content="textPayload.content" :is-streaming="isStreaming" />
    <ToolDisplay
      v-else-if="node.type === 'tool'"
      :tool="toolPayload"
      @open-file="emit('openFile', $event)"
      @open-original-file="emit('openOriginalFile', $event)"
      @open-diff-file="emit('openDiffFile', $event)"
      @navigate-session="emit('navigateSession', $event)"
      @open-subagent-panel="handleOpenSubagentPanel($event)"
    />
    <ReasoningBlock
      v-else-if="node.type === 'reasoning'"
      :content="reasoningPayload.content"
      :status="reasoningPayload.status"
      :duration="reasoningPayload.duration ? parseInt(reasoningPayload.duration) : undefined"
    />
    <div v-else-if="node.type === 'queryGroup'" class="query-group text-xs text-text-muted px-2 py-1">
      <!-- Query group fold - TODO -->
    </div>
  </div>
</template>