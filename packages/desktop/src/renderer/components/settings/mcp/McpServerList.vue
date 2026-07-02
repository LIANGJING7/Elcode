<template>
  <div class="w-64 flex-shrink-0 flex flex-col border border-border rounded-lg overflow-hidden">
    <div class="flex-1 overflow-y-auto p-2">
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
    </div>

    <div class="flex-shrink-0 border-t border-border p-2">
      <button
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-hover rounded-lg transition-colors duration-fast cursor-pointer"
        @click="$emit('add')"
      >
        <svg class="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>添加服务器</span>
      </button>
      <button
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover rounded-lg transition-colors duration-fast cursor-pointer"
        @click="$emit('open-config')"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>打开配置文件</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { McpServerStatus } from '../../../../types/ipc'
import McpServerItem from './McpServerItem.vue'

const props = defineProps<{
  servers: Record<string, McpServerStatus>
  selectedServer?: string
}>()

defineEmits<{
  select: [name: string]
  add: []
  'open-config': []
}>()

const serverNames = computed(() => Object.keys(props.servers).sort())
</script>