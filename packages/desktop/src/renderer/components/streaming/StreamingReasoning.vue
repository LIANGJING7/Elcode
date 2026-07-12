<script setup lang="ts">
/**
 * StreamingReasoning - Thinking/reasoning display
 * 
 * Shows reasoning process with:
 * - Real-time content display when thinking (batched via useStreamingMarkdown)
 * - Collapsible content when done (always collapsible if has content)
 */
import { ref, computed } from 'vue'
import { useStreamingMarkdown } from '../../composables/useStreamingMarkdown'
import MarkdownRenderer from '../chat/MarkdownRenderer.vue'

const props = defineProps<{
  content: string
  status: 'idle' | 'thinking' | 'done'
  duration: string | null
}>()

const expanded = ref(props.status === 'thinking')

// Always show collapsible block if there's content (no length limit)
const hasContent = computed(() => props.content.length > 0)

// Show content during thinking if there's content
const showThinkingContent = computed(() => props.status === 'thinking' && props.content.length > 0)

// Batch rendering via useStreamingMarkdown (100ms batch via requestAnimationFrame)
const contentRef = computed(() => props.content)
const { renderedContent } = useStreamingMarkdown(contentRef)
</script>

<template>
  <div class="streaming-reasoning my-2">
    <!-- Thinking state with content -->
    <div v-if="status === 'thinking' && showThinkingContent" class="bg-bg-elevated rounded-lg border border-border">
      <button
        class="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-surface transition-colors cursor-pointer"
        @click="expanded = !expanded"
      >
        <div class="flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
          <span class="w-1.5 h-1.5 rounded-full bg-accent/60" style="animation: reasoning-pulse 1.2s ease-in-out 0.15s infinite" />
          <span class="w-1.5 h-1.5 rounded-full bg-accent/40" style="animation: reasoning-pulse 1.2s ease-in-out 0.3s infinite" />
        </div>
        <svg
          class="w-3 h-3 text-text-muted transition-transform"
          :class="expanded ? 'rotate-90' : ''"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-xs text-text-muted">Thinking...</span>
      </button>
      <div v-if="expanded" class="px-3 pb-2 pt-1 border-t border-border">
        <div class="text-xs text-text-muted leading-relaxed">
          <MarkdownRenderer :content="renderedContent" message-id="streaming-reasoning" />
        </div>
      </div>
    </div>

    <!-- Thinking state - no content yet -->
    <div v-else-if="status === 'thinking'" class="flex items-center gap-2 px-3 py-2 bg-bg-elevated rounded-lg border border-border">
      <div class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
        <span class="w-1.5 h-1.5 rounded-full bg-accent/60" style="animation: reasoning-pulse 1.2s ease-in-out 0.15s infinite" />
        <span class="w-1.5 h-1.5 rounded-full bg-accent/40" style="animation: reasoning-pulse 1.2s ease-in-out 0.3s infinite" />
      </div>
      <span class="text-xs text-text-muted">Thinking...</span>
    </div>

    <!-- Done state - collapsible block (always show if has content) -->
    <div v-else-if="status === 'done' && hasContent" class="bg-bg-elevated rounded-lg border border-border">
      <button 
        class="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-surface transition-colors cursor-pointer"
        @click="expanded = !expanded"
      >
        <svg 
          class="w-3 h-3 text-text-muted transition-transform" 
          :class="expanded ? 'rotate-90' : ''"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-xs text-text-secondary">Reasoned</span>
        <span v-if="duration" class="text-xs text-text-muted">· {{ duration }}</span>
      </button>
      
      <div v-if="expanded" class="px-3 pb-3 pt-1 border-t border-border mt-1">
        <div class="text-xs text-text-muted leading-relaxed">
          <MarkdownRenderer :content="renderedContent" message-id="streaming-reasoning" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes reasoning-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(0.8); }
}
</style>
