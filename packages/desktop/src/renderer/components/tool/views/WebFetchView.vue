<script setup lang="ts">
/**
 * WebFetchView — renders a WebFetchViewModel (fetched markdown/text/html).
 *
 * Supports:
 * - Markdown rendering (using MarkdownRenderer)
 * - Plain text rendering (preformatted)
 *
 * Markdown detection criteria:
 * - format === 'markdown'
 * - contentType includes 'markdown'
 * - URL ends with .md, .mdx, or .markdown
 */
import { computed } from 'vue'
import type { WebFetchViewModel } from '../../../tool/rules/webfetch'
import type { FileTabStatus } from '../../../types/presentation'
import MarkdownRenderer from '../../chat/MarkdownRenderer.vue'

const props = defineProps<{
  model: WebFetchViewModel
  status: FileTabStatus
}>()

/**
 * Enhanced markdown detection.
 *
 * Many Git raw URLs return text/plain but the content
 * is actually markdown (based on file extension).
 */
const isMarkdown = computed(() => {
  const format = props.model.format
  const contentType = props.model.contentType
  const url = props.model.url

  return (
    format === 'markdown' ||
    contentType?.includes('markdown') ||
    url?.endsWith('.md') ||
    url?.endsWith('.mdx') ||
    url?.endsWith('.markdown') ||
    // GitHub raw files
    url?.includes('/raw/') && (
      url?.endsWith('.md') ||
      url?.endsWith('.mdx')
    )
  )
})
</script>

<template>
  <div class="web-fetch-view text-xs">
    <!-- Header -->
    <div class="text-text-muted mb-1 font-mono break-all">
      % WebFetch {{ model.url }}
      <span v-if="model.contentType" class="text-text-muted"> · {{ model.contentType }}</span>
      <span v-if="isMarkdown" class="text-accent"> · markdown</span>
      <span v-if="status === 'loading'" class="text-warning"> · loading...</span>
    </div>

    <!-- Markdown content -->
    <div
      v-if="model.content && isMarkdown"
      class="markdown-content bg-code-bg p-3 rounded overflow-x-auto max-h-96 overflow-y-auto"
    >
      <MarkdownRenderer :content="model.content" />
    </div>

    <!-- Plain text content -->
    <pre
      v-else-if="model.content"
      class="bg-code-bg p-2 rounded overflow-x-auto font-mono leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap text-text-primary"
    >{{ model.content }}</pre>

    <!-- No content -->
    <div v-else class="text-text-muted">No content fetched</div>
  </div>
</template>

<style scoped>
.markdown-content {
  /* Reset font for markdown (not monospace) */
  font-family: inherit;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.markdown-content :deep(pre) {
  background: var(--color-bg-elevated);
  padding: 0.5em;
  border-radius: 4px;
  overflow-x: auto;
}

.markdown-content :deep(code) {
  font-family: monospace;
  font-size: 0.9em;
}

.markdown-content :deep(a) {
  color: var(--color-accent);
}
</style>