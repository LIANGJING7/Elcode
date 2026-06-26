<script setup lang="ts">
import type { ToolCall } from '../../../types/ipc'

const props = defineProps<{ toolCall: ToolCall }>()

// 简化 diff 渲染: 从 result.diff 提取, 行级 +红/-绿
const diffLines = computed(() => {
  const result = props.toolCall.result as { diff?: string } | undefined
  if (!result?.diff) return []
  return result.diff.split('\n').map((line) => ({
    text: line,
    type: line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : 'context',
  }))
})

import { computed } from 'vue'
</script>

<template>
  <div class="diff-view text-xs mt-1">
    <div
      v-for="(line, i) in diffLines.slice(0, 10)"
      :key="i"
      :class="[
        'px-1',
        line.type === 'add' ? 'bg-success/20 text-success' : '',
        line.type === 'remove' ? 'bg-error/20 text-error' : '',
      ]"
    >
      {{ line.text }}
    </div>
    <div v-if="diffLines.length > 10" class="text-accent-muted px-1">
      +{{ diffLines.length - 10 }} more lines
    </div>
  </div>
</template>