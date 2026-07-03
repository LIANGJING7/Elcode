<script setup lang="ts">
/**
 * DiffViewer — displays diff with unified or split mode.
 *
 * Uses DiffRow model for split view:
 * - Single scroll container (no sync needed)
 * - Natural equal-height sides
 * - Simple folding and selection
 * - Easy virtual scroll integration
 */
import { ref, computed, watch } from 'vue'
import type { DiffModel, DiffLine } from '../../types/presentation'
import type { DiffRow, DiffHunk } from '../../types/render'
import { parseDiffToRows, filterRowsByFolding, toggleHunkFold } from '../../services/diff-converter'

const props = defineProps<{
  model: DiffModel
  status: 'loading' | 'ready' | 'error'
}>()

const emit = defineEmits<{
  scroll: [scrollTop: number]
  selectHunk: [hunkId: string]
  toggleHunk: [hunkId: string]
}>()

// Convert DiffModel.lines to DiffRow[] for split mode
const diffData = computed(() => {
  // If model already has diffRows, use them
  // Otherwise convert from unified diff text
  const diffText = props.model.lines
    .filter(l => l.type !== 'meta')
    .map(l => {
      if (l.type === 'hunk') return l.text
      if (l.type === 'add') return '+' + l.text
      if (l.type === 'remove') return '-' + l.text
      return ' ' + l.text
    })
    .join('\n')

  return parseDiffToRows(diffText)
})

// Folding state
const foldedHunks = ref(new Set<string>())

// Filtered rows (respecting folding)
const visibleRows = computed(() => {
  return filterRowsByFolding(diffData.value.rows, foldedHunks.value)
})

// Statistics (use model or computed)
const statistics = computed(() => {
  if (props.model.statistics) {
    return props.model.statistics
  }
  return diffData.value.statistics
})

// Toggle fold for a hunk
function handleToggleFold(hunkId: string) {
  foldedHunks.value = toggleHunkFold(hunkId, foldedHunks.value)
  emit('toggleHunk', hunkId)
}

// Get row style based on type
function getRowClass(row: DiffRow): string {
  if (row.type === 'hunk-header') {
    return 'bg-accent-muted/20 text-accent-muted'
  }
  if (row.type === 'change') {
    if (row.old && !row.new) return 'bg-error/10'  // Deletion only
    if (!row.old && row.new) return 'bg-success/10'  // Addition only
    return ''  // Paired change
  }
  return ''  // Context
}

// Get cell style
function getCellClass(side: 'old' | 'new', row: DiffRow): string {
  if (row.type !== 'change') return ''
  if (side === 'old' && row.old) return 'text-error'
  if (side === 'new' && row.new) return 'text-success'
  return 'text-text-secondary'
}
</script>

<template>
  <div class="diff-viewer h-full flex flex-col">
    <!-- Header -->
    <div class="viewer-header px-3 py-2 text-xs border-b border-border bg-bg-surface shrink-0">
      <slot name="toolbar">
        <span class="font-mono text-text-muted">
          <span class="text-text-primary">{{ model.fileName }}</span>
          <span v-if="model.directory" class="text-text-muted ml-1">{{ model.directory }}</span>
        </span>
        <div class="stats mt-1 flex gap-3">
          <span class="text-success">+{{ statistics.additions }}</span>
          <span class="text-error">-{{ statistics.deletions }}</span>
        </div>
      </slot>
    </div>

    <!-- Single scroll container -->
    <div
      class="diff-scroll flex-1 overflow-auto bg-code-bg font-mono text-sm"
      @scroll="emit('scroll', ($event.target as HTMLElement).scrollTop)"
    >
      <!-- Unified mode: single column -->
      <template v-if="model.options.mode === 'unified'">
        <div
          v-for="row in visibleRows"
          :key="row.id"
          class="diff-row-unified flex gap-3 px-3 py-0.5"
          :class="getRowClass(row)"
        >
          <!-- Hunk header -->
          <template v-if="row.type === 'hunk-header'">
            <button
              class="hunk-toggle flex items-center gap-1 text-xs"
              @click="handleToggleFold(row.hunkId)"
            >
              <span>{{ row.folded ? '▶' : '▼' }}</span>
              <span v-if="row.folded">··· {{ row.lineCount }} lines ···</span>
              <span v-else>{{ row.lineCount }} lines</span>
            </button>
          </template>

          <!-- Change/context row -->
          <template v-else>
            <span class="w-8 text-right text-text-muted select-none shrink-0">
              {{ row.old?.number ?? '' }}
            </span>
            <span class="w-8 text-right text-text-muted select-none shrink-0">
              {{ row.new?.number ?? '' }}
            </span>
            <span class="change-marker w-4 shrink-0 text-center">
              <span v-if="row.old && !row.new">-</span>
              <span v-if="!row.old && row.new">+</span>
              <span v-if="row.old && row.new"> </span>
            </span>
            <pre class="line-text whitespace-pre flex-1">{{ row.old?.text ?? row.new?.text ?? '' }}</pre>
          </template>
        </div>
      </template>

      <!-- Split mode: two columns -->
      <template v-else>
        <!-- Column headers -->
        <div class="split-header grid grid-cols-2 px-3 py-1 text-xs text-text-muted bg-bg-elevated sticky top-0">
          <div class="left-header">Old</div>
          <div class="right-header">New</div>
        </div>

        <!-- Diff rows -->
        <div
          v-for="row in visibleRows"
          :key="row.id"
          class="diff-row-split"
        >
          <!-- Hunk header (spans both columns) -->
          <template v-if="row.type === 'hunk-header'">
            <div class="hunk-header col-span-2 px-3 py-0.5 bg-accent-muted/20 flex items-center justify-center">
              <button
                class="hunk-toggle text-xs text-accent-muted hover:text-accent"
                @click="handleToggleFold(row.hunkId)"
              >
                <span v-if="row.folded">▶ ··· {{ row.lineCount }} unchanged lines ··· Expand</span>
                <span v-else>▼ {{ row.lineCount }} lines Collapse</span>
              </button>
            </div>
          </template>

          <!-- Change/context row (grid 2 columns) -->
          <template v-else>
            <div class="grid grid-cols-2 gap-0" :class="getRowClass(row)">
              <!-- Left cell (old/deletion) -->
              <div
                class="left-cell px-3 py-0.5 border-r border-border/30"
                :class="getCellClass('old', row)"
              >
                <div class="flex gap-2">
                  <span class="line-no w-8 text-right text-text-muted select-none shrink-0">
                    {{ row.old?.number ?? '' }}
                  </span>
                  <span v-if="row.old && !row.new" class="change-marker text-error shrink-0">-</span>
                  <span v-else class="change-marker shrink-0"> </span>
                  <pre class="line-text whitespace-pre flex-1">{{ row.old?.text ?? '' }}</pre>
                </div>
              </div>

              <!-- Right cell (new/addition) -->
              <div
                class="right-cell px-3 py-0.5"
                :class="getCellClass('new', row)"
              >
                <div class="flex gap-2">
                  <span class="line-no w-8 text-right text-text-muted select-none shrink-0">
                    {{ row.new?.number ?? '' }}
                  </span>
                  <span v-if="!row.old && row.new" class="change-marker text-success shrink-0">+</span>
                  <span v-else class="change-marker shrink-0"> </span>
                  <pre class="line-text whitespace-pre flex-1">{{ row.new?.text ?? '' }}</pre>
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.diff-scroll {
  scrollbar-width: thin;
}

.diff-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.diff-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.diff-scroll::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

.hunk-toggle {
  cursor: pointer;
  transition: color 0.15s ease;
}

.change-marker {
  font-weight: bold;
}

.line-text {
  margin: 0;
  padding: 0;
  font-family: inherit;
}
</style>