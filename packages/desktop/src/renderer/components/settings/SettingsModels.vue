<template>
  <div class="flex h-full flex-col p-5">
    <!-- Header -->
    <div class="flex-shrink-0 mb-6">
      <h2 class="text-2xl font-bold text-text mb-2">模型设置</h2>
      <p class="text-sm text-text-muted">管理自定义模型供应商，配置后可在聊天时选择使用。</p>
    </div>

    <!-- Two-column layout -->
    <div class="flex flex-1 min-h-0 gap-4">
      <!-- Left: Provider list -->
      <div class="w-64 flex-shrink-0 flex flex-col border border-border rounded-lg overflow-hidden">
        <!-- Provider list -->
        <div class="flex-1 overflow-y-auto p-2">
          <button
            v-for="provider in providers"
            :key="provider.id"
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors duration-fast cursor-pointer"
            :class="selectedProviderId === provider.id
              ? 'bg-accent/10 text-accent'
              : 'text-text hover:bg-bg-hover'"
            @click="selectProvider(provider.id)"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-5 h-5 rounded bg-bg-surface flex items-center justify-center flex-shrink-0">
                <svg class="w-3.5 h-3.5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              </div>
              <span class="truncate">{{ provider.name }}</span>
            </div>
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :class="provider.models && Object.keys(provider.models).length > 0
                ? 'bg-green-500'
                : 'bg-text-muted/40'"
            />
          </button>

          <div v-if="providers.length === 0" class="text-center py-8 text-xs text-text-muted">
            暂无供应商
          </div>
        </div>

        <!-- Add provider button -->
        <div class="flex-shrink-0 border-t border-border p-2">
          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg-hover rounded-lg transition-colors duration-fast cursor-pointer"
            @click="showConnectDialog = true"
          >
            <svg class="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>连接供应商</span>
          </button>
        </div>
      </div>

      <!-- Right: Provider detail -->
      <div class="flex-1 min-w-0 border border-border rounded-lg overflow-hidden flex flex-col">
        <!-- Empty state -->
        <div v-if="!selectedProvider" class="flex-1 flex items-center justify-center text-text-muted text-sm">
          请从左侧选择一个供应商
        </div>

        <!-- Detail view -->
        <div v-else class="flex flex-col h-full">
          <!-- Detail header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
            <div class="flex items-center gap-3">
              <h3 class="text-lg font-semibold text-text">{{ selectedProvider.name }}</h3>
              <button
                class="w-7 h-7 flex items-center justify-center rounded hover:bg-bg-hover text-text-muted transition-colors cursor-pointer"
                title="编辑供应商"
                @click="handleEdit(selectedProvider.id)"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="px-2.5 py-1 rounded-md text-xs font-medium"
                :class="selectedProvider.models && Object.keys(selectedProvider.models).length > 0
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-text-muted/10 text-text-muted'"
              >
                {{ selectedProvider.models && Object.keys(selectedProvider.models).length > 0 ? '已启用' : '未启用' }}
              </span>
              <button
                class="w-7 h-7 flex items-center justify-center rounded hover:bg-bg-hover text-text-muted transition-colors cursor-pointer"
                title="刷新模型列表"
                :disabled="refreshingProviders.has(selectedProvider.id)"
                @click="handleRefreshModels(selectedProvider.id)"
              >
                <svg
                  class="w-4 h-4"
                  :class="{ 'animate-spin': refreshingProviders.has(selectedProvider.id) }"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Detail body -->
          <div class="flex-1 overflow-y-auto p-5 space-y-5">
            <!-- Base URL -->
            <div>
              <label class="text-xs text-text-muted block mb-1.5">Base URL</label>
              <input
                :value="selectedProvider.baseUrl || ''"
                type="text"
                readonly
                class="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text cursor-default"
                placeholder="https://api.example.com/v1"
              />
            </div>

            <!-- API Key -->
            <div>
              <label class="text-xs text-text-muted block mb-1.5">API Key</label>
              <div class="flex items-center gap-2">
                <input
                  :value="showApiKey ? (selectedProvider.apiKey || '') : '••••••••••••••••••••'"
                  type="text"
                  readonly
                  class="flex-1 px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text cursor-default"
                />
                <button
                  class="px-2.5 py-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:border-border-light transition-colors cursor-pointer text-xs"
                  @click="showApiKey = !showApiKey"
                >
                  {{ showApiKey ? '隐藏' : '显示' }}
                </button>
              </div>
            </div>

            <!-- Models list -->
            <div>
              <label class="text-xs text-text-muted block mb-2">模型列表</label>
              <div
                v-if="modelEntries.length > 0"
                class="border border-border rounded-lg divide-y divide-border"
              >
                <div
                  v-for="model in modelEntries"
                  :key="model.id"
                  class="flex items-center justify-between px-3 py-2.5"
                >
<span class="text-sm text-text font-mono">{{ model.name }}</span>
                   <div class="flex items-center gap-1.5">
                     <button
                       class="w-7 h-7 flex items-center justify-center rounded hover:bg-bg-hover text-text-muted transition-colors cursor-pointer"
                       title="编辑模型"
                       @click="handleEditModel(model.id)"
                     >
                       <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                         <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                         <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                       </svg>
                     </button>
                     <button
                       class="w-7 h-7 flex items-center justify-center rounded hover:bg-bg-hover text-text-muted transition-colors cursor-pointer"
                       title="删除模型"
                       @click="handleDeleteModel(model.id)"
                     >
                       <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                         <polyline points="3 6 5 6 21 6"/>
                         <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                       </svg>
                     </button>
                   </div>
                </div>
              </div>
              <div v-else class="text-xs text-text-muted py-4 text-center border border-border rounded-lg">
                暂无模型，请刷新模型列表
              </div>

              <!-- Add Model Button -->
              <div class="mt-3">
                <button
                  class="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-text-muted hover:text-text hover:bg-bg-hover rounded-lg border border-dashed border-border hover:border-solid transition-colors cursor-pointer"
                  @click="showAddModelModal = true"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span>添加模型</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Detail footer -->
          <div class="flex items-center justify-between px-5 py-3 border-t border-border flex-shrink-0">
            <button
              class="px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              @click="handleDelete(selectedProvider.id)"
            >
              删除供应商
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Provider Modal -->
    <AddProviderModal
      :is-open="showAddModal"
      :saving="saving"
      :existing-providers="existingProviderNames"
      @save="handleAddProvider"
      @cancel="showAddModal = false"
    />

    <!-- Edit Provider Modal -->
    <EditProviderModal
      :is-open="showEditModal"
      :provider="editingProvider"
      :saving="saving"
      @save="handleUpdateProvider"
      @cancel="showEditModal = false"
    />

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-sm p-5">
        <h3 class="text-sm font-medium text-text mb-2">确认删除</h3>
        <p class="text-xs text-text-muted mb-4">
          确定要删除 {{ deletingProviderName }} 吗？此操作不可撤销。
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
            :disabled="deleting"
            @click="confirmDelete"
          >
            {{ deleting ? '删除中...' : '删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Model Confirmation Dialog -->
    <div v-if="showDeleteModelConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-sm p-5">
        <h3 class="text-sm font-medium text-text mb-2">确认删除模型</h3>
        <p class="text-xs text-text-muted mb-4">
          确定要从 {{ selectedProvider?.name }} 中删除模型 {{ deletingModelName }} 吗？
        </p>
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer transition-all duration-fast"
            @click="showDeleteModelConfirm = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 text-xs bg-red-500 hover:bg-red-400 rounded text-white cursor-pointer transition-all duration-fast"
            @click="confirmDeleteModel"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- Connect Provider Dialog -->
    <ConnectProviderDialog
      :is-open="showConnectDialog"
      :auth-methods="modelsStore.authMethods"
      :console-state="modelsStore.consoleState"
      :connected="modelsStore.connectedProviders"
      @select="handleProviderSelect"
      @custom="handleCustomProvider"
      @close="showConnectDialog = false"
    />

    <!-- Auth Method Selection Dialog (like TUI) -->
    <div v-if="showMethodSelect" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-sm p-4">
        <h3 class="text-sm font-medium text-text mb-3">选择认证方式</h3>
        <div class="space-y-1">
          <button
            v-for="(method, index) in pendingAuthMethods"
            :key="index"
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors cursor-pointer text-text hover:bg-bg-hover"
            @click="handleMethodSelect(index)"
          >
            <span>{{ method.label }}</span>
            <span class="text-xs text-text-muted">{{ method.type === 'oauth' ? 'OAuth' : 'API Key' }}</span>
          </button>
        </div>
        <div class="flex justify-end mt-3">
          <button
            class="px-3 py-1.5 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer"
            @click="showMethodSelect = false"
          >
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- Provider Auth Dialog -->
    <ProviderAuthDialog
      :is-open="showAuthDialog"
      :provider-id="selectedProviderId"
      :auth-method="selectedAuthMethod"
      :directory="directory"
      @success="handleAuthSuccess"
      @oauth-start="handleOAuthStart"
      @close="showAuthDialog = false"
    />

    <!-- OAuth Waiting Dialog -->
    <OAuthWaitingDialog
      :is-open="showOAuthWaiting"
      :provider-id="selectedProviderId"
      :method-index="0"
      :authorization="authorizationResult"
      :directory="directory"
      @success="handleOAuthSuccess"
      @close="showOAuthWaiting = false"
    />

    <!-- Model Select Dialog -->
    <ModelSelectDialog
      :is-open="showModelSelect"
      :provider-id="selectedProviderId"
      :directory="directory"
      @select="handleModelSelect"
      @close="showModelSelect = false"
    />

    <!-- Add Model Modal -->
    <AddModelModal
      :is-open="showAddModelModal"
      :provider-id="selectedProviderId"
      :provider-name="selectedProvider?.name"
      :directory="directory"
      :edit-model="editingModel"
      @success="handleAddModelSuccess"
      @close="handleCloseAddModelModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWorkspaceStore } from '../../stores/workspace'
import { useModelsStore, type ProviderInfo, type ProviderModel, type AuthMethod } from '../../stores/models'
import ConnectProviderDialog from './ConnectProviderDialog.vue'
import ProviderAuthDialog from './ProviderAuthDialog.vue'
import OAuthWaitingDialog from './OAuthWaitingDialog.vue'
import ModelSelectDialog from './ModelSelectDialog.vue'
import AddProviderModal from './AddProviderModal.vue'
import EditProviderModal from './EditProviderModal.vue'
import AddModelModal from './AddModelModal.vue'
import type { AuthorizationResult } from '../../types/ipc'

const workspaceStore = useWorkspaceStore()
const modelsStore = useModelsStore()

const directory = computed(() => workspaceStore.currentWorkspace?.path)

const providers = computed(() => modelsStore.providers)
const saving = computed(() => modelsStore.saving)
const deleting = computed(() => modelsStore.deleting)

const testingProviders = ref(new Set<string>())
const refreshingProviders = ref(new Set<string>())

const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const showDeleteModelConfirm = ref(false)
const editingProvider = ref<ProviderInfo | undefined>(undefined)
const deletingProviderId = ref<string | null>(null)
const deletingProviderName = ref<string>('')
const deletingModelId = ref<string>('')
const deletingModelName = ref<string>('')

// 新增：供应商连接流程状态
const showConnectDialog = ref(false)
const showAuthDialog = ref(false)
const showOAuthWaiting = ref(false)
const showModelSelect = ref(false)
const showAddModelModal = ref(false)
const editingModel = ref<{ modelId: string; model: ProviderModel } | undefined>(undefined)
const selectedProviderId = ref<string>('')
const selectedAuthMethod = ref<AuthMethod | undefined>(undefined)
const oauthInputs = ref<Record<string, string>>({})
const authorizationResult = ref<AuthorizationResult | undefined>(undefined)
const showApiKey = ref(false)

const selectedProvider = computed(() =>
  providers.value.find(p => p.id === selectedProviderId.value) || null
)

const modelEntries = computed(() => {
  if (!selectedProvider.value) return []
  return Object.entries(selectedProvider.value.models || {}).map(([id, model]) => ({
    id,
    name: model.name || id
  }))
})

const existingProviderNames = computed(() =>
  providers.value.map(p => p.name)
)

onMounted(async () => {
  console.log('[SettingsModels] onMounted, directory:', directory.value)
  try {
    await modelsStore.loadModels(directory.value)
    console.log('[SettingsModels] loadModels 完成, providers:', providers.value)
    console.log('[SettingsModels] providers.value.length:', providers.value.length)
    if (providers.value.length > 0) {
      selectedProviderId.value = providers.value[0].id
      console.log('[SettingsModels] 设置 selectedProviderId:', selectedProviderId.value)
    }
  } catch (err) {
    console.error('[SettingsModels] Failed to load models:', err)
  }
})

function selectProvider(id: string) {
  selectedProviderId.value = id
  showApiKey.value = false
}

async function handleAddProvider(config: { name: string; apiKey: string; baseUrl?: string }) {
  const result = await modelsStore.addProvider(config, directory.value)
  if (result.success) {
    showAddModal.value = false
    // Auto-select the new provider
    const newProvider = providers.value[providers.value.length - 1]
    if (newProvider) {
      selectedProviderId.value = newProvider.id
    }
  }
}

// 新增：供应商连接流程处理方法
// 当有多个认证方法时，先弹出选择对话框
const showMethodSelect = ref(false)
const pendingAuthMethods = ref<AuthMethod[]>([])

function handleProviderSelect(providerId: string, authMethods: AuthMethod[]) {
  showConnectDialog.value = false
  selectedProviderId.value = providerId

  // 如果是 Console 托管供应商，直接跳到模型选择
  if (modelsStore.consoleState.consoleManagedProviders.includes(providerId)) {
    showModelSelect.value = true
    return
  }

  // 只有一个方法时直接继续，多个方法时先让用户选择
  if (authMethods.length === 1) {
    proceedWithAuthMethod(providerId, authMethods[0], 0)
  } else {
    pendingAuthMethods.value = authMethods
    showMethodSelect.value = true
  }
}

function proceedWithAuthMethod(providerId: string, authMethod: AuthMethod, methodIndex: number) {
  selectedAuthMethod.value = authMethod

  // OAuth 类型：如果有 prompts，先处理 prompts
  if (authMethod.type === 'oauth' && authMethod.prompts?.length) {
    showAuthDialog.value = true
  } else if (authMethod.type === 'oauth') {
    // OAuth 无 prompts，直接开始授权
    startOAuth(providerId, methodIndex, {})
  } else {
    // API 类型：显示 API Key 输入
    showAuthDialog.value = true
  }
}

function handleMethodSelect(methodIndex: number) {
  showMethodSelect.value = false
  if (methodIndex >= 0 && methodIndex < pendingAuthMethods.value.length) {
    proceedWithAuthMethod(selectedProviderId.value, pendingAuthMethods.value[methodIndex], methodIndex)
  }
}

function handleCustomProvider(providerId: string) {
  showConnectDialog.value = false
  selectedProviderId.value = providerId
  selectedAuthMethod.value = { type: 'api', label: 'API Key' }
  showAuthDialog.value = true
}

async function startOAuth(providerId: string, methodIndex: number, inputs: Record<string, string>) {
  showAuthDialog.value = false
  try {
    const result = await window.desktop.provider.authorize(providerId, methodIndex, inputs, directory.value)
    authorizationResult.value = result
    oauthInputs.value = inputs
    showOAuthWaiting.value = true
  } catch (e) {
    console.error('OAuth authorize failed:', e)
    // 可以显示 toast 提示
  }
}

function handleOAuthStart(providerId: string, methodIndex: number, inputs: Record<string, string>) {
  startOAuth(providerId, methodIndex, inputs)
}

async function handleAuthSuccess(providerId: string) {
  showAuthDialog.value = false
  // 刷新供应商列表
  await modelsStore.loadModels(directory.value)
  // 显示模型选择
  showModelSelect.value = true
}

async function handleOAuthSuccess(providerId: string) {
  showOAuthWaiting.value = false
  // 刷新供应商列表
  await modelsStore.loadModels(directory.value)
  // 显示模型选择
  showModelSelect.value = true
}

function handleModelSelect(providerId: string, modelId: string) {
  showModelSelect.value = false
  modelsStore.setSelectedModel(modelId)
  // 刷新模型列表以更新 UI
  const provider = providers.value.find(p => p.id === providerId)
  if (provider) {
    selectedProviderId.value = provider.id
  }
}

async function handleAddModelSuccess(providerId: string, modelId: string) {
  console.log('[handleAddModelSuccess] called with', providerId, modelId)
  showAddModelModal.value = false
  editingModel.value = undefined
  console.log('[handleAddModelSuccess] calling loadModels')
  await modelsStore.loadModels(directory.value)
  console.log('[handleAddModelSuccess] loadModels completed')
}

function handleCloseAddModelModal() {
  showAddModelModal.value = false
  editingModel.value = undefined
}

function handleEdit(providerId: string) {
  const provider = providers.value.find(p => p.id === providerId)
  if (provider) {
    editingProvider.value = provider
    showEditModal.value = true
  }
}

async function handleUpdateProvider(providerId: string, config: { apiKey?: string; baseUrl?: string }) {
  const result = await modelsStore.updateProvider(providerId, config, directory.value)
  if (result.success) {
    showEditModal.value = false
    editingProvider.value = undefined
  }
}

async function handleTest(providerId: string) {
  testingProviders.value.add(providerId)
  const result = await modelsStore.testProvider(providerId, directory.value)
  testingProviders.value.delete(providerId)

  if (result.success) {
    console.log(`Test successful: ${result.modelCount} models found`)
  } else {
    console.error(`Test failed: ${result.error}`)
  }
}

async function handleRefreshModels(providerId: string) {
  refreshingProviders.value.add(providerId)
  const result = await modelsStore.refreshModels(providerId, directory.value)
  refreshingProviders.value.delete(providerId)

  if (result.success && result.changed) {
    console.log('Models updated')
  }
}

function handleDelete(providerId: string) {
  const provider = providers.value.find(p => p.id === providerId)
  if (provider) {
    deletingProviderId.value = providerId
    deletingProviderName.value = provider.name
    showDeleteConfirm.value = true
  }
}

async function confirmDelete() {
  if (!deletingProviderId.value) return

  const result = await modelsStore.deleteProvider(deletingProviderId.value, directory.value)
  if (result.success) {
    showDeleteConfirm.value = false
    deletingProviderId.value = null
    deletingProviderName.value = ''
    // Select another provider or clear
    if (providers.value.length > 0) {
      selectedProviderId.value = providers.value[0].id
    } else {
      selectedProviderId.value = null
    }
  }
}

function handleDeleteModel(modelId: string) {
  const model = modelEntries.value.find(m => m.id === modelId)
  if (model) {
    deletingModelId.value = modelId
    deletingModelName.value = model.name
    showDeleteModelConfirm.value = true
  }
}

function handleEditModel(modelId: string) {
  if (!selectedProvider.value) return
  const model = selectedProvider.value.models[modelId]
  console.log('[SettingsModels] handleEditModel:', modelId, 'model:', JSON.stringify(model))
  if (model) {
    editingModel.value = { modelId, model }
    showAddModelModal.value = true
  }
}

async function confirmDeleteModel() {
  if (!selectedProvider.value || !deletingModelId.value) return

  const result = await modelsStore.deleteModel(selectedProvider.value.id, deletingModelId.value, directory.value)

  if (result.success) {
    showDeleteModelConfirm.value = false
    deletingModelId.value = ''
    deletingModelName.value = ''
  } else {
    console.error('Delete model failed:', result.error)
  }
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
