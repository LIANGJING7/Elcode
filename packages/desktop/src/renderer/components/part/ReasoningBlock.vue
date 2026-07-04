<script setup lang="ts">
import { computed, ref } from 'vue'
import CollapsiblePanel from './CollapsiblePanel.vue'

const props = defineProps<{
  content: string
  status: 'idle' | 'thinking' | 'done'
  duration?: number
}>()

const expanded = ref(false)

const summary = computed(() => {
  const firstLine = props.content.split('\n')[0]?.trim() ?? ''
  return firstLine.length > 50 ? firstLine.slice(0, 50) + '…' : firstLine
})

const durationText = computed(() => {
  if (!props.duration) return ''
  const ms = props.duration
  if (ms < 1000) return `${ms}ms`
  return `${Math.floor(ms / 1000)}s`
})

const title = computed(() => {
  const dur = durationText.value ? ` · ${durationText.value}` : ''
  return expanded.value ? `- Thought: ${summary.value}${dur}` : `+ Thought: ${summary.value}${dur}`
})
</script>

<template>
  <CollapsiblePanel :title="title" :spinner="status === 'thinking'" :default-collapsed="true" @toggle="expanded = $event">
    <template #body>
      <div class="text-xs text-text-muted whitespace-pre-wrap">{{ content }}</div>
    </template>
  </CollapsiblePanel>
</template>