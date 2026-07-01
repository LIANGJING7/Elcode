<script setup lang="ts">
import type { TextLine } from '../../types/presentation'

const props = withDefaults(defineProps<{
  lines: TextLine[]
  lineNoWidth?: string
  wrap?: boolean
  showLineNumbers?: boolean
}>(), {
  lineNoWidth: '4ch',
  wrap: false,
  showLineNumbers: true,
})

const emit = defineEmits<{
  scroll: [scrollTop: number]
  selectLine: [lineId: string]
}>()
</script>

<template>
  <div
    class="code-lines font-mono text-sm"
    :class="wrap ? 'whitespace-pre-wrap' : 'whitespace-pre'"
    @scroll="emit('scroll', ($event.target as HTMLElement).scrollTop)"
  >
    <div
      v-for="line in lines"
      :key="line.id"
      class="code-line flex gap-3 px-3 py-0.5 hover:bg-bg-surface cursor-pointer"
      @click="emit('selectLine', line.id)"
    >
      <span
        v-if="showLineNumbers"
        class="line-no text-right text-text-muted select-none shrink-0"
        :style="{ width: lineNoWidth }"
      >
        {{ line.lineNumber }}
      </span>
      <pre class="line-text text-text-primary">{{ line.text }}</pre>
      <slot name="line-extra" :line="line" />
    </div>
  </div>
</template>
