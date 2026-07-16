<script setup lang="ts">
import { onMounted, nextTick, ref } from 'vue'
import { watch } from 'vue'
import { useSessionStore, parseMentions } from '../stores/session'
import { useWorkspaceStore } from '../stores/workspace'
import { useUiStore } from '../stores/ui'
import { useModelsStore } from '../stores/models'
import type { PromptInput, PromptOptions } from '../../types/ipc'
import Composer from './Composer.vue'
import WorkspaceSelector from './composer/WorkspaceSelector.vue'

const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const ui = useUiStore()
const modelsStore = useModelsStore()

const toastMessage = ref('')

function showToast(message: string) {
  toastMessage.value = message
  setTimeout(() => { toastMessage.value = '' }, 5000)
}

function goToModelSettings() {
  toastMessage.value = ''
  ui.enterSettings()
}

onMounted(() => nextTick())

// 监听会话状态，自动切换到 chat view
watch(() => sessionStore.currentSessionId, (newId) => {
  if (newId) {
    // effectiveView 会自动返回 'chat'，无需手动调用 ui.setView('chat')
  }
})



function handleInterrupt() {}
// 处理 Composer 的 send 事件
async function handleComposerSend(
  content: string,
  options: Record<string, unknown>,
  attachments: Array<{ type: string; name: string; path: string; content?: string; mime?: string; url?: string; isBase64?: boolean }>
) {
  console.log('[DEBUG NewSessionView] === handleComposerSend CALLED ===')
  console.log('[DEBUG NewSessionView] Content:', content.slice(0, 50))
  console.log('[DEBUG NewSessionView] Options:', JSON.stringify(options))
  console.log('[DEBUG NewSessionView] Attachments:', attachments.length)
  console.log('[DEBUG NewSessionView] currentSessionId:', sessionStore.currentSessionId)
  console.log('[DEBUG NewSessionView] isPendingNewSession:', sessionStore.isPendingNewSession)

  if (!modelsStore.selectedModel) {
    showToast('请先选择一个模型再开始对话')
    return
  }

  // 确保处于 pending 新会话状态
  if (!sessionStore.currentSessionId && !sessionStore.isPendingNewSession) {
    console.log('[DEBUG NewSessionView] Calling startNewSession()')
    sessionStore.startNewSession()
    console.log('[DEBUG NewSessionView] After startNewSession, isPendingNewSession:', sessionStore.isPendingNewSession)
  }

  console.log('[DEBUG NewSessionView] Calling sessionStore.sendMessage...')

  // Convert sessionOptions.mode to agent field (plan/build)
  const mode = options.mode as string
  const agent = mode === 'plan' ? 'plan' : 'build'

  // Parse @mentions in content
  let inputs: PromptInput[] = []
  let rawText: string | undefined
  try {
    const result = await parseMentions(content, workspaceStore.currentWorkspace?.path)
    inputs = result.parts
    rawText = result.rawText
  } catch (error) {
    console.error('[NewSessionView] parseMentions error:', error)
    // Fallback to plain text
    inputs = [{ type: 'text', text: content.trim() }]
    rawText = content.trim()
  }

  // 添加图片附件
  for (const att of attachments) {
    if (att.mime) {
      const url = att.url || (att.content
        ? (att.isBase64
            ? `data:${att.mime};base64,${att.content}`
            : `data:${att.mime};utf8,${encodeURIComponent(att.content)}`)
        : '')

      inputs.push({
        type: 'file',
        mime: att.mime,
        filename: att.name,
        url
      })
    }
  }

  // 调用 sendMessage
  const promptOptions: PromptOptions = { agent }
  await sessionStore.sendMessage(inputs, promptOptions, rawText)

  console.log('[DEBUG NewSessionView] ✓ sendMessage completed')
  console.log('[DEBUG NewSessionView] currentSessionId after:', sessionStore.currentSessionId)
}
</script>

<template>
  <div class="new-session-view flex-1 flex flex-col items-center justify-center bg-bg relative">
    <!-- Toast notification -->
    <Transition name="toast">
      <div
        v-if="toastMessage"
        class="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg bg-surface border border-border flex items-center gap-3"
      >
        <div class="flex items-center gap-2 text-text">
          <svg class="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="text-sm">{{ toastMessage }}</span>
        </div>
        <button
          @click="goToModelSettings"
          class="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
        >
          去设置
        </button>
      </div>
    </Transition>

    <div class="w-full max-w-2xl mx-6">
      <div class="text-4xl font-bold text-text-muted/30 mb-4 text-center select-none">
        ELCODE
      </div>

      <div class="flex mb-1 mx-6">
        <WorkspaceSelector />
      </div>

      <!-- Composer -->
      <div class="w-full">
        <Composer
          compact
          :disabled="false"
          :is-streaming="false"
          :has-active-session="false"
          :queue-count="0"
          :pending-queue="[]"
          placeholder="Ask anything... (Shift+Enter for new line)"
          @send="handleComposerSend"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.new-session-view {
  background-image:
    radial-gradient(ellipse at top left, var(--color-accent-glow) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, var(--color-accent-muted) 0%, transparent 50%);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
