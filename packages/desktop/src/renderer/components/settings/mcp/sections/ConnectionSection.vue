<template>
  <div class="space-y-4">
    <h4 class="text-sm font-medium text-text">连接状态</h4>

    <div class="text-xs space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-text-muted">状态</span>
        <span
          class="flex items-center gap-1.5"
          :class="statusClass"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClass"/>
          {{ statusText }}
        </span>
      </div>

      <div v-if="runtime?.latency" class="flex items-center justify-between">
        <span class="text-text-muted">延迟</span>
        <span class="text-text">{{ runtime.latency }} ms</span>
      </div>

      <div v-if="status?.error" class="flex items-center justify-between">
        <span class="text-text-muted">错误</span>
        <span class="text-red-400 truncate max-w-xs">{{ status.error }}</span>
      </div>
    </div>

    <div>
      <button
        class="px-3 py-1.5 border border-border hover:border-border-light text-text text-xs rounded-lg transition-colors"
        :disabled="testing"
        @click="$emit('test')"
      >
        {{ testing ? '测试中...' : '测试连接' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { McpServerStatus, McpRuntimeState } from '../../../../../types/ipc'

const props = defineProps<{
  status: McpServerStatus
  runtime?: McpRuntimeState
  testing?: boolean
}>()

defineEmits<{
  test: []
}>()

const statusText = computed(() => {
  switch (props.status.status) {
    case 'connected': return '已连接'
    case 'disabled': return '已禁用'
    case 'testing': return '测试中...'
    case 'auth_required': return '需要认证'
    case 'auth_failed': return '认证失败'
    case 'failed': return '连接失败'
    default: return '未测试'
  }
})

const statusClass = computed(() => {
  switch (props.status.status) {
    case 'connected': return 'text-green-500'
    case 'disabled': return 'text-text-muted'
    case 'testing': return 'text-blue-500'
    case 'auth_required': case 'auth_failed': return 'text-yellow-500'
    case 'failed': return 'text-red-500'
    default: return 'text-text-muted'
  }
})

const statusDotClass = computed(() => {
  switch (props.status.status) {
    case 'connected': return 'bg-green-500'
    case 'disabled': return 'bg-text-muted'
    case 'testing': return 'bg-blue-500 animate-pulse'
    case 'auth_required': case 'auth_failed': return 'bg-yellow-500'
    case 'failed': return 'bg-red-500'
    default: return 'bg-text-muted'
  }
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>