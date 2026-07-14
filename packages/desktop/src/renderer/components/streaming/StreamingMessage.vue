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
import MessageError from '../part/MessageError.vue'

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

const stepError = computed(() => stream.value?.stepError ?? null)
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

      <div v-if="nodes.length === 0" class="flex items-center gap-2">
        <span class="text-xs text-text-muted thinking-text">思考中</span>
      </div>

      <MessageError v-if="stepError" :error="stepError" />
    </div>
  </div>
</template>

<style scoped>
.thinking-text {
  animation: thinking-fade 1.5s ease-in-out infinite;
}

@keyframes thinking-fade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
