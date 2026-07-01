<script setup lang="ts">
import { computed } from 'vue'
import { useStreamingMarkdown } from '../../composables/useStreamingMarkdown'
import MarkdownRenderer from '../chat/MarkdownRenderer.vue'

const props = defineProps<{
  content: string
  isStreaming: boolean
}>()

const contentRef = computed(() => props.content)
const { renderedContent } = useStreamingMarkdown(contentRef)
</script>

<template>
  <div class="streaming-text">
    <MarkdownRenderer :content="renderedContent" message-id="streaming" />

    <!-- Cursor indicator when streaming -->
    <span
      v-if="isStreaming && content.length > 0"
      class="inline-block w-0.5 h-4 bg-accent animate-pulse-glow ml-0.5"
    />
  </div>
</template>

<style scoped>
:deep(.code-block) {
  font-family: 'JetBrains Mono', 'Cascadia Code', Consolas, monospace;
}
</style>
