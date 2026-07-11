<script setup lang="ts">
import { onMounted, nextTick } from 'vue'
import { watch } from 'vue'
import { useSessionStore } from '../stores/session'
import { useUiStore } from '../stores/ui'
import type { PromptInput, PromptOptions } from '../../types/ipc'
import Composer from './Composer.vue'
import WorkspaceSelector from './composer/WorkspaceSelector.vue'

const sessionStore = useSessionStore()
const ui = useUiStore()

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

  // 构建 PromptInput 数组
  const inputs: PromptInput[] = []

  // 添加文本内容
  if (content.trim()) {
    inputs.push({ type: 'text', text: content.trim() })
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
  await sessionStore.sendMessage(inputs, promptOptions)

  console.log('[DEBUG NewSessionView] ✓ sendMessage completed')
  console.log('[DEBUG NewSessionView] currentSessionId after:', sessionStore.currentSessionId)
}
</script>

<template>
  <div class="new-session-view flex-1 flex flex-col items-center justify-center bg-bg">
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
</style>
