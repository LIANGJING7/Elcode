<script setup lang="ts">
/**
 * WebFetchView — renders a WebFetchViewModel (fetched markdown/text/html).
 *
 * Renders the fetched content as preformatted text. For markdown content,
 * a future enhancement could render it with a markdown renderer.
 *
 * Props:
 *   - model: WebFetchViewModel (fetched content data)
 *   - status: 'loading' | 'ready' | 'error'
 */
import { computed } from 'vue'
import type { WebFetchViewModel } from '../../../tool/rules/webfetch'
import type { FileTabStatus } from '../../../types/presentation'

const props = defineProps<{
  model: WebFetchViewModel
  status: FileTabStatus
}>()

const isMarkdown = computed(() => props.model.format === 'markdown')
</script>

<template>
  <div class="web-fetch-view text-xs">
    <!-- Header -->
    <div class="text-text-muted mb-1 font-mono break-all">
      % WebFetch {{ model.url }}
      <span v-if="model.contentType" class="text-text-muted"> · {{ model.contentType }}</span>
      <span v-if="status === 'loading'" class="text-warning"> · loading...</span>
    </div>

    <!-- Fetched content -->
    <pre
      v-if="model.content"
      class="bg-code-bg p-2 rounded overflow-x-auto font-mono leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap text-text-primary"
    >{{ model.content }}</pre>
    <div v-else class="text-text-muted">No content fetched</div>
  </div>
</template>
