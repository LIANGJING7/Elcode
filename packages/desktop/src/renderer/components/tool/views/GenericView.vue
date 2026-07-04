<script setup lang="ts">
/**
 * GenericView — fallback for tools with a SimpleViewModel (including MCP tools).
 * Renders the summary text and error if present.
 */
import type { SimpleViewModel } from '../../../tool/rules/simple'

defineProps<{ vm: SimpleViewModel }>()
</script>

<template>
  <div class="generic-view text-xs">
    <div class="text-text-muted">{{ vm.summary }}</div>
    <div v-if="vm.error" class="mt-1 p-2 bg-error/10 rounded text-error">
      {{ vm.error }}
    </div>
  </div>
</template>
