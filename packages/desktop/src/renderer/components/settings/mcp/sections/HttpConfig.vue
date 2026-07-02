<template>
  <div class="space-y-4">
    <h4 class="text-sm font-medium text-text">HTTP 配置</h4>

    <div>
      <label class="text-xs text-text-muted block mb-1.5">URL</label>
      <input
        v-model="localConfig.url"
        type="text"
        class="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text outline-none focus:border-accent"
        placeholder="https://example.com/mcp"
      />
    </div>

    <div>
      <label class="text-xs text-text-muted block mb-1.5">请求头</label>
      <div class="border border-border rounded-lg">
        <div class="grid grid-cols-2 gap-px bg-border">
          <div class="px-3 py-1.5 bg-bg-surface text-xs text-text-muted">名称</div>
          <div class="px-3 py-1.5 bg-bg-surface text-xs text-text-muted">值</div>
        </div>
        <div
          v-for="[key, value] in headerEntries"
          :key="key"
          class="grid grid-cols-2 gap-px bg-border divide-x divide-border"
        >
          <input
            :value="key"
            type="text"
            class="px-3 py-2 bg-bg-surface text-sm text-text outline-none"
            @input="updateHeaderKey(key, ($event.target as HTMLInputElement).value)"
          />
          <div class="flex items-center gap-1 px-3 py-2 bg-bg-surface">
            <input
              :value="showHeaderValues[key] ? value : '****'"
              type="text"
              class="flex-1 text-sm text-text outline-none"
              :readonly="!showHeaderValues[key]"
              @input="updateHeaderValue(key, ($event.target as HTMLInputElement).value)"
            />
            <button
              class="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text"
              @click="toggleHeaderValue(key)"
            >
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text border-t border-border"
          @click="addHeader"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>添加请求头</span>
        </button>
      </div>
    </div>

    <div class="border border-border rounded-lg">
      <button
        class="w-full flex items-center justify-between px-3 py-2 text-sm text-text"
        @click="showAdvanced = !showAdvanced"
      >
        <span class="text-text-muted">高级设置</span>
        <svg class="w-4 h-4 text-text-muted transition-transform" :class="{ 'rotate-180': showAdvanced }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div v-if="showAdvanced" class="px-3 pb-3 space-y-3">
        <div>
          <label class="text-xs text-text-muted block mb-1.5">超时时间 (ms)</label>
          <input
            v-model.number="localConfig.timeout"
            type="number"
            class="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text outline-none focus:border-accent"
            placeholder="5000"
          />
        </div>
        
        <div>
          <label class="text-xs text-text-muted block mb-2">OAuth 配置</label>
          <div class="space-y-2">
            <button
              class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer border border-border"
              :class="oauthMode === 'auto' ? 'bg-accent/10 text-accent' : 'text-text hover:bg-bg-hover'"
              @click="oauthMode = 'auto'"
            >
              自动 OAuth (默认)
            </button>
            <button
              class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer border border-border"
              :class="oauthMode === 'pre-registered' ? 'bg-accent/10 text-accent' : 'text-text hover:bg-bg-hover'"
              @click="oauthMode = 'pre-registered'"
            >
              预注册客户端
            </button>
            <div v-if="oauthMode === 'pre-registered'" class="space-y-2 pl-3">
              <input v-model="oauthFields.clientId" placeholder="Client ID" class="w-full px-2 py-1.5 text-xs bg-bg-surface border border-border rounded" />
              <input v-model="oauthFields.clientSecret" placeholder="Client Secret" class="w-full px-2 py-1.5 text-xs bg-bg-surface border border-border rounded" />
              <input v-model="oauthFields.scope" placeholder="Scope" class="w-full px-2 py-1.5 text-xs bg-bg-surface border border-border rounded" />
            </div>
            <button
              class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer border border-border"
              :class="oauthMode === 'disabled' ? 'bg-accent/10 text-accent' : 'text-text hover:bg-bg-hover'"
              @click="oauthMode = 'disabled'"
            >
              禁用 OAuth
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'
import type { McpConfig } from '../../../../../types/ipc'

const props = defineProps<{
  config: McpConfig
}>()

const emit = defineEmits<{
  update: [config: McpConfig]
}>()

const localConfig = reactive({
  url: props.config.url || '',
  headers: (props.config.headers ? { ...props.config.headers } : {}) as Record<string, string>,
  timeout: props.config.timeout,
  oauth: (props.config.oauth !== false && props.config.oauth
    ? { ...props.config.oauth } 
    : undefined) as { clientId?: string; clientSecret?: string; scope?: string } | false | undefined
})

// Separate reactive for OAuth fields to avoid type issues with false | undefined
const initialOAuth = props.config.oauth !== false && props.config.oauth ? props.config.oauth : {}
const oauthFields = reactive({
  clientId: initialOAuth.clientId || '',
  clientSecret: initialOAuth.clientSecret || '',
  scope: initialOAuth.scope || ''
})

const showHeaderValues = reactive<Record<string, boolean>>({})
const showAdvanced = ref(false)
const oauthMode = ref<'auto' | 'pre-registered' | 'disabled'>(
  props.config.oauth === false ? 'disabled' : props.config.oauth?.clientId ? 'pre-registered' : 'auto'
)

const headerEntries = computed(() => Object.entries(localConfig.headers || {}))

watch([localConfig, oauthMode, oauthFields], () => {
  if (oauthMode.value === 'disabled') {
    localConfig.oauth = false
  } else if (oauthMode.value === 'auto') {
    localConfig.oauth = undefined
  } else if (oauthMode.value === 'pre-registered') {
    localConfig.oauth = { clientId: oauthFields.clientId, clientSecret: oauthFields.clientSecret, scope: oauthFields.scope }
  }
  emit('update', { ...props.config, ...localConfig } as McpConfig)
}, { deep: true })

function addHeader() {
  if (!localConfig.headers) localConfig.headers = {}
  localConfig.headers[`Header_${Object.keys(localConfig.headers).length}`] = ''
}

function updateHeaderKey(oldKey: string, newKey: string) {
  if (!localConfig.headers) return
  const value = localConfig.headers[oldKey]
  delete localConfig.headers[oldKey]
  localConfig.headers[newKey] = value
}

function updateHeaderValue(key: string, value: string) {
  if (!localConfig.headers) return
  localConfig.headers[key] = value
}

function toggleHeaderValue(key: string) {
  showHeaderValues[key] = !showHeaderValues[key]
}
</script>