<template>
  <div class="space-y-4">
    <h4 class="text-sm font-medium text-text">认证状态</h4>

    <div v-if="authState.state === 'disabled'" class="text-xs text-text-muted py-3">
      OAuth 已禁用
      <br />
      使用自定义请求头进行认证。
    </div>

    <div v-else class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="text-xs text-text-muted">状态</span>
        <span
          class="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
          :class="statusClass"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClass"/>
          {{ statusText }}
        </span>
      </div>

      <div v-if="authState.state === 'required'" class="text-xs text-text-muted">
        此服务器需要 OAuth 认证。
        <div class="mt-3">
          <button
            class="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
            :disabled="loading"
            @click="$emit('login')"
          >
            使用 OAuth 登录
          </button>
        </div>
      </div>

      <div v-if="authState.state === 'opening'" class="text-xs text-text-muted">
        正在启动浏览器...
        <div v-if="authState.authorizationUrl" class="mt-3 flex items-center gap-2">
          <span class="text-xs text-text-muted truncate">{{ authState.authorizationUrl }}</span>
          <button class="text-xs text-accent hover:text-accent-hover" @click="$emit('copy-url')">
            复制
          </button>
        </div>
      </div>

      <div v-if="authState.state === 'waiting'" class="text-xs text-text-muted">
        请在浏览器中完成认证。
        <div class="mt-3">
          <button
            class="px-3 py-1.5 border border-border hover:border-border-light text-text text-xs rounded-lg transition-colors"
            @click="$emit('cancel')"
          >
            取消
          </button>
        </div>
      </div>

      <div v-if="authState.state === 'authenticated'" class="text-xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-text-muted">账户</span>
          <span class="text-text">{{ authState.account || '已认证' }}</span>
        </div>
        <div v-if="authState.expiresAt" class="flex items-center justify-between">
          <span class="text-text-muted">过期时间</span>
          <span class="text-text">{{ authState.expiresAt }}</span>
        </div>
        <div class="flex items-center gap-2 mt-3">
          <button
            class="px-3 py-1.5 border border-border hover:border-border-light text-text text-xs rounded-lg transition-colors"
            @click="$emit('reconnect')"
          >
            重新连接
          </button>
          <button
            class="px-3 py-1.5 border border-border hover:border-border-light text-red-400 text-xs rounded-lg transition-colors"
            @click="$emit('logout')"
          >
            登出
          </button>
        </div>
      </div>

      <div v-if="authState.state === 'failed'" class="text-xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-text-muted">原因</span>
          <span class="text-red-400">{{ authState.error || '认证失败' }}</span>
        </div>
        <div class="mt-3">
          <button
            class="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs rounded-lg transition-colors"
            @click="$emit('reconnect')"
          >
            重试
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AuthenticationState } from '../../../../types/ipc'

const props = defineProps<{
  authState: AuthenticationState
  loading?: boolean
}>()

defineEmits<{
  login: []
  reconnect: []
  logout: []
  cancel: []
  copy-url: []
}>()

const statusText = computed(() => {
  switch (props.authState.state) {
    case 'required': return '需要认证'
    case 'opening': return '正在打开浏览器...'
    case 'waiting': return '等待认证...'
    case 'authenticated': return '已认证'
    case 'failed': return '认证失败'
    default: return ''
  }
})

const statusClass = computed(() => {
  switch (props.authState.state) {
    case 'authenticated': return 'bg-green-500/10 text-green-500'
    case 'failed': case 'required': return 'bg-yellow-500/10 text-yellow-500'
    case 'opening': case 'waiting': return 'bg-blue-500/10 text-blue-500'
    default: return ''
  }
})

const statusDotClass = computed(() => {
  switch (props.authState.state) {
    case 'authenticated': return 'bg-green-500'
    case 'failed': case 'required': return 'bg-yellow-500'
    case 'opening': case 'waiting': return 'bg-blue-500 animate-pulse'
    default: return ''
  }
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>