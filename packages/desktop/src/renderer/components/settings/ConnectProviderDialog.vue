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
        <!-- Custom Provider Input -->
        <div class="p-3 bg-bg-surface rounded-lg border border-border">
          <div class="space-y-3">
            <div>
              <label class="text-xs text-text-muted mb-1.5 block">Provider ID *</label>
              <input
                v-model="customForm.providerId"
                type="text"
                placeholder="e.g. deepseek-custom"
                class="w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
                :class="providerIdError || providerIdExists ? 'border-red-500' : ''"
              />
              <p v-if="providerIdError" class="text-xs text-red-500 mt-1">{{ providerIdError }}</p>
              <p v-if="providerIdExists" class="text-xs text-red-500 mt-1">Provider '{{ customForm.providerId }}' already exists</p>
            </div>

            <div>
              <label class="text-xs text-text-muted mb-1.5 block">Display Name</label>
              <input
                v-model="customForm.displayName"
                type="text"
                placeholder="Auto-generated from Provider ID if empty"
                class="w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
              />
            </div>

            <div>
              <label class="text-xs text-text-muted mb-1.5 block">Provider Type *</label>
              <select
                v-model="customForm.providerType"
                class="w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none cursor-pointer"
              >
                <option value="openai-compatible">OpenAI Compatible (Recommended)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>

            <div>
              <label class="text-xs text-text-muted mb-1.5 block">Base URL *</label>
              <input
                v-model="customForm.baseUrl"
                type="text"
                placeholder="e.g. https://api.deepseek.com/v1"
                class="w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
                :class="baseUrlError ? 'border-red-500' : ''"
              />
              <p v-if="baseUrlError" class="text-xs text-red-500 mt-1">{{ baseUrlError }}</p>
            </div>

            <div>
              <label class="text-xs text-text-muted mb-1.5 block">Authentication *</label>
              <div class="flex gap-2 mb-2">
                <button
                  class="px-3 py-1.5 text-xs rounded cursor-pointer"
                  :class="customForm.authType === 'apiKey' ? 'bg-accent text-white' : 'bg-bg border border-border text-text hover:bg-bg-hover'"
                  @click="customForm.authType = 'apiKey'"
                >
                  API Key
                </button>
                <button
                  class="px-3 py-1.5 text-xs rounded cursor-pointer"
                  :class="customForm.authType === 'envVar' ? 'bg-accent text-white' : 'bg-bg border border-border text-text hover:bg-bg-hover'"
                  @click="customForm.authType = 'envVar'"
                >
                  Environment Variable
                </button>
              </div>
              
              <div v-if="customForm.authType === 'apiKey'" class="relative">
                <input
                  v-model="customForm.authValue"
                  :type="showApiKey ? 'text' : 'password'"
                  placeholder="Enter API Key"
                  class="w-full px-3 py-2 pr-10 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
                />
                <button
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
                  @click="showApiKey = !showApiKey"
                >
                  {{ showApiKey ? '\u{1F648}' : '\u{1F441}\uFE0F' }}
                </button>
              </div>
              
              <div v-if="customForm.authType === 'envVar'">
                <input
                  v-model="customForm.authValue"
                  type="text"
                  placeholder="e.g. DEEPSEEK_API_KEY"
                  class="w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
                />
                <p class="text-xs text-text-muted mt-1">Will be referenced as {env:VAR_NAME} in config</p>
              </div>
            </div>

            <div>
              <button
                class="flex items-center gap-2 text-xs text-text-muted hover:text-text cursor-pointer"
                @click="customForm.showHeaders = !customForm.showHeaders"
              >
                <span>{{ customForm.showHeaders ? '\u25BC' : '\u25B6' }}</span>
                <span>Custom Headers (Optional)</span>
              </button>
              
              <div v-if="customForm.showHeaders" class="mt-2 space-y-2">
                <div 
                  v-for="(header, index) in customForm.headers" 
                  :key="index"
                  class="flex gap-2"
                >
                  <input
                    v-model="header.key"
                    type="text"
                    placeholder="Header Name"
                    class="flex-1 px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
                  />
                  <input
                    v-model="header.value"
                    type="text"
                    placeholder="Header Value"
                    class="flex-1 px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
                  />
                  <button
                    class="px-2 py-2 text-text-muted hover:text-red-500 cursor-pointer"
                    @click="customForm.headers.splice(index, 1)"
                  >
                    &times;
                  </button>
                </div>
                
                <button
                  class="px-3 py-1.5 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer"
                  @click="customForm.headers.push({ key: '', value: '' })"
                >
                  + Add Header
                </button>
              </div>
            </div>
          </div>

          <div class="flex gap-2 mt-4 justify-end">
            <button
              class="px-3 py-1.5 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer"
              @click="resetCustomForm"
            >
              Cancel
            </button>
            <button
              class="px-3 py-1.5 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer"
              :disabled="!isCustomFormValid"
              @click="handleCustomSubmit"
            >
              Save Provider
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ConsoleState } from '../../stores/models'
import type { CustomProviderConfig, ProviderType } from '../../../types/custom-provider'
import { validateProviderId, validateBaseUrl } from '../../../types/custom-provider'

const props = defineProps<{
  isOpen: boolean
  authMethods: Record<string, any[]>
  consoleState: ConsoleState
  connected: string[]
}>()

const emit = defineEmits<{
  select: [providerId: string, authMethods: any[]]
  customSubmit: [config: CustomProviderConfig]
  close: []
}>()

const customForm = ref<{
  providerId: string
  displayName: string
  providerType: ProviderType
  baseUrl: string
  authType: 'apiKey' | 'envVar'
  authValue: string
  headers: Array<{ key: string; value: string }>
  showHeaders: boolean
}>({
  providerId: '',
  displayName: '',
  providerType: 'openai-compatible',
  baseUrl: '',
  authType: 'apiKey',
  authValue: '',
  headers: [],
  showHeaders: false
})

const providerIdError = ref<string>('')
const baseUrlError = ref<string>('')
const providerIdExists = ref<boolean>(false)
const showApiKey = ref<boolean>(false)

const existingProviderIds = computed(() => {
  return Object.keys(props.authMethods || {})
})

const isCustomFormValid = computed(() => {
  const idValid = validateProviderId(customForm.value.providerId)
  const urlValid = validateBaseUrl(customForm.value.baseUrl)
  
  return idValid.valid && 
         urlValid.valid && 
         customForm.value.authValue.trim() !== '' &&
         !providerIdExists.value
})

watch(() => customForm.value.providerId, (newId) => {
  const result = validateProviderId(newId)
  providerIdError.value = result.valid ? '' : (result.error || '')
  
  providerIdExists.value = existingProviderIds.value.includes(newId)
})

watch(() => customForm.value.baseUrl, (newUrl) => {
  const result = validateBaseUrl(newUrl)
  baseUrlError.value = result.valid ? '' : (result.error || '')
})

const handleCustomSubmit = () => {
  const cleanHeaders = customForm.value.headers
    .filter(h => h.key.trim() && h.value.trim())
    .reduce((acc, h) => {
      acc[h.key] = h.value
      return acc
    }, {} as Record<string, string>)
  
  const config: CustomProviderConfig = {
    providerId: customForm.value.providerId,
    displayName: customForm.value.displayName || undefined,
    providerType: customForm.value.providerType,
    baseUrl: customForm.value.baseUrl,
    authType: customForm.value.authType,
    authValue: customForm.value.authValue,
    headers: Object.keys(cleanHeaders).length > 0 ? cleanHeaders : undefined
  }
  
  emit('customSubmit', config)
}

const resetCustomForm = () => {
  customForm.value = {
    providerId: '',
    displayName: '',
    providerType: 'openai-compatible',
    baseUrl: '',
    authType: 'apiKey',
    authValue: '',
    headers: [],
    showHeaders: false
  }
  providerIdError.value = ''
  baseUrlError.value = ''
  providerIdExists.value = false
  showApiKey.value = false
}
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