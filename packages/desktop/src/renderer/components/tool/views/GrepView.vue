<script setup lang="ts">
/**
 * GrepView — renders a GrepViewModel (match list).
 *
 * Layout: pattern header + count + scrollable match list
 * (resource : line : content, with line numbers).
 *
 * Props:
 *   - model: GrepViewModel (match data)
 *   - status: 'loading' | 'ready' | 'error'
 */
import { computed } from 'vue'
import type { GrepViewModel } from '../../../tool/rules/grep'
import type { FileTabStatus } from '../../../types/presentation'

const props = defineProps<{
  model: GrepViewModel
  status: FileTabStatus
}>()

// Group matches by resource for readability
const grouped = computed(() => {
  const map = new Map<string, { line: number; content: string; truncated: boolean }[]>()
  for (const m of props.model.matches) {
    const arr = map.get(m.resource) ?? []
    arr.push({ line: m.line, content: m.content, truncated: m.truncated })
    map.set(m.resource, arr)
  }
  return Array.from(map.entries())
})
</script>

<template>
  <div class="grep-view text-xs">
    <!-- Header -->
    <div class="text-text-muted mb-1 font-mono">
      ✱ Grep "{{ model.pattern }}"
      <span v-if="model.path"> in {{ model.path }}</span>
    </div>
    <div class="text-text-muted mb-2">
      {{ model.total }} match{{ model.total === 1 ? '' : 'es' }}
      <span v-if="model.truncated" class="text-warning"> · truncated</span>
      <span v-if="status === 'loading'" class="text-warning"> · loading...</span>
    </div>

    <!-- Empty -->
    <div v-if="model.total === 0" class="text-text-muted">No matches found</div>

    <!-- Grouped matches -->
    <div v-else class="space-y-2 max-h-96 overflow-y-auto">
      <div v-for="[resource, items] in grouped" :key="resource">
        <div class="text-accent font-mono mb-0.5">{{ resource }}</div>
        <div
          v-for="(m, i) in items"
          :key="i"
          class="flex gap-2 px-1 py-0.5 hover:bg-bg-surface rounded font-mono"
        >
          <span class="text-text-muted shrink-0 w-10 text-right">{{ m.line }}</span>
          <span class="text-text-primary truncate">{{ m.content }}<span v-if="m.truncated" class="text-warning">…</span></span>
        </div>
      </div>
    </div>
  </div>
</template>
