<template>
  <div v-if="isOpen" class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="modal-content bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-lg p-4">
      <div class="modal-header flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-text">连接供应商</h3>
        <button
          class="close-btn w-6 h-6 flex items-center justify-center text-text-muted hover:text-text cursor-pointer rounded hover:bg-bg-hover"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>

      <div class="modal-body max-h-96 overflow-y-auto">
        <!-- Popular Providers -->
        <div class="section mb-4">
          <h4 class="text-xs text-text-muted mb-2 font-medium">热门供应商</h4>
          <div class="space-y-1">
            <button
              v-for="option in popularOptions"
              :key="option.id"
              class="provider-option w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors duration-fast cursor-pointer"
              :class="isSelected(option.id) ? 'bg-accent/10 text-accent' : 'text-text hover:bg-bg-hover'"
              :disabled="option.consoleManaged && !option.connected"
              @click="handleSelect(option)"
            >
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ option.name }}</span>
                  <span v-if="option.recommended" class="text-xs text-accent">(推荐)</span>
                </div>
                <span class="text-xs text-text-muted truncate">{{ option.description }}</span>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span v-if="option.consoleManaged" class="text-xs text-text-muted bg-bg-surface px-2 py-0.5 rounded">
                  {{ consoleState.activeOrgName || '企业托管' }}
                </span>
                <span v-if="option.connected" class="text-xs text-green-500">✓</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Other Providers -->
        <div class="section">
          <h4 class="text-xs text-text-muted mb-2 font-medium">其他供应商</h4>
          <div class="space-y-1">
            <button
              class="provider-option w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors duration-fast cursor-pointer"
              :class="showCustomInput ? 'bg-accent/10 text-accent' : 'text-text hover:bg-bg-hover'"
              @click="showCustomInput = true"
            >
              <div class="flex flex-col min-w-0">
                <span class="font-medium">自定义供应商</span>
                <span class="text-xs text-text-muted">手动输入供应商 ID</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Custom Provider Input -->
        <div v-if="showCustomInput" class="mt-4 p-3 bg-bg-surface rounded-lg border border-border">
          <label class="text-xs text-text-muted mb-1.5 block">供应商 ID</label>
          <input
            v-model="customProviderId"
            type="text"
            placeholder="例如: openai-compatible"
            class="w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
          />
          <p class="text-xs text-text-muted mt-2">
            此操作仅保存凭证。使用前请在 opencode.json 中配置该供应商。
          </p>
          <div class="flex gap-2 mt-3 justify-end">
            <button
              class="px-3 py-1.5 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer"
              @click="showCustomInput = false; customProviderId = ''"
            >
              取消
            </button>
            <button
              class="px-3 py-1.5 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer"
              :disabled="!isValidCustomId"
              @click="handleCustomSubmit"
            >
              继续
            </button>
          </div>
        </div>
      </div>

      <!-- Provider info hint -->
      <div v-if="selectedProvider" class="mt-4 p-3 bg-bg-surface rounded-lg border border-border">
        <div class="flex items-start gap-2">
          <svg class="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          <div class="text-xs text-text-muted">
            <p v-if="selectedProvider.consoleManaged">
              此供应商由 {{ consoleState.activeOrgName || '您的组织' }} 托管，无需额外配置。
            </p>
            <p v-else-if="selectedProvider.authType === 'oauth'">
              将通过 OAuth 授权连接此供应商。
            </p>
            <p v-else>
              需要输入 API Key 以连接此供应商。
              <a v-if="selectedProvider.keyUrl" :href="selectedProvider.keyUrl" class="text-accent hover:underline" target="_blank">
                获取 API Key →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AuthMethod, ConsoleState } from '../../stores/models'

interface ProviderOption {
  id: string
  name: string
  description: string
  recommended?: boolean
  connected?: boolean
  consoleManaged?: boolean
  authType?: 'oauth' | 'api'
  keyUrl?: string
}

const props = defineProps<{
  isOpen: boolean
  authMethods: Record<string, AuthMethod[]>
  consoleState: ConsoleState
  connected: string[]
}>()

const emit = defineEmits<{
  select: [providerId: string, authMethods: AuthMethod[]]
  custom: [providerId: string]
  close: []
}>()

// 供应商优先级排序（与 TUI 对齐）
const PROVIDER_PRIORITY: Record<string, number> = {
  opencode: 0,
  'opencode-go': 1,
  openai: 2,
  'github-copilot': 3,
  anthropic: 4,
  google: 5,
}

// 供应商描述和获取 Key 的 URL
const PROVIDER_INFO: Record<string, { description: string; keyUrl?: string }> = {
  opencode: {
    description: '单一 API Key 访问最佳编码模型，最低价格',
    keyUrl: 'https://opencode.ai/zen',
  },
  'opencode-go': {
    description: '$10/月订阅，可靠访问热门开源模型',
    keyUrl: 'https://opencode.ai/go',
  },
  openai: {
    description: 'ChatGPT Plus/Pro 或 API Key',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  'github-copilot': {
    description: 'OAuth 授权',
  },
  anthropic: {
    description: 'API Key',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  google: {
    description: 'API Key',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
}

const showCustomInput = ref(false)
const customProviderId = ref('')
const selectedProvider = ref<ProviderOption | null>(null)

const isValidCustomId = computed(() => {
  const id = customProviderId.value.trim()
  // 必须以小写字母或数字开头，只包含小写字母、数字、连线和下划线
  return /^[a-z0-9][a-z0-9-_]*$/.test(id)
})

const popularOptions = computed<ProviderOption[]>(() => {
  const consoleManagedSet = new Set(props.consoleState.consoleManagedProviders)
  const connectedSet = new Set(props.connected)

  // 获取所有有认证方法的供应商
  const providerIds = Object.keys(props.authMethods)

  // 按优先级排序
  const sorted = providerIds.sort((a, b) => {
    const pa = PROVIDER_PRIORITY[a] ?? 99
    const pb = PROVIDER_PRIORITY[b] ?? 99
    return pa - pb
  })

  return sorted.map(id => {
    const methods = props.authMethods[id] || []
    const primaryMethod = methods[0] || { type: 'api', label: 'API Key' }
    const info = PROVIDER_INFO[id] || { description: primaryMethod.label }

    return {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ').replace(/(?:^|\s)\S/g, l => l.toUpperCase()),
      description: info.description,
      recommended: id === 'opencode',
      connected: connectedSet.has(id),
      consoleManaged: consoleManagedSet.has(id),
      authType: primaryMethod.type,
      keyUrl: info.keyUrl,
    }
  })
})

function isSelected(id: string) {
  return selectedProvider.value?.id === id
}

function handleSelect(option: ProviderOption) {
  selectedProvider.value = option

  // 如果已经连接，不需要再认证，直接关闭
  if (option.connected) {
    emit('close')
    return
  }

  // 如果是 Console 托管的，直接返回成功（无需认证）
  if (option.consoleManaged) {
    const methods = props.authMethods[option.id] || []
    emit('select', option.id, methods.length > 0 ? methods : [{ type: 'api' as const, label: 'API Key' }])
    return
  }

  // 未连接的供应商：传递所有认证方法，让父组件决定是否需要选择
  const methods = props.authMethods[option.id] || []
  emit('select', option.id, methods.length > 0 ? methods : [{ type: 'api' as const, label: 'API Key' }])
}

function handleCustomSubmit() {
  if (!isValidCustomId.value) return
  emit('custom', customProviderId.value.trim())
  showCustomInput.value = false
  customProviderId.value = ''
}

watch(() => props.isOpen, (newVal) => {
  if (!newVal) {
    selectedProvider.value = null
    showCustomInput.value = false
    customProviderId.value = ''
  }
})
</script>

<style scoped>
.provider-option:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>