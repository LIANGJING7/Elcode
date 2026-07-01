<script setup lang="ts">
import { computed } from 'vue'
import type { DiffModel, DiffLine } from '../../types/presentation'

const props = defineProps<{
  model: DiffModel
  status: 'loading' | 'ready' | 'error'
}>()

const emit = defineEmits<{
  scroll: [scrollTop: number]
  selectHunk: [hunkId: string]
  toggleHunk: [hunkId: string]
}>()

// 过滤是否显示 meta 行
const visibleLines = computed(() =>
  props.model.options.showMeta
    ? props.model.lines
    : props.model.lines.filter((l) => l.type !== 'meta'),
)

const LINE_STYLE_MAP: Record<DiffLine['type'], string> = {
  add: 'bg-success/15 text-success',
  remove: 'bg-error/15 text-error',
  context: 'text-text-secondary',
  hunk: 'bg-accent-muted/20 text-accent-muted',
  meta: 'text-text-muted',
}
</script>

<template>
  <div class="diff-viewer h-full flex flex-col">
    <!-- Header (支持 toolbar slot) -->
    <div class="viewer-header px-3 py-2 text-xs border-b border-border bg-bg-surface shrink-0">
      <slot name="toolbar">
        <span class="font-mono text-text-muted">
          <span class="text-text-primary">{{ model.fileName }}</span>
          <span v-if="model.directory" class="text-text-muted ml-1">{{ model.directory }}</span>
        </span>
        <div class="stats mt-1 flex gap-3">
          <span class="text-success">+{{ model.statistics.additions }}</span>
          <span class="text-error">-{{ model.statistics.deletions }}</span>
        </div>
      </slot>
    </div>

    <!-- Diff Lines -->
    <div
      class="diff-lines flex-1 overflow-auto bg-code-bg font-mono text-sm"
      @scroll="emit('scroll', ($event.target as HTMLElement).scrollTop)"
    >
      <div
        v-for="line in visibleLines"
        :key="line.id"
        :data-line-type="line.type"
        :class="['diff-line px-3 py-0.5', LINE_STYLE_MAP[line.type]]"
      >
        <!-- Unified mode -->
        <div v-if="model.options.mode === 'unified'" class="flex gap-3">
          <span v-if="line.oldLine" class="w-8 text-right text-text-muted select-none shrink-0">{{ line.oldLine }}</span>
          <span v-else class="w-8 shrink-0"></span>
          <span v-if="line.newLine" class="w-8 text-right text-text-muted select-none shrink-0">{{ line.newLine }}</span>
          <span v-else class="w-8 shrink-0"></span>
          <pre class="line-text whitespace-pre">{{ line.text }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
