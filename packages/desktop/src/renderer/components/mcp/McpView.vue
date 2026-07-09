<template>
  <div class="mcp-view p-6">
    <div class="max-w-2xl mx-auto">
      <header class="mb-6">
        <h1 class="text-xl font-semibold text-text">MCP Servers</h1>
        <p class="text-2xs text-text-muted mt-1">
          Model Context Protocol server connections
        </p>
      </header>

      <div v-if="loading" class="text-text-muted text-center py-8">
        Loading MCP status...
      </div>

      <div v-else-if="error" class="text-red-400 text-center py-8">
        {{ error }}
      </div>

      <div v-else-if="serverNames.length === 0" class="text-text-muted text-center py-8">
        No MCP servers configured
      </div>

      <div v-else class="space-y-3">
        <McpCard
          v-for="name in serverNames"
          :key="name"
          :name="name"
          :status="servers[name]"
          @connect="handleConnect(name)"
          @disconnect="handleDisconnect(name)"
        />
      </div>

      <!-- Add MCP server -->
      <div class="mt-6 pt-6 border-t border-border">
        <button
          class="px-4 py-2 rounded-lg bg-bg-hover hover:bg-bg-elevated border border-border text-text text-sm font-medium transition-colors"
          @click="showAddDialog = true"
        >
          Add MCP Server
        </button>
      </div>

      <!-- Add MCP Dialog (simple inline form) -->
      <div v-if="showAddDialog" class="mt-4 p-4 rounded-lg bg-bg-surface border border-border">
        <h3 class="text-sm font-medium text-text mb-3">Add MCP Server</h3>
        <div class="space-y-3">
          <div>
            <label class="text-2xs text-text-muted block mb-1">Name</label>
            <input
              v-model="newServerName"
              type="text"
              class="w-full px-3 py-2 rounded-lg bg-bg-hover border border-border text-text text-sm outline-none focus:border-accent"
              placeholder="my-mcp-server"
            />
          </div>
          <div>
            <label class="text-2xs text-text-muted block mb-1">Type</label>
            <select
              v-model="newServer.type"
              class="w-full px-3 py-2 rounded-lg bg-bg-hover border border-border text-text text-sm outline-none focus:border-accent"
            >
              <option value="local">Local (stdio)</option>
              <option value="remote">Remote (HTTP)</option>
            </select>
          </div>
          <div v-if="newServer.type === 'local'">
            <label class="text-2xs text-text-muted block mb-1">Command</label>
            <input
              v-model="localCommand"
              type="text"
              class="w-full px-3 py-2 rounded-lg bg-bg-hover border border-border text-text text-sm outline-none focus:border-accent"
              placeholder="npx -y my-mcp-server"
            />
          </div>
          <div v-if="newServer.type === 'remote'">
            <label class="text-2xs text-text-muted block mb-1">URL</label>
            <input
              v-model="newServer.url"
              type="text"
              class="w-full px-3 py-2 rounded-lg bg-bg-hover border border-border text-text text-sm outline-none focus:border-accent"
              placeholder="https://api.example.com/mcp"
            />
          </div>
          <div class="flex gap-2">
            <button
              class="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
              :disabled="!canAdd"
              @click="handleAdd"
            >
              Add
            </button>
            <button
              class="px-3 py-1.5 rounded-lg bg-bg-hover hover:bg-bg-elevated border border-border text-text text-sm transition-colors"
              @click="showAddDialog = false"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMcpStore } from '../../stores/mcp'
import McpCard from './McpCard.vue'
import type { McpServerConfig } from '../../../types/ipc'

const mcpStore = useMcpStore()

const { servers, loading, error } = storeToRefs(mcpStore)

const serverNames = computed(() => Object.keys(servers.value).sort())

const showAddDialog = ref(false)
const newServer = ref<McpServerConfig>({
  type: 'local',
  enabled: true,
  command: [],
  url: ''
})
const newServerName = ref('')
const localCommand = ref('')

const canAdd = computed(() => {
  if (!newServerName.value.trim()) return false
  if (newServer.value.type === 'local' && !localCommand.value.trim()) return false
  if (newServer.value.type === 'remote' && !newServer.value.url?.trim()) return false
  return true
})

async function handleConnect(name: string) {
  await mcpStore.connect(name)
}

async function handleDisconnect(name: string) {
  await mcpStore.disconnect(name)
}

async function handleAdd() {
  const config: McpServerConfig = {
    type: newServer.value.type,
    enabled: true
  }

  if (config.type === 'local') {
    config.command = localCommand.value.trim().split(' ')
  } else {
    config.url = newServer.value.url?.trim() || ''
  }

  const result = await window.desktop.lcode.mcpServer.add(newServerName.value.trim(), config)
  if (result.success) {
    await mcpStore.loadStatusImmediate()
    showAddDialog.value = false
    newServerName.value = ''
    newServer.value = { type: 'local', enabled: true, command: [], url: '' }
    localCommand.value = ''
  }
}
</script>

<style scoped>
.mcp-view {
  min-height: 100%;
}
</style>