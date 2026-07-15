<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ICON_RUNNING, ICON_COMPLETED, ICON_ERROR, ICON_PENDING } from '../../tool/icons'
import { getErrorMessage, isDeniedErrorObject } from '../../utils/error-utils'

const props = defineProps<{
  icon: string
  summary: string
  pending: string
  status: 'pending' | 'running' | 'completed' | 'error'
  error?: string | { type: string; message: string }
  hideStatusIcon?: boolean
}>()

// Debug: log status changes
watch(() => props.status, (status) => {
  console.log('[InlineTool] status changed:', status, 'summary:', props.summary?.slice(0, 50))
}, { immediate: true })

const emit = defineEmits<{ click: [] }>()
const errorExpanded = ref(false)

const errorMessage = computed(() => getErrorMessage(props.error))

const isDenied = computed(() => {
  if (typeof props.error === 'object' && props.error !== null) {
    return isDeniedErrorObject(props.error)
  }
  return false
})

const statusIcon = computed(() => {
  switch (props.status) {
    case 'running': return { char: ICON_RUNNING, class: 'text-warning animate-pulse' }
    case 'completed': return { char: ICON_COMPLETED, class: 'text-success' }
    case 'error': return { char: ICON_ERROR, class: isDenied.value ? 'text-text-muted' : 'text-error' }
    default: return { char: ICON_PENDING, class: 'text-text-muted' }
  }
})

const handleClick = () => {
  if (props.error) errorExpanded.value = !errorExpanded.value
  emit('click')
}
</script>

<template>
  <div class="inline-tool flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-bg-surface" @click="handleClick">
    <template v-if="status === 'running'">
      <span v-if="!hideStatusIcon" class="animate-pulse text-warning">●</span>
      <span v-if="icon" class="text-xs text-accent w-4 text-center">{{ icon }}</span>
      <span class="text-xs text-text-muted animate-pulse-glow flex-1 truncate" v-html="summary"></span>
    </template>
    <template v-else>
      <span v-if="!hideStatusIcon" :class="['text-sm w-4 text-center', statusIcon.class]">{{ statusIcon.char }}</span>
      <span v-if="icon" class="text-xs text-accent w-4 text-center">{{ icon }}</span>
      <span 
        :class="['text-xs text-text-primary flex-1 truncate', { 'line-through text-text-muted': isDenied }]" 
        v-html="summary"
      ></span>
    </template>
  </div>
  <div 
    v-if="errorMessage && errorExpanded" 
    :class="['error-detail ml-8 mt-1 text-xs p-2 rounded', isDenied ? 'text-text-muted bg-bg-surface' : 'text-error bg-error/10']"
  >{{ errorMessage }}</div>
</template>

<style scoped>
.animate-pulse { animation: icon-pulse 1.5s ease-in-out infinite; }
.animate-pulse-glow { animation: pulse-glow 1.5s ease-in-out infinite; }
</style>

<style>
@keyframes icon-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes pulse-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
</style>