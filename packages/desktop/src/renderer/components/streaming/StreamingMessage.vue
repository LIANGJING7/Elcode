<script setup lang="ts">
/**
 * StreamingMessage - Timeline-based streaming content
 *
 * Renders reasoning, tool calls (grouped), and text in chronological order,
 * using the new groupedTimelineNodes selector for tool aggregation.
 */
import { computed } from 'vue'
import { useStreamingStore } from '../../stores/streaming'
import { groupedTimelineNodes, type TimelineNode } from '../../stores/streaming/selectors'
import type { ToolCall } from '../../../types/ipc'
import TimelineRenderer from '../timeline/TimelineRenderer.vue'

const emit = defineEmits<{
  openFile: [tool: ToolCall]
  openOriginalFile: [{ filePath: string; diff: string }]
  openDiffFile: [string]
}>()

const streamingStore = useStreamingStore()

const stream = computed(() => streamingStore.currentStream.value)

const nodes = computed(() => {
  if (!stream.value) return []
  return groupedTimelineNodes(stream.value).value
})

const isStreaming = computed(() => streamingStore.isCurrentStreaming.value)
</script>

<template>
  <div class="streaming-message animate-fade-in">
    <div class="message-content flex-1 min-w-0">
      <TimelineRenderer
        :nodes="nodes"
        :is-streaming="isStreaming"
        @open-file="emit('openFile', $event)"
        @open-original-file="emit('openOriginalFile', $event)"
        @open-diff-file="emit('openDiffFile', $event)"
      />

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
