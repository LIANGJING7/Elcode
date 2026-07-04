<script setup lang="ts">
import { ref, computed } from 'vue'
import CollapsiblePanel from './CollapsiblePanel.vue'

const props = defineProps<{
  title: string
  body: string
  status: 'pending' | 'running' | 'completed' | 'error'
  error?: string
  maxLines?: number
}>()

const emit = defineEmits<{ click: [] }>()
const expanded = ref(true)
const maxLines = props.maxLines ?? 10

const collapsed = computed(() => {
  const lines = props.body.split('\n')
  if (lines.length <= maxLines) return { output: props.body, overflow: false }
  return { output: lines.slice(0, maxLines).join('\n') + '\n…', overflow: true }
})

const toggle = () => { expanded.value = !expanded.value }
</script>

<template>
  <CollapsiblePanel :title="title" :spinner="status === 'running'" :default-collapsed="false">
    <template #header-extra>
      <span v-if="status === 'running'" class="text-xs text-text-muted ml-2">running...</span>
    </template>
    <template #body>
      <pre v-if="body" class="text-xs font-mono text-text overflow-x-auto bg-bg-code p-2 rounded max-h-64">{{ expanded ? body : collapsed.output }}</pre>
      <div v-if="collapsed.overflow && !expanded" class="text-xs text-text-muted mt-1 cursor-pointer" @click="toggle">Click to expand</div>
      <div v-if="error" class="error mt-2 text-xs text-error bg-error/10 p-2 rounded">{{ error }}</div>
    </template>
  </CollapsiblePanel>
</template>