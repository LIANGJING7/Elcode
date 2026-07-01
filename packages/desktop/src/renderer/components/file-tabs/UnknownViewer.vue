<script setup lang="ts">
/**
 * UnknownViewer — fallback viewer for unregistered tool types.
 *
 * Displays raw tool data (name, args, result) for debugging.
 * Used when a tool is not registered in TOOL_BUILDERS.
 */
import type { UnknownToolModel } from '../../types/presentation'
import type { FileTabStatus } from '../../types/presentation'

defineProps<{
  model: UnknownToolModel
  status: FileTabStatus
}>()
</script>

<template>
  <div class="unknown-viewer h-full flex flex-col">
    <!-- Header -->
    <div class="viewer-header px-3 py-2 text-xs border-b border-border bg-bg-surface shrink-0">
      <span class="text-warning font-medium">⚠ Unknown tool</span>
      <span class="font-mono text-text-muted ml-2">{{ model.toolName }}</span>
      <span v-if="status === 'loading'" class="ml-2 text-accent animate-pulse">loading...</span>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-auto p-3 space-y-3 text-xs">
      <!-- Arguments -->
      <div v-if="model.args && Object.keys(model.args).length > 0">
        <div class="text-text-muted font-medium mb-1">Arguments</div>
        <pre class="bg-code-bg p-2 rounded font-mono overflow-x-auto">{{ JSON.stringify(model.args, null, 2) }}</pre>
      </div>

      <!-- Result -->
      <div v-if="model.result !== undefined && model.result !== null">
        <div class="text-text-muted font-medium mb-1">Result</div>
        <pre class="bg-code-bg p-2 rounded font-mono overflow-x-auto max-h-64 overflow-y-auto">{{ JSON.stringify(model.result, null, 2) }}</pre>
      </div>

      <!-- Empty state -->
      <div v-if="!model.args && model.result === undefined" class="text-text-muted">
        No data available
      </div>
    </div>
  </div>
</template>