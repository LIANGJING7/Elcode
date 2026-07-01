<script setup lang="ts">
/**
 * StreamingMessage - Timeline-based streaming content
 *
 * Renders reasoning, tool calls, and text in chronological order,
 * similar to Claude Code's interleaved display.
 */
import { computed } from 'vue'
import { useStreamingStore } from '../../stores/streaming'
import { timelineNodes, type TimelineNode } from '../../stores/streaming/selectors'
import type { StreamingToolCall } from '../../stores/streaming/types'
import type { ToolCall } from '../../../types/ipc'
import StreamingReasoning from './StreamingReasoning.vue'
import StreamingText from './StreamingText.vue'
import ToolRenderer from '../tool/ToolRenderer.vue'

const emit = defineEmits<{
  openFile: [tool: ToolCall]
}>()

const streamingStore = useStreamingStore()

// Current stream state
const stream = computed(() => streamingStore.currentStream.value)

// Timeline nodes (ordered by occurrence)
const nodes = computed(() => {
  if (!stream.value) return []
  return timelineNodes(stream.value).value
})

// Is still streaming
const isStreaming = computed(() => streamingStore.isCurrentStreaming.value)

// Helper: get reasoning payload from a node
function getReasoningPayload(node: TimelineNode) {
  return node.payload as { content: string; status: 'idle' | 'thinking' | 'done'; duration: string | null }
}

// Helper: get text payload from a node
function getTextPayload(node: TimelineNode) {
  return node.payload as { content: string }
}

// Helper: get tool payload from a node
function getToolPayload(node: TimelineNode) {
  return node.payload as StreamingToolCall
}
</script>

<template>
  <div class="streaming-message animate-fade-in">
    <!-- Content area - timeline ordered -->
    <div class="message-content flex-1 min-w-0">
      <!-- Timeline nodes in chronological order -->
      <template v-for="node in nodes" :key="node.id">
        <!-- Reasoning node -->
        <StreamingReasoning
          v-if="node.type === 'reasoning'"
          :content="getReasoningPayload(node).content"
          :status="getReasoningPayload(node).status"
          :duration="getReasoningPayload(node).duration"
        />

        <!-- Tool node -->
        <ToolRenderer
          v-else-if="node.type === 'tool'"
          :tool="getToolPayload(node)"
          @open-file="emit('openFile', $event)"
        />

        <!-- Text node -->
        <StreamingText
          v-else-if="node.type === 'text'"
          :content="getTextPayload(node).content"
          :is-streaming="isStreaming"
        />
      </template>

      <!-- Loading indicator when no content yet -->
      <div v-if="nodes.length === 0" class="flex items-center gap-3">
        <div class="flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
          <span class="w-1.5 h-1.5 rounded-full bg-accent/60" style="animation: pulse 1.2s ease-in-out 0.15s infinite" />
          <span class="w-1.5 h-1.5 rounded-full bg-accent/40" style="animation: pulse 1.2s ease-in-out 0.3s infinite" />
        </div>
        <span class="text-xs text-text-muted">Thinking...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(0.8); }
}
</style>
