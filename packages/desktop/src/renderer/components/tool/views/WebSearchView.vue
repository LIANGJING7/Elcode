<script setup lang="ts">
/**
 * WebSearchView — renders a WebSearchViewModel.
 *
 * The backend returns a provider-formatted text blob (not a parsed result
 * list), so we render it as preformatted text. A future enhancement could
 * parse it into structured {title, url, snippet} entries.
 *
 * Props:
 *   - model: WebSearchViewModel (search result data)
 *   - status: 'loading' | 'ready' | 'error'
 */
import type { WebSearchViewModel } from '../../../tool/rules/websearch'
import type { FileTabStatus } from '../../../types/presentation'

defineProps<{
  model: WebSearchViewModel
  status: FileTabStatus
}>()
</script>

<template>
  <div class="web-search-view text-xs">
    <!-- Header -->
    <div class="text-text-muted mb-1 font-mono">
      ◈ {{ model.provider || 'Search' }} "{{ model.query }}"
      <span v-if="status === 'loading'" class="text-warning"> · loading...</span>
    </div>

    <!-- Empty -->
    <div v-if="!model.hasResults" class="text-text-muted">No search results found</div>

    <!-- Result text blob -->
    <pre
      v-else
      class="bg-code-bg p-2 rounded overflow-x-auto font-mono leading-relaxed max-h-96 whitespace-pre-wrap text-text-primary"
    >{{ model.text }}</pre>
  </div>
</template>
