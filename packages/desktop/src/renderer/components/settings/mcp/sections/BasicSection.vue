<template>
  <div class="space-y-4">
    <h4 class="text-sm font-medium text-text">基本配置</h4>
    
    <div>
      <label class="text-xs text-text-muted block mb-1.5">名称</label>
      <input
        v-model="localConfig.name"
        type="text"
        class="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text outline-none focus:border-accent"
        placeholder="my-mcp-server"
        :disabled="!isNew"
      />
    </div>

    <div>
      <label class="text-xs text-text-muted block mb-2">传输类型</label>
      <div class="space-y-2">
        <button
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer"
          :class="localConfig.type === 'local' ? 'bg-accent/10 text-accent border border-accent' : 'text-text hover:bg-bg-hover border border-border'"
          @click="localConfig.type = 'local'"
        >
          <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center" :class="localConfig.type === 'local' ? 'border-accent' : 'border-text-muted'">
            <div v-if="localConfig.type === 'local'" class="w-2 h-2 rounded-full bg-accent"/>
          </div>
          <span>Command (stdio)</span>
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer"
          :class="localConfig.type === 'remote' ? 'bg-accent/10 text-accent border border-accent' : 'text-text hover:bg-bg-hover border border-border'"
          @click="localConfig.type = 'remote'"
        >
          <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center" :class="localConfig.type === 'remote' ? 'border-accent' : 'border-text-muted'">
            <div v-if="localConfig.type === 'remote'" class="w-2 h-2 rounded-full bg-accent"/>
          </div>
          <span>HTTP (StreamableHTTP)</span>
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <input
        v-model="localConfig.enabled"
        type="checkbox"
        class="w-4 h-4 rounded border-border accent-accent"
      />
      <label class="text-sm text-text">启用此 MCP 服务器</label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { McpConfig } from '../../../../../types/ipc'

const props = defineProps<{
  config: McpConfig
  isNew?: boolean
}>()

const emit = defineEmits<{
  update: [config: McpConfig]
}>()

const localConfig = reactive<McpConfig>({
  name: props.config.name,
  type: props.config.type || 'local',
  enabled: props.config.enabled ?? true
})

watch(localConfig, (value) => {
  emit('update', { ...props.config, ...value })
}, { deep: true })
</script>