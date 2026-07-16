<script setup lang="ts">
import { computed } from 'vue'
import CollapsiblePanel from './CollapsiblePanel.vue'
import { getErrorMessage, isDeniedErrorObject } from '../../utils/error-utils'

const props = defineProps<{
  title: string
  body: string
  status: 'pending' | 'running' | 'completed' | 'error'
  error?: string | { type: string; message: string }
  hideArrow?: boolean
}>()

const emit = defineEmits<{ click: [] }>()
const maxLines = 15

const collapsed = computed(() => {
  if (!props.body) return { output: '', overflow: false, lineCount: 0 }
  const lines = props.body.split('\n')
  if (lines.length <= maxLines) return { output: props.body, overflow: false, lineCount: lines.length }
  return { output: lines.slice(0, maxLines).join('\n') + '\n…', overflow: true, lineCount: lines.length }
})

const errorMessage = computed(() => getErrorMessage(props.error))

const isDenied = computed(() => {
  if (typeof props.error === 'object' && props.error !== null) {
    return isDeniedErrorObject(props.error)
  }
  return false
})
</script>

<template>
    <CollapsiblePanel :title="title" :spinner="status === 'running'" :default-collapsed="!body" :hide-arrow="hideArrow">
    <template #header>
      <slot name="header">
        <span class="text-xs font-medium">{{ title }}</span>
      </slot>
    </template>
    <template #header-extra>
      <span v-if="status === 'running'" class="text-xs text-text-muted ml-2">running...</span>
      <span v-else-if="collapsed.lineCount" class="text-xs text-text-muted ml-2">{{ collapsed.lineCount }} 行</span>
    </template>
    <template #body>
      <pre v-if="body" class="text-xs font-mono text-text overflow-auto bg-bg-code p-2 rounded max-h-[400px]">{{ body }}</pre>
      <div v-if="!body && !errorMessage" class="text-xs text-text-muted p-2">（无输出）</div>
      <div 
        v-if="errorMessage" 
        :class="['error mt-2 text-xs p-2 rounded', isDenied ? 'line-through text-text-muted bg-bg-surface' : 'text-error bg-error/10']"
      >{{ errorMessage }}</div>
    </template>
  </CollapsiblePanel>
</template>