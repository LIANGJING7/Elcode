<script setup lang="ts">
import { computed } from 'vue'
import BlockTool from './BlockTool.vue'
import type { ToolCall } from '../../../types/ipc'

const props = defineProps<{ tool: ToolCall }>()

const name = computed(() => props.tool.name)
const summary = computed(() => {
  const firstArg = Object.values(props.tool.args).find((v) => typeof v === 'string')
  return typeof firstArg === 'string' ? truncate(firstArg, 60) : ''
})

const body = computed(() => {
  if (props.tool.output?.result) {
    try { return JSON.stringify(props.tool.output.result, null, 2) }
    catch { return String(props.tool.output.result) }
  }
  return ''
})

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}
</script>

<template>
  <BlockTool :title="`调用了 \`${name}\` ${summary}`" :body="body" :status="tool.status" :error="tool.error" hide-arrow>
    <template #header>
      <div class="flex items-center gap-1 min-w-0">
        <span class="text-xs font-medium shrink-0">调用了 <code class="text-xs">{{ name }}</code></span>
        <span v-if="summary" class="text-xs text-text-muted truncate">{{ summary }}</span>
      </div>
    </template>
  </BlockTool>
</template>