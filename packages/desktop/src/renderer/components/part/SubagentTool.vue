<script setup lang="ts">
import { computed } from 'vue'
import { ICON_TASK_RUNNING, ICON_TASK_DONE, ICON_TASK_ERROR } from '../../tool/icons'

const props = defineProps<{
  summary: string
  status: 'pending' | 'running' | 'completed' | 'error'
  sessionId?: string
  currentTool?: string
  toolcalls?: number
  duration?: number
  error?: string
}>()

const emit = defineEmits<{ 
  navigate: [sessionId: string]
  openPanel: []  // New: request to open panel
}>()

const icon = computed(() => {
  switch (props.status) {
    case 'running': return ICON_TASK_RUNNING
    case 'completed': return ICON_TASK_DONE
    case 'error': return ICON_TASK_ERROR
    default: return ICON_TASK_RUNNING
  }
})

const iconClass = computed(() => {
  switch (props.status) {
    case 'running': return 'text-warning animate-pulse'
    case 'completed': return 'text-success'
    case 'error': return 'text-error'
    default: return 'text-text-muted'
  }
})

const progressText = computed(() => {
  if (props.status === 'running' && props.currentTool) return `↳ ${props.currentTool}`
  if (props.status === 'completed' && props.toolcalls && props.duration) {
    const dur = props.duration < 1000 ? `${props.duration}ms` : `${Math.floor(props.duration / 1000)}s`
    return `↳ ${props.toolcalls} toolcalls · ${dur}`
  }
  if (props.status === 'error' && props.error) return `↳ ${props.error}`
  return ''
})

const handleClick = () => {
  if (props.sessionId) {
    emit('navigate', props.sessionId)
    emit('openPanel')
  }
}
</script>

<template>
  <div class="subagent-tool flex flex-col gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-bg-surface" @click="handleClick">
    <div class="flex items-center gap-2">
      <span :class="['text-sm w-4 text-center', iconClass]">{{ icon }}</span>
      <span v-if="status === 'running'" class="animate-pulse text-warning">●</span>
      <span class="text-xs text-text-primary font-medium flex-1 truncate">{{ summary }}</span>
    </div>
    <div v-if="progressText" class="text-xs text-text-muted ml-6">{{ progressText }}</div>
  </div>
</template>

<style scoped>
.animate-pulse { animation: icon-pulse 1.5s ease-in-out infinite; }
@keyframes icon-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>