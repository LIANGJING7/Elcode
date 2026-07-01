<template>
  <div v-if="isOpen" class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="modal-content bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-md p-4">
      <div class="modal-header flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-text">{{ providerName }} - {{ authMethod?.label || '认证' }}</h3>
        <button
          class="close-btn w-6 h-6 flex items-center justify-center text-text-muted hover:text-text cursor-pointer rounded hover:bg-bg-hover"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>

      <!-- OAuth Prompts -->
      <div v-if="authMethod?.type === 'oauth' && authMethod.prompts && authMethod.prompts.length > 0 && !showApiKeyInput" class="modal-form">
        <div v-for="prompt in authMethod.prompts" :key="prompt.key" class="form-group mb-3">
          <label class="form-label text-xs text-text-muted mb-1.5 block">{{ prompt.message }}</label>
          
          <!-- Select prompt -->
          <div v-if="prompt.type === 'select'" class="space-y-1">
            <button
              v-for="option in prompt.options"
              :key="option.value"
              class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer"
              :class="promptInputs[prompt.key] === option.value ? 'bg-accent/10 text-accent' : 'text-text hover:bg-bg-hover'"
              @click="promptInputs[prompt.key] = option.value"
            >
              <span>{{ option.label }}</span>
              <span v-if="option.hint" class="text-xs text-text-muted">{{ option.hint }}</span>
            </button>
          </div>
          
          <!-- Text prompt -->
          <input
            v-else
            v-model="promptInputs[prompt.key]"
            type="text"
            :placeholder="prompt.placeholder"
            class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
          />
        </div>

        <div class="form-actions flex gap-2 justify-end mt-4">
          <button
            type="button"
            class="px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer"
            @click="$emit('close')"
          >
            取消
          </button>
          <button
            type="button"
            class="px-4 py-2 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer"
            :disabled="!allPromptsFilled"
            @click="handleOAuthStart"
          >
            继续
          </button>
        </div>
      </div>

      <!-- API Key Input -->
      <div v-if="authMethod?.type === 'api' || showApiKeyInput" class="modal-form">
        <form @submit.prevent="handleApiKeySubmit">
          <div class="form-group mb-3">
            <label class="form-label text-xs text-text-muted mb-1.5 block">API Key</label>
            <div class="api-key-input flex items-center gap-2">
              <input
                v-model="apiKey"
                :type="showApiKey ? 'text' : 'password'"
                placeholder="输入您的 API Key"
                class="form-input flex-1 px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
                required
              />
              <button
                type="button"
                class="toggle-btn px-2 py-1.5 text-xs text-text-muted hover:text-text cursor-pointer border border-border rounded"
                @click="showApiKey = !showApiKey"
              >
                {{ showApiKey ? '隐藏' : '显示' }}
              </button>
            </div>
            <div v-if="apiKeyError" class="error-text text-xs text-red-400 mt-1">{{ apiKeyError }}</div>
          </div>

          <!-- Key URL hint -->
          <div v-if="keyUrl" class="mb-4 p-3 bg-bg-surface rounded-lg">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <div class="text-xs text-text-muted">
                <span>获取 API Key：</span>
                <a :href="keyUrl" class="text-accent hover:underline ml-1" target="_blank">{{ keyUrl }}</a>
              </div>
            </div>
          </div>

          <div class="form-actions flex gap-2 justify-end">
            <button
              type="button"
              class="px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer"
              @click="$emit('close')"
            >
              取消
            </button>
            <button
              type="button"
              class="px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer"
              :disabled="testing || !apiKey.trim()"
              @click="handleTest"
            >
              {{ testing ? '测试中...' : '测试连接' }}
            </button>
            <button
              type="submit"
              class="submit-btn px-4 py-2 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer"
              :disabled="saving || !apiKey.trim()"
            >
              {{ saving ? '保存中...' : '保存并连接' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AuthMethod, AuthMethodPrompt } from '../../stores/models'

const props = defineProps<{
  isOpen: boolean
  providerId: string
  providerName?: string
  authMethod?: AuthMethod
  directory?: string
}>()

const emit = defineEmits<{
  success: [providerId: string]
  oauthStart: [providerId: string, methodIndex: number, inputs: Record<string, string>]
  close: []
}>()

const apiKey = ref('')
const showApiKey = ref(false)
const apiKeyError = ref('')
const saving = ref(false)
const testing = ref(false)
const promptInputs = ref<Record<string, string>>({})

// Key URL hints for popular providers
const KEY_URLS: Record<string, string> = {
  opencode: 'https://opencode.ai/zen',
  'opencode-go': 'https://opencode.ai/go',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  google: 'https://aistudio.google.com/apikey',
}

const providerName = computed(() => {
  if (props.providerName) return props.providerName
  const id = props.providerId
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ').replace(/(?:^|\s)\S/g, l => l.toUpperCase())
})

const keyUrl = computed(() => KEY_URLS[props.providerId])

const showApiKeyInput = computed(() => {
  // 如果是 OAuth 类型且还有 prompts 未处理，不显示 API Key 输入
  if (props.authMethod?.type === 'oauth' && props.authMethod.prompts?.length && !allPromptsFilled.value) {
    return false
  }
  return true
})

const allPromptsFilled = computed(() => {
  if (!props.authMethod?.prompts) return true
  return props.authMethod.prompts.every(prompt => {
    const value = promptInputs.value[prompt.key]
    return value !== undefined && value !== ''
  })
})

function handleOAuthStart() {
  if (!allPromptsFilled.value) return
  // 找到认证方法索引（假设是第一个匹配的方法）
  emit('oauthStart', props.providerId, 0, promptInputs.value)
}

async function handleTest() {
  if (!apiKey.value.trim()) return
  testing.value = true
  apiKeyError.value = ''

  try {
    const result = await window.desktop.provider.test({
      name: props.providerId,
      apiKey: apiKey.value.trim(),
    }, props.directory)

    if (!result.success) {
      apiKeyError.value = result.error || '测试失败'
    }
  } catch (e) {
    apiKeyError.value = e instanceof Error ? e.message : '测试失败'
  } finally {
    testing.value = false
  }
}

async function handleApiKeySubmit() {
  if (!apiKey.value.trim()) return
  saving.value = true
  apiKeyError.value = ''

  try {
    // 对于自定义供应商，使用 add 方法
    // 对于已知供应商，使用 auth.set（通过 backend）
    const result = await window.desktop.provider.add({
      name: props.providerId,
      apiKey: apiKey.value.trim(),
    }, props.directory)

    if (result.success) {
      emit('success', props.providerId)
    } else {
      apiKeyError.value = result.error || '保存失败'
    }
  } catch (e) {
    apiKeyError.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    apiKey.value = ''
    apiKeyError.value = ''
    showApiKey.value = false
    promptInputs.value = {}
  }
})
</script>

<style scoped>
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>