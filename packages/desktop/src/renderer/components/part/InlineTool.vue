<script setup lang="ts">
import { ref, computed } from 'vue'
import { ICON_RUNNING, ICON_COMPLETED, ICON_ERROR, ICON_PENDING } from '../../tool/icons'

const props = defineProps<{
  icon: string
  summary: string
  pending: string
  status: 'pending' | 'running' | 'completed' | 'error'
  error?: string
  hideStatusIcon?: boolean
}>()

const emit = defineEmits<{ click: [] }>()
const errorExpanded = ref(false)

const statusIcon = computed(() => {
  switch (props.status) {
    case 'running': return { char: ICON_RUNNING, class: 'text-warning animate-pulse' }
    case 'completed': return { char: ICON_COMPLETED, class: 'text-success' }
    case 'error': return { char: ICON_ERROR, class: 'text-error' }
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
      <span class="animate-pulse text-warning">●</span>
      <span class="text-sm text-text-muted">{{ pending }}</span>
    </template>
    <template v-else>
      <span v-if="!hideStatusIcon" :class="['text-sm w-4 text-center', statusIcon.class]">{{ statusIcon.char }}</span>
      <span v-if="icon" class="text-xs text-accent w-4 text-center">{{ icon }}</span>
      <span class="text-xs text-text-primary flex-1 truncate" v-html="summary"></span>
    </template>
  </div>
  <div v-if="error && errorExpanded" class="error-detail ml-8 mt-1 text-xs text-error bg-error/10 p-2 rounded">{{ error }}</div>
</template>

<style scoped>
.animate-pulse { animation: icon-pulse 1.5s ease-in-out infinite; }
@keyframes icon-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>