<script setup lang="ts">
/**
 * GenericView — fallback for tools with a SimpleViewModel.
 * Renders the summary text; the expanded JSON detail is handled by
 * ToolCallExpanded when no structured component is available.
 */
import type { SimpleViewModel } from '../../../tool/rules/simple'

defineProps<{ vm: SimpleViewModel }>()
</script>

<template>
  <div class="text-xs text-text-muted">{{ vm.summary }}</div>
</template>
