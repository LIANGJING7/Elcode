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

      <!-- Thinking indicator when streaming -->
      <div v-if="isStreaming" class="thinking-indicator mt-3 flex items-center gap-2">
        <div class="thinking-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="text-xs text-text-muted">思考中</span>
      </div>

      <MessageError v-if="stepError && stepError.type !== 'MessageAbortedError'" :error="stepError" />

      <div v-if="stepError?.type === 'MessageAbortedError'" class="text-xs text-error mt-2">
        手动中断
      </div>
    </div>
  </div>
</template>

<style scoped>
.thinking-indicator {
  animation: thinking-pulse 2s ease-in-out infinite;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: thinking-bounce 1.4s ease-in-out infinite;
}

.thinking-dots span:nth-child(1) {
  animation-delay: 0s;
}

.thinking-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinking-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes thinking-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
</style>
