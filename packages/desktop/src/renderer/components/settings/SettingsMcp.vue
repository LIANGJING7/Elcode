<template>
  <div class="settings-section">
    <h2 class="text-lg font-medium text-text mb-4">MCP Servers</h2>

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
            v-model="newServer.name"
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
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMcpStore } from '../../stores/mcp'
import { useWorkspaceStore } from '../../stores/workspace'
import McpCard from '../mcp/McpCard.vue'
import type { MCPAddPayload } from '../../../types/ipc'

const mcpStore = useMcpStore()
const workspaceStore = useWorkspaceStore()

const { servers, loading, error } = storeToRefs(mcpStore)
const { currentWorkspace } = storeToRefs(workspaceStore)

const serverNames = computed(() => Object.keys(servers.value).sort())

const showAddDialog = ref(false)
const newServer = ref<MCPAddPayload>({
  name: '',
  type: 'local',
  command: [],
  url: ''
})
const localCommand = ref('')

const canAdd = computed(() => {
  if (!newServer.value.name.trim()) return false
  if (newServer.value.type === 'local' && !localCommand.value.trim()) return false
  if (newServer.value.type === 'remote' && !newServer.value.url?.trim()) return false
  return true
})

onMounted(() => {
  mcpStore.loadStatus(currentWorkspace.value?.path)
})

async function handleConnect(name: string) {
  await mcpStore.connect(name, currentWorkspace.value?.path)
}

async function handleDisconnect(name: string) {
  await mcpStore.disconnect(name, currentWorkspace.value?.path)
}

async function handleAdd() {
  const payload: MCPAddPayload = {
    name: newServer.value.name.trim(),
    type: newServer.value.type,
    enabled: true
  }

  if (payload.type === 'local') {
    payload.command = localCommand.value.trim().split(' ')
  } else {
    payload.url = newServer.value.url?.trim() || ''
  }

  await mcpStore.addServer(payload, currentWorkspace.value?.path)
  showAddDialog.value = false
  newServer.value = { name: '', type: 'local', command: [], url: '' }
  localCommand.value = ''
}
</script>

<style scoped>
.settings-section {
  /* Section styling */
}
</style>