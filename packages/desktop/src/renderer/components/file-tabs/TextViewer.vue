<script setup lang="ts">
import { computed } from 'vue'
import type { ReadFileModel } from '../../types/presentation'
import CodeLines from './CodeLines.vue'

const props = defineProps<{
  model: ReadFileModel
  status: 'loading' | 'ready' | 'error'
}>()

const emit = defineEmits<{
  scroll: [scrollTop: number]
  selectLine: [lineId: string]
}>()

// 行号宽度动态计算: 根据最大行号位数
const lineNoWidth = computed(() => {
  const maxLine = props.model.lines.length + (props.model.lineStart ?? 1)
  const digits = String(maxLine).length
  return `${digits + 1}ch`
})

function handleScroll(scrollTop: number) {
  emit('scroll', scrollTop)
}
</script>

<template>
  <div class="text-viewer h-full flex flex-col">
    <!-- Header (支持 toolbar slot) -->
    <div class="viewer-header px-3 py-2 text-xs text-text-muted border-b border-border bg-bg-surface shrink-0">
      <slot name="toolbar">
        <span class="font-mono">
          <span class="text-text-primary">{{ model.fileName }}</span>
          <span v-if="model.directory" class="text-text-muted ml-1">{{ model.directory }}</span>
        </span>
        <span v-if="model.totalLines" class="ml-2">· {{ model.totalLines }} 行</span>
        <span v-if="model.truncated" class="ml-2 text-warning">· 截断</span>
        <span v-if="status === 'loading'" class="ml-2 animate-pulse text-accent">加载中...</span>
      </slot>
    </div>

    <!-- Code Lines (预留 VirtualList 替换) -->
    <CodeLines
      :lines="model.lines"
      :line-no-width="lineNoWidth"
      :wrap="model.options.wrap"
      :show-line-numbers="model.options.showLineNumbers"
      class="flex-1 overflow-auto bg-code-bg"
      @scroll="handleScroll"
      @select-line="emit('selectLine', $event)"
    >
      <template #line-extra="{ line }">
        <slot name="line-extra" :line="line" />
      </template>
    </CodeLines>
  </div>
</template>
