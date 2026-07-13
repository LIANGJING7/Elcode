<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  subagentType: string
  description: string
  state: string
  status: 'pending' | 'running' | 'completed' | 'error'
  sessionId?: string
  currentTool?: string
  toolcalls?: number
  duration?: number
  error?: string
  summary: string
}>()

const emit = defineEmits<{ 
  navigate: [sessionId: string]
  openPanel: []
}>()

const titleLabel = computed(() => {
  return props.description || props.summary || 'Subagent'
})

const subtitleLabel = computed(() => {
  if (!props.subagentType) return ''
  const kind = props.subagentType.charAt(0).toUpperCase() + props.subagentType.slice(1)
  return kind
})

const statusIcon = computed(() => {
  switch (props.state) {
    case 'running': return '●'
    case 'completed': return '●'
    case 'cancelled': return '○'
    case 'error': return '◍'
    default: return '●'
  }
})

const statusColor = computed(() => {
  switch (props.state) {
    case 'running': return 'text-warning animate-pulse'
    case 'completed': return 'text-success'
    case 'cancelled': return 'text-text-muted'
    case 'error': return 'text-error'
    default: return 'text-text-muted'
  }
})

const handleClick = () => {
  if (props.sessionId) {
    emit('navigate', props.sessionId)
    emit('openPanel')
  }
}
</script>

<template>
  <div
    class="subagent-tool flex items-center gap-1.5 px-3 py-2 rounded border cursor-pointer hover:bg-bg-surface transition-colors bg-bg-surface/50"
    :class="state === 'error' ? 'border-error/30' : state === 'completed' ? 'border-success/30' : 'border-accent/30'"
    @click="handleClick"
  >
    <span :class="['text-sm', statusColor]">{{ statusIcon }}</span>
    <span class="text-sm text-text-primary">{{ titleLabel }}</span>
    <span v-if="subtitleLabel" class="text-sm text-text-muted">{{ '  ' + subtitleLabel }}</span>
  </div>
</template>

<style scoped>
.animate-pulse { animation: icon-pulse 1.5s ease-in-out infinite; }
@keyframes icon-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>