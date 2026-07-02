<template>
  <div class="w-64 flex-shrink-0 flex flex-col border border-border rounded-lg overflow-hidden">
    <div class="flex-1 overflow-y-auto p-2">
      <div v-if="loading" class="flex flex-col items-center justify-center py-8 gap-3">
        <div class="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full"></div>
        <span class="text-xs text-text-muted">正在加载 MCP 服务器...</span>
      </div>
      <template v-else>
        <McpServerItem
          v-for="name in serverNames"
          :key="name"
          :name="name"
          :status="servers[name]"
          :selected-server="selectedServer"
          @select="$emit('select', $event)"
        />

        <div v-if="serverNames.length === 0" class="text-center py-8 text-xs text-text-muted">
          暂无MCP服务器
          <br />
          点击"添加服务器"添加
        </div>
      </template>
    </div>

    <div class="flex-shrink-0 border-t border-border p-2">
      <button
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-hover rounded-lg transition-colors duration-fast cursor-pointer"
        @click="$emit('add')"
      >
        <svg class="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>添加服务器</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { McpServerStatus } from '../../../../types/ipc'
import McpServerItem from './McpServerItem.vue'

const props = defineProps<{
  servers: Record<string, McpServerStatus>
  selectedServer?: string
  loading?: boolean
}>()

defineEmits<{
  select: [name: string]
  add: []
}>()

watch(() => props.servers, (servers) => {
  console.log('[McpServerList] props.servers updated:', servers, 'keys:', Object.keys(servers))
}, { immediate: true })

const serverNames = computed(() => {
  const names = Object.keys(props.servers).sort()
  console.log('[McpServerList] serverNames computed:', names)
  return names
})
</script>