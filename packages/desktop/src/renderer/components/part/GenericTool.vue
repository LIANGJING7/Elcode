<script setup lang="ts">
import { computed } from 'vue'
import BlockTool from './BlockTool.vue'
import type { ToolCall } from '../../../types/ipc'

const props = defineProps<{ tool: ToolCall }>()

const title = computed(() => {
  const name = props.tool.name
  const args = Object.entries(props.tool.args).slice(0, 3).map(([k, v]) => `${k}=${typeof v === 'string' ? truncate(v, 20) : '…'}`).join(', ')
  return `# ${name} [${args}]`
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
  <BlockTool :title="title" :body="body" :status="tool.status" :error="tool.error" />
</template>