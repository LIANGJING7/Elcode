<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div class="flex-shrink-0 mb-6">
      <h2 class="text-2xl font-bold text-text mb-2">MCP 服务器</h2>
      <p class="text-sm text-text-muted">管理 MCP 服务器配置，连接后可在聊天时使用工具。</p>
    </div>

    <!-- Two-column layout -->
    <div class="flex flex-1 min-h-0 gap-4">
      <!-- Left: Server list -->
      <McpServerList
        :servers="serverList"
        :selected-server="selectedServer || undefined"
        @select="handleSelect"
        @add="showAddDialog = true"
        @open-config="handleOpenConfig"
      />

      <!-- Right: Server detail -->
      <div class="flex-1 min-w-0 border border-border rounded-lg overflow-hidden flex flex-col">
        <!-- Empty state -->
        <div v-if="!selectedServer" class="flex-1 flex items-center justify-center text-text-muted text-sm">
          请从左侧选择一个服务器
        </div>

        <!-- Detail view -->
        <div v-else class="flex flex-col h-full">
          <!-- Detail header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
            <h3 class="text-lg font-semibold text-text">{{ selectedServer }}</h3>
            <div class="flex items-center gap-2">
              <span
                class="px-2.5 py-1 rounded-md text-xs font-medium"
                :class="selectedStatus?.status === 'connected'
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-text-muted/10 text-text-muted'"
              >
                {{ statusLabel }}
              </span>
              <button
                v-if="selectedStatus?.status !== 'connected'"
                class="px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors cursor-pointer"
                :disabled="connecting"
                @click="handleConnect(selectedServer)"
              >
                {{ connecting ? '连接中...' : '连接' }}
              </button>
              <button
                v-else
                class="px-3 py-1.5 text-xs border border-border hover:border-border-light text-text rounded-lg transition-colors cursor-pointer"
                :disabled="connecting"
                @click="handleDisconnect(selectedServer)"
              >
                {{ connecting ? '断开中...' : '断开' }}
              </button>
            </div>
          </div>

          <!-- Detail body -->
          <div class="flex-1 overflow-y-auto p-5 space-y-6">
            <!-- Connection Section -->
            <ConnectionSection
              :status="selectedStatus || { status: 'disabled' }"
              :testing="testing"
              @test="handleTestConnection"
            />

            <!-- Config Section (only for new/edit) -->
            <div v-if="editing" class="space-y-4 pt-4 border-t border-border">
              <BasicSection
                :config="editConfig"
                :is-new="false"
                @update="handleConfigUpdate"
              />

              <CommandConfig
                v-if="editConfig.type === 'local'"
                :config="editConfig"
                @update="handleConfigUpdate"
              />

              <HttpConfig
                v-if="editConfig.type === 'remote'"
                :config="editConfig"
                @update="handleConfigUpdate"
              />

              <div class="flex gap-2 pt-2">
                <button
                  class="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
                  @click="handleSave"
                >
                  保存
                </button>
                <button
                  class="px-4 py-2 border border-border hover:border-border-light text-text text-sm rounded-lg transition-colors"
                  @click="editing = false"
                >
                  取消
                </button>
              </div>
            </div>

            <!-- Read-only config display -->
            <div v-else class="space-y-4 pt-4 border-t border-border">
              <div>
                <label class="text-xs text-text-muted block mb-1.5">类型</label>
                <span class="text-sm text-text">{{ selectedStatus?.status === 'connected' ? '已连接' : '未连接' }}</span>
              </div>
              <div v-if="selectedStatus?.error">
                <label class="text-xs text-text-muted block mb-1.5">错误信息</label>
                <span class="text-sm text-red-400">{{ selectedStatus.error }}</span>
              </div>
            </div>
          </div>

          <!-- Detail footer -->
          <div class="flex items-center justify-between px-5 py-3 border-t border-border flex-shrink-0">
            <button
              class="px-3 py-1.5 text-xs text-text-muted hover:text-text rounded-lg transition-colors cursor-pointer"
              @click="editing = !editing"
            >
              {{ editing ? '取消编辑' : '编辑配置' }}
            </button>
            <button
              class="px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              @click="showDeleteConfirm = true"
            >
              删除服务器
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Server Dialog (inline) -->
    <div v-if="showAddDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-md p-5">
        <h3 class="text-sm font-medium text-text mb-4">添加 MCP 服务器</h3>
        <div class="space-y-4">
          <BasicSection
            :config="newConfig"
            :is-new="true"
            @update="handleNewConfigUpdate"
          />

          <CommandConfig
            v-if="newConfig.type === 'local'"
            :config="newConfig"
            @update="handleNewConfigUpdate"
          />

          <HttpConfig
            v-if="newConfig.type === 'remote'"
            :config="newConfig"
            @update="handleNewConfigUpdate"
          />

          <div class="flex gap-2 justify-end pt-2">
            <button
              class="px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer transition-all duration-fast"
              @click="showAddDialog = false"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-xs bg-accent hover:bg-accent-hover rounded text-white cursor-pointer transition-all duration-fast"
              :disabled="!canAdd"
              @click="handleAddServer"
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-sm p-5">
        <h3 class="text-sm font-medium text-text mb-2">确认删除</h3>
        <p class="text-xs text-text-muted mb-4">
          确定要删除 {{ selectedServer }} 吗？此操作不可撤销。
        </p>
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer transition-all duration-fast"
            @click="showDeleteConfirm = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 text-xs bg-red-500 hover:bg-red-400 rounded text-white cursor-pointer transition-all duration-fast"
            @click="handleConfirmDelete"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMcpStore } from '../../stores/mcp'
import { useWorkspaceStore } from '../../stores/workspace'
import McpServerList from './mcp/McpServerList.vue'
import BasicSection from './mcp/sections/BasicSection.vue'
import CommandConfig from './mcp/sections/CommandConfig.vue'
import HttpConfig from './mcp/sections/HttpConfig.vue'
import ConnectionSection from './mcp/sections/ConnectionSection.vue'
import { useMcpConnection } from '../../composables/mcp/useMcpConnection'
import type { McpConfig, McpServerStatus } from '../../../types/ipc'

const mcpStore = useMcpStore()
const workspaceStore = useWorkspaceStore()

const { servers, loading, error } = storeToRefs(mcpStore)
const { currentWorkspace } = storeToRefs(workspaceStore)

const directory = computed(() => currentWorkspace.value?.path)

const selectedServer = ref<string | null>(null)
const showAddDialog = ref(false)
const showDeleteConfirm = ref(false)
const editing = ref(false)
const connecting = ref(false)

// Server configurations from backend (real config, not just status)
const serverConfigs = ref<Record<string, McpConfig>>({})

// Edit config state
const editConfig = ref<McpConfig>({ name: '', type: 'local', enabled: true })

// New server config
const newConfig = ref<McpConfig>({ name: '', type: 'local', enabled: true })

// Convert store servers (MCPStatus) to McpServerStatus format
const convertedServers = computed<Record<string, McpServerStatus>>(() => {
  const result: Record<string, McpServerStatus> = {}
  console.log('[SettingsMcp] convertedServers computing from servers.value:', servers.value, 'keys:', Object.keys(servers.value))
  for (const [name, status] of Object.entries(servers.value)) {
    result[name] = {
      status: convertBackendStatus(status.status),
      error: status.error
    }
  }
  console.log('[SettingsMcp] convertedServers result:', result, 'keys:', Object.keys(result))
  return result
})

// Use converted servers for the list component
const serverList = computed(() => {
  const list = convertedServers.value
  console.log('[SettingsMcp] serverList computed:', list, 'keys:', Object.keys(list))
  return list
})

const selectedStatus = computed(() => {
  if (!selectedServer.value) return null
  return convertedServers.value[selectedServer.value] || null
})

const statusLabel = computed(() => {
  if (!selectedStatus.value) return '未知'
  switch (selectedStatus.value.status) {
    case 'connected': return '已连接'
    case 'disabled': return '已禁用'
    case 'failed': return '连接失败'
    case 'auth_required': return '需要认证'
    case 'auth_failed': return '认证失败'
    case 'testing': return '测试中'
    default: return '未知'
  }
})

// Connection testing composable
const { testing, testConnection, connect: doConnect, disconnect: doDisconnect } = useMcpConnection(
  selectedServer.value || '',
  directory.value || undefined
)

const canAdd = computed(() => {
  const errors = validateConfig(newConfig.value)
  return errors.length === 0
})

onMounted(async () => {
  console.log('[SettingsMcp] onMounted, directory:', directory.value)
  console.log('[SettingsMcp] currentWorkspace:', currentWorkspace.value)
  await mcpStore.loadStatus(directory.value)
  console.log('[SettingsMcp] status loaded, servers:', Object.keys(servers.value))
  await loadServerConfigs()
  console.log('[SettingsMcp] configs loaded, serverConfigs:', Object.keys(serverConfigs.value))
  if (Object.keys(servers.value).length > 0) {
    selectedServer.value = Object.keys(servers.value)[0]
    console.log('[SettingsMcp] auto-selected:', selectedServer.value)
  }
})

watch(directory, async (newDir, oldDir) => {
  console.log('[SettingsMcp] directory changed:', oldDir, '->', newDir)
  if (newDir && newDir !== oldDir) {
    await mcpStore.loadStatus(newDir)
    await loadServerConfigs()
  }
})

async function loadServerConfigs() {
  try {
    console.log('[SettingsMcp] loadServerConfigs: directory=', directory.value)
    const rawConfigs = await window.desktop.mcp.config(directory.value)
    console.log('[SettingsMcp] rawConfigs:', JSON.stringify(rawConfigs).slice(0, 500))
    const converted: Record<string, McpConfig> = {}
    for (const [name, cfg] of Object.entries(rawConfigs)) {
      converted[name] = convertBackendConfig(name, cfg as BackendMcpConfig)
    }
    serverConfigs.value = converted
    console.log('[SettingsMcp] converted configs:', Object.keys(converted))
  } catch (err) {
    console.error('[SettingsMcp] Failed to load configs:', err)
  }
}

watch(selectedServer, (name) => {
  if (name) {
    // Use real config from backend, or fall back to basic
    const realConfig = serverConfigs.value[name]
    if (realConfig) {
      editConfig.value = { ...realConfig }
    } else {
      editConfig.value = {
        name: name,
        type: 'local',
        enabled: convertedServers.value[name]?.status !== 'disabled'
      }
    }
  }
})

function handleSelect(name: string) {
  selectedServer.value = name
  editing.value = false
}

function handleOpenConfig() {
  // TODO: Open lcode.jsonc in external editor
  console.log('[SettingsMcp] Open config file')
}

function handleConfigUpdate(config: McpConfig) {
  editConfig.value = { ...config }
}

function handleNewConfigUpdate(config: McpConfig) {
  newConfig.value = { ...config }
}

async function handleConnect(name: string) {
  connecting.value = true
  try {
    await mcpStore.connect(name, directory.value)
    await loadServerConfigs()
  } finally {
    connecting.value = false
  }
}

async function handleDisconnect(name: string) {
  connecting.value = true
  try {
    await mcpStore.disconnect(name, directory.value)
    await loadServerConfigs()
  } finally {
    connecting.value = false
  }
}

async function handleTestConnection() {
  if (!selectedServer.value) return
  await testConnection()
}

async function handleAddServer() {
  const config = newConfig.value
  const errors = validateConfig(config)
  if (errors.length > 0) return

  const payload = {
    name: config.name,
    type: config.type,
    enabled: config.enabled ?? true,
    command: config.command ? [config.command, ...config.args || []] : undefined,
    url: config.url,
    environment: config.environment,
    timeout: config.timeout
  }

  await mcpStore.addServer(payload, directory.value)
  await loadServerConfigs()
  showAddDialog.value = false
  selectedServer.value = config.name
  // Reset new config
  newConfig.value = { name: '', type: 'local', enabled: true }
}

async function handleSave() {
  if (!selectedServer.value) return
  // Note: Backend doesn't support update yet, this is a placeholder
  // For now, we'd need to delete and re-add
  editing.value = false
}

function handleConfirmDelete() {
  // Note: Backend doesn't support delete yet via IPC
  // This is a placeholder for future implementation
  showDeleteConfirm.value = false
  console.log('[SettingsMcp] Delete server:', selectedServer.value)
}

function validateConfig(config: McpConfig): string[] {
  const errors: string[] = []
  if (!config.name?.trim()) {
    errors.push('名称不能为空')
  }
  if (config.type === 'local') {
    if (!config.command?.trim()) {
      errors.push('命令不能为空')
    }
  } else {
    if (!config.url?.trim()) {
      errors.push('URL 不能为空')
    }
    try {
      new URL(config.url!)
    } catch {
      errors.push('URL 格式无效')
    }
  }
  return errors
}

// Convert backend status to frontend status
function convertBackendStatus(status: string): McpServerStatus['status'] {
  switch (status) {
    case 'connected': return 'connected'
    case 'disabled': return 'disabled'
    case 'failed': return 'failed'
    case 'needs_auth': return 'auth_required'
    case 'needs_client_registration': return 'auth_required'
    default: return 'disabled'
  }
}

// Backend config shape (ConfigMCPV1.Info = Local | Remote)
interface BackendMcpConfig {
  type: 'local' | 'remote'
  command?: string[]
  url?: string
  enabled?: boolean
  environment?: Record<string, string>
  headers?: Record<string, string>
  oauth?: { clientId?: string; clientSecret?: string; scope?: string } | false
  timeout?: number
}

// Convert backend ConfigMCPV1.Info to frontend McpConfig
function convertBackendConfig(name: string, cfg: BackendMcpConfig): McpConfig {
  if (cfg.type === 'local') {
    const [command, ...args] = cfg.command || []
    return {
      name,
      type: 'local',
      enabled: cfg.enabled,
      command: command || '',
      args: args.length > 0 ? args : undefined,
      environment: cfg.environment,
      timeout: cfg.timeout
    }
  } else {
    return {
      name,
      type: 'remote',
      enabled: cfg.enabled,
      url: cfg.url || '',
      headers: cfg.headers,
      oauth: cfg.oauth,
      timeout: cfg.timeout
    }
  }
}
</script>