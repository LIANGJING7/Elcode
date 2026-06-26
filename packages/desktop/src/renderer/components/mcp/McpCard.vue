<template>
  <div class="mcp-card p-4 rounded-lg bg-bg-surface border border-border hover:border-border-light transition-colors">
    <div class="flex items-center justify-between">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-medium text-text truncate">{{ name }}</h3>
          <StatusBadge :status="status.status" />
        </div>
        <p v-if="status.error" class="text-2xs text-red-400 mt-1 truncate">
          {{ status.error }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="status.status === 'disconnected' || status.status === 'disabled' || status.status === 'failed'"
          class="px-2.5 py-1 rounded bg-accent hover:bg-accent-hover text-white text-2xs font-medium transition-colors"
          @click="$emit('connect')"
        >
          Connect
        </button>
        <button
          v-if="status.status === 'connected'"
          class="px-2.5 py-1 rounded bg-bg-hover hover:bg-bg-elevated border border-border text-text text-2xs transition-colors"
          @click="$emit('disconnect')"
        >
          Disconnect
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MCPStatus } from '../../../types/ipc'
import StatusBadge from './StatusBadge.vue'

const props = defineProps<{
  name: string
  status: MCPStatus
}>()

defineEmits<{
  connect: []
  disconnect: []
}>()
</script>

<style scoped>
.mcp-card {
  cursor: default;
}
</style>