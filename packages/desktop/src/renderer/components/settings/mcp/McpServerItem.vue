<template>
  <button
    class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors duration-fast cursor-pointer"
    :class="selectedServer === name
      ? 'bg-accent/10 text-accent'
      : 'text-text hover:bg-bg-hover'"
    @click="$emit('select', name)"
  >
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="w-5 h-5 rounded bg-bg-surface flex items-center justify-center flex-shrink-0">
        <svg class="w-3.5 h-3.5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="2" width="20" height="20" rx="5"/>
          <path d="M16 8h.01M8 8h.01M8 16h.01M16 16h.01M12 12h.01"/>
        </svg>
      </div>
      <div class="min-w-0">
        <div class="truncate font-medium">{{ name }}</div>
        <div class="text-xs text-text-muted truncate">
          {{ statusText }} • MCP
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span
        class="w-2 h-2 rounded-full flex-shrink-0"
        :class="statusColor"
      />
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { McpServerStatus } from '../../../../types/ipc'

const props = defineProps<{
  name: string
  status: McpServerStatus
  selectedServer?: string
}>()

defineEmits<{
  select: [name: string]
}>()

const statusText = computed(() => {
  switch (props.status.status) {
    case 'connected': return 'Connected'
    case 'disabled': return 'Disabled'
    case 'auth_required': return 'Auth Required'
    case 'auth_failed': return 'Auth Failed'
    case 'failed': return 'Connection Failed'
    case 'testing': return 'Testing...'
    default: return 'Unknown'
  }
})

const statusColor = computed(() => {
  switch (props.status.status) {
    case 'connected': return 'bg-green-500'
    case 'disabled': return 'bg-text-muted/40'
    case 'auth_required': case 'auth_failed': return 'bg-yellow-500'
    case 'failed': return 'bg-red-500'
    case 'testing': return 'bg-blue-500'
    default: return 'bg-text-muted/40'
  }
})
</script>