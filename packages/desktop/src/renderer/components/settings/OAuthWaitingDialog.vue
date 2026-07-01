<template>
  <div v-if="isOpen" class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="modal-content bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-md p-4">
      <div class="modal-header flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-text">{{ providerName }} - 授权中</h3>
        <button
          class="close-btn w-6 h-6 flex items-center justify-center text-text-muted hover:text-text cursor-pointer rounded hover:bg-bg-hover"
          :disabled="waiting"
          @click="handleCancel"
        >
          ×
        </button>
      </div>

      <div class="modal-body">
        <!-- Status indicator -->
        <div class="flex items-center gap-3 mb-4 p-3 bg-bg-surface rounded-lg">
          <div class="flex-shrink-0">
            <svg v-if="waiting" class="w-5 h-5 text-accent animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
            </svg>
            <svg v-else-if="success" class="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            <svg v-else class="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
          </div>
          <span class="text-sm text-text">
            {{ waiting ? '等待授权...' : (success ? '授权成功！' : (error || '授权失败')) }}
          </span>
        </div>

        <!-- Instructions -->
        <div class="mb-4">
          <p class="text-xs text-text-muted mb-2">{{ authorization?.instructions || '正在打开浏览器进行授权...' }}</p>
          
          <!-- URL link -->
          <div v-if="authorization?.url" class="flex items-center gap-2">
            <a
              :href="authorization.url"
              class="text-sm text-accent hover:underline truncate"
              target="_blank"
            >
              {{ authorization.url }}
            </a>
            <button
              class="px-2 py-1 text-xs text-text-muted hover:text-text cursor-pointer border border-border rounded"
              @click="copyUrl"
            >
              复制
            </button>
          </div>
        </div>

        <!-- Code display/copy for auto method -->
        <div v-if="authorization?.method === 'auto' && authCode" class="mb-4 p-3 bg-bg-surface rounded-lg">
          <label class="text-xs text-text-muted mb-1 block">授权码</label>
          <div class="flex items-center gap-2">
            <span class="text-lg font-mono text-text">{{ authCode }}</span>
            <button
              class="px-2 py-1 text-xs text-text-muted hover:text-text cursor-pointer border border-border rounded"
              @click="copyCode"
            >
              复制
            </button>
          </div>
        </div>

        <!-- Code input for code method -->
        <div v-if="authorization?.method === 'code' && !success" class="mb-4">
          <label class="text-xs text-text-muted mb-1.5 block">输入授权码</label>
          <input
            v-model="inputCode"
            type="text"
            placeholder="从浏览器获取授权码"
            class="w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
          />
          <div v-if="codeError" class="text-xs text-red-400 mt-1">{{ codeError }}</div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 justify-end">
          <button
            v-if="!success && !waiting"
            class="px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer"
            @click="handleCancel"
          >
            取消
          </button>
          <button
            v-if="authorization?.method === 'code' && !success"
            class="px-4 py-2 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer"
            :disabled="waiting || !inputCode.trim()"
            @click="handleCodeSubmit"
          >
            {{ waiting ? '提交中...' : '提交' }}
          </button>
          <button
            v-if="success"
            class="px-4 py-2 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer"
            @click="handleContinue"
          >
            继续
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { AuthorizationResult } from '../../types/ipc'

const props = defineProps<{
  isOpen: boolean
  providerId: string
  providerName?: string
  methodIndex: number
  authorization?: AuthorizationResult
  directory?: string
}>()

const emit = defineEmits<{
  success: [providerId: string]
  close: []
}>()

const waiting = ref(true)
const success = ref(false)
const error = ref('')
const inputCode = ref('')
const codeError = ref('')
const authCode = ref('')
let callbackTimer: ReturnType<typeof setInterval> | null = null

const providerName = computed(() => {
  if (props.providerName) return props.providerName
  const id = props.providerId
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ').replace(/(?:^|\s)\S/g, l => l.toUpperCase())
})

// Extract code from instructions (e.g., "Enter code XXXX-XXXX")
watch(() => props.authorization, (auth) => {
  if (auth?.instructions) {
    const match = auth.instructions.match(/[A-Z0-9]{4}-[A-Z0-9]{4,5}/)
    if (match) {
      authCode.value = match[0]
    }
  }
}, { immediate: true })

// Auto method: poll for callback completion
onMounted(() => {
  if (props.authorization?.method === 'auto' && props.isOpen) {
    startAutoCallback()
  }
})

onUnmounted(() => {
  if (callbackTimer) {
    clearInterval(callbackTimer)
    callbackTimer = null
  }
})

watch(() => props.isOpen, (newVal) => {
  if (newVal && props.authorization?.method === 'auto') {
    startAutoCallback()
  } else if (!newVal) {
    if (callbackTimer) {
      clearInterval(callbackTimer)
      callbackTimer = null
    }
    waiting.value = true
    success.value = false
    error.value = ''
    inputCode.value = ''
    codeError.value = ''
    authCode.value = ''
  }
})

function startAutoCallback() {
  waiting.value = true
  callbackTimer = setInterval(async () => {
    try {
      const result = await window.desktop.provider.authCallback(
        props.providerId,
        props.methodIndex,
        undefined, // no code for auto method
        props.directory
      )
      
      if (result === true) {
        clearInterval(callbackTimer!)
        callbackTimer = null
        waiting.value = false
        success.value = true
      }
    } catch (e) {
      // Continue polling until success or user cancels
      console.log('OAuth callback polling...', e)
    }
  }, 2000)
}

async function handleCodeSubmit() {
  if (!inputCode.value.trim()) return
  waiting.value = true
  codeError.value = ''

  try {
    const result = await window.desktop.provider.authCallback(
      props.providerId,
      props.methodIndex,
      inputCode.value.trim(),
      props.directory
    )

    if (result === true) {
      success.value = true
      emit('success', props.providerId)
    } else {
      codeError.value = '授权码无效或已过期'
    }
  } catch (e) {
    codeError.value = e instanceof Error ? e.message : '授权失败'
  } finally {
    waiting.value = false
  }
}

async function copyUrl() {
  if (props.authorization?.url) {
    try {
      await navigator.clipboard.writeText(props.authorization.url)
    } catch {
      // Fallback for older browsers
    }
  }
}

async function copyCode() {
  if (authCode.value) {
    try {
      await navigator.clipboard.writeText(authCode.value)
    } catch {
      // Fallback
    }
  }
}

function handleCancel() {
  if (callbackTimer) {
    clearInterval(callbackTimer)
    callbackTimer = null
  }
  emit('close')
}

function handleContinue() {
  emit('success', props.providerId)
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

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>