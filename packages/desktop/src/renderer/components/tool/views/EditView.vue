<script setup lang="ts">
/**
 * EditView — renders an EditViewModel (unified diff).
 *
 * Layout: file title (# Edited <path>) + additions/deletions stats +
 * line-level diff with +/- coloring. A richer Shiki-backed diff renderer
 * can replace the line coloring later; this matches the existing DiffView
 * style for visual consistency.
 */
import { computed } from 'vue'
import type { EditViewModel } from '../../../tool/rules/edit'

const props = defineProps<{ vm: EditViewModel }>()

interface DiffLine {
  text: string
  type: 'add' | 'remove' | 'context' | 'hunk' | 'meta'
}

const diffLines = computed<DiffLine[]>(() => {
  if (!props.vm.diff) return []
  return props.vm.diff.split('\n').map((line) => {
    if (line.startsWith('@@')) return { text: line, type: 'hunk' as const }
    if (line.startsWith('+++') || line.startsWith('---')) return { text: line, type: 'meta' as const }
    if (line.startsWith('+')) return { text: line, type: 'add' as const }
    if (line.startsWith('-')) return { text: line, type: 'remove' as const }
    return { text: line, type: 'context' as const }
  })
})

const hasStats = computed(() => props.vm.additions != null || props.vm.deletions != null)
</script>

<template>
  <div class="edit-view text-xs">
    <!-- File title -->
    <div class="text-text-muted mb-1 font-mono"># Edited {{ vm.filePath }}</div>

    <!-- Stats -->
    <div v-if="hasStats" class="flex items-center gap-3 mb-1 text-text-muted">
      <span v-if="vm.additions != null" class="text-success">+{{ vm.additions }}</span>
      <span v-if="vm.deletions != null" class="text-error">-{{ vm.deletions }}</span>
    </div>

    <!-- Diff -->
    <div v-if="diffLines.length" class="diff-block bg-code-bg rounded overflow-x-auto font-mono">
      <div
        v-for="(line, i) in diffLines"
        :key="i"
        :class="[
          'px-2',
          line.type === 'add' ? 'bg-success/15 text-success' : '',
          line.type === 'remove' ? 'bg-error/15 text-error' : '',
          line.type === 'hunk' ? 'text-accent-muted bg-bg-surface' : '',
          line.type === 'meta' ? 'text-text-muted' : '',
          line.type === 'context' ? 'text-text-secondary' : '',
        ]"
      >
        {{ line.text }}
      </div>
    </div>
  </div>
</template>
