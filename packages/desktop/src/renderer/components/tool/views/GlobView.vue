<script setup lang="ts">
/**
 * GlobView — renders a GlobViewModel (matched file list).
 *
 * Props:
 *   - model: GlobViewModel (file list data)
 *   - status: 'loading' | 'ready' | 'error'
 */
import { computed } from 'vue'
import type { GlobViewModel } from '../../../tool/rules/glob'
import type { FileTabStatus } from '../../../types/presentation'

const props = defineProps<{
  model: GlobViewModel
  status: FileTabStatus
}>()

// Split into directories (end with /) and files for visual grouping
const sorted = computed(() => [...props.model.files].sort())
</script>

<template>
  <div class="glob-view text-xs">
    <!-- Header -->
    <div class="text-text-muted mb-1 font-mono">
      ✱ Glob "{{ model.pattern }}"
      <span v-if="model.path"> in {{ model.path }}</span>
    </div>
    <div class="text-text-muted mb-2">
      {{ model.total }} file{{ model.total === 1 ? '' : 's' }}
      <span v-if="model.truncated" class="text-warning"> · truncated</span>
      <span v-if="status === 'loading'" class="text-warning"> · loading...</span>
    </div>

    <!-- Empty -->
    <div v-if="model.total === 0" class="text-text-muted">No files found</div>

    <!-- File list -->
    <div v-else class="max-h-96 overflow-y-auto space-y-0.5 font-mono">
      <div
        v-for="f in sorted"
        :key="f"
        class="px-1 py-0.5 hover:bg-bg-surface rounded truncate text-text-primary"
      >
        {{ f }}
      </div>
    </div>
  </div>
</template>
