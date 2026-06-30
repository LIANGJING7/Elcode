<script setup lang="ts">
/**
 * StreamingMessage - Container for streaming content
 * 
 * Renders reasoning, tool calls, and text in order.
 */
import { computed } from 'vue'
import { useStreamingStore } from '../../stores/streaming'
import StreamingReasoning from './StreamingReasoning.vue'
import StreamingTools from './StreamingTools.vue'
import StreamingText from './StreamingText.vue'

const streamingStore = useStreamingStore()

// Current stream state
const stream = computed(() => streamingStore.currentStream.value)

// Show reasoning if thinking or done
const showReasoning = computed(() => 
  stream.value?.reasoning.status !== 'idle'
)

// Show tools if any exist
const hasTools = computed(() => 
  streamingStore.orderedTools.value.length > 0
)

// Show text if has content
const hasContent = computed(() => 
  streamingStore.hasContent.value
)

// Is still streaming
const isStreaming = computed(() => 
  streamingStore.isCurrentStreaming.value
)

// Reasoning status
const reasoningStatus = computed(() => 
  stream.value?.reasoning.status ?? 'idle'
)
</script>

<template>
  <div class="streaming-message flex items-start gap-3 animate-fade-in">
    <!-- Assistant avatar -->
    <div class="role-avatar w-8 h-8 rounded-lg bg-bg-surface flex items-center justify-center shrink-0 ring-1 ring-border shadow-sm">
      <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    </div>

    <!-- Content area (no border, tight spacing) -->
    <div class="message-content flex-1 min-w-0">
      <!-- Reasoning -->
      <StreamingReasoning 
        v-if="showReasoning"
        :content="streamingStore.displayedReasoning.value"
        :status="reasoningStatus"
        :duration="null"
      />

      <!-- Tool calls list -->
      <StreamingTools 
        v-if="hasTools"
        :tools="streamingStore.orderedTools.value"
        :is-streaming="isStreaming"
      />

      <!-- Text content -->
      <StreamingText 
        v-if="hasContent"
        :content="streamingStore.displayedContent.value"
        :is-streaming="isStreaming"
      />

      <!-- Loading indicator when no content yet -->
      <div v-if="!hasContent && !hasTools && !showReasoning" class="flex items-center gap-3">
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