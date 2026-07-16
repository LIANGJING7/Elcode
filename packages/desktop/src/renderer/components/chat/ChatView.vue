<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { Message, ToolCall, PromptOptions, PromptInput } from '../../../types/ipc'
import type { PendingMessage } from '../../stores/session'
import type { ChatTimelineExpose } from './ChatTimeline.vue'
import ChatTimeline from './ChatTimeline.vue'
import ChatTodo from './ChatTodo.vue'
import Composer from '../Composer.vue'
import RevertedMessagesPreview from './RevertedMessagesPreview.vue'
import { useStreamingStore } from '../../stores/streaming'
import { useSessionStore, parseMentions } from '../../stores/session'
import { useWorkspaceStore } from '../../stores/workspace'
import { useModelsStore } from '../../stores/models'
import { useUiStore } from '../../stores/ui'
import { useQuestionStore } from '../../stores/question'
import { usePermissionStore } from '../../stores/permission'
import QuestionPanel from '../question/QuestionPanel.vue'
import PermissionPrompt from '../permission/PermissionPrompt.vue'

const props = defineProps<{
  sessionId: string
  messages: Message[]
  streamingMessage: Message | null
}>()

const emit = defineEmits<{
  openFile: [tool: ToolCall]
  openOriginalFile: [{ filePath: string; diff: string }]
  openDiffFile: [string]
}>()

const timelineRef = ref<ChatTimelineExpose>()
const needInitialScroll = ref(false)
const streamingStore = useStreamingStore()
const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const modelsStore = useModelsStore()

const toastMessage = ref('')

function showToast(message: string) {
  toastMessage.value = message
  setTimeout(() => { toastMessage.value = '' }, 5000)
}

function goToModelSettings() {
  toastMessage.value = ''
  useUiStore().enterSettings()
}
const questionStore = useQuestionStore()
const permissionStore = usePermissionStore()

async function handleSend(content: string, options: Record<string, unknown>, attachments: Array<{ type: string; name?: string; path?: string; content?: string; mime?: string; url?: string; isBase64?: boolean }>) {
  if (!modelsStore.selectedModel) {
    showToast('请先选择一个模型再开始对话')
    return
  }

  const mode = options.mode as string | undefined
  const agent = mode === 'plan' ? 'plan' : 'build'
  const promptOptions: PromptOptions = { agent }

// Parse @mentions in content
  let inputs: PromptInput[] = []
  let rawText: string | undefined
  try {
    const result = await parseMentions(content, workspaceStore.currentWorkspace?.path)
    inputs = result.parts
    rawText = result.rawText
  } catch (error) {
    console.error('[ChatView] parseMentions error:', error)
    // Fallback to plain text
    inputs = [{ type: 'text', text: content.trim() }]
    rawText = content.trim()
  }

  // Add file/image attachments
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

  sessionStore.sendMessage(inputs, promptOptions, rawText)

  // 用户发送消息时平滑滚动到底部
  await nextTick()
  requestAnimationFrame(() => {
    timelineRef.value?.scrollToBottom({ behavior: 'smooth' })
    needInitialScroll.value = false
  })
}

function handleInterrupt() {
  if (props.sessionId) sessionStore.interrupt(props.sessionId)
}

function handleFlushQueued(pending: PendingMessage) { sessionStore.flushMessage(pending) }
function handleEditQueued(pending: PendingMessage) { sessionStore.editMessage(pending.id) }
function handleRemoveQueued(pendingId: string) { sessionStore.removeMessage(pendingId) }

watch(() => sessionStore.currentSessionId, () => { needInitialScroll.value = true }, { immediate: true })

watch(() => sessionStore.currentMessages.length, async (length) => {
  if (!needInitialScroll.value) return
  if (length === 0) return
  await nextTick()
  requestAnimationFrame(() => {
    timelineRef.value?.scrollToBottom({ behavior: 'auto' })
    needInitialScroll.value = false
  })
})
</script>

<template>
    <div class="chat-view flex-1 flex flex-col min-h-0 min-w-0 bg-bg relative">
    <!-- Toast notification -->
    <Transition name="toast">
      <div
        v-if="toastMessage"
        class="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg bg-surface border border-border flex items-center gap-3"
      >
        <div class="flex items-center gap-2 text-text">
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

    <ChatTimeline
      ref="timelineRef"
      :messages="messages"
      :streaming-message="streamingMessage"
      @open-file="emit('openFile', $event)"
      @open-original-file="emit('openOriginalFile', $event)"
      @open-diff-file="emit('openDiffFile', $event)"
    />
    <ChatTodo class="flex-shrink-0" />
        <RevertedMessagesPreview  class="flex-shrink-0" />
    <div v-if="questionStore.hasPending" class="pt-0 pb-6 mx-6 flex-shrink-0">
      <div class="max-w-chat-max mx-auto">
        <QuestionPanel />
      </div>
    </div>

    <div v-if="permissionStore.hasPending" class="pt-0 pb-2 mx-6 flex-shrink-0">
      <div class="max-w-chat-max mx-auto">
        <PermissionPrompt />
      </div>
    </div>

    <Composer
      v-else
      :has-active-session="true"
      :is-streaming="streamingStore.isCurrentStreaming.value"
      :queue-count="sessionStore.currentPendingQueue.length"
      :pending-queue="sessionStore.currentPendingQueue"
      class="flex-shrink-0"
      @send="handleSend"
      @interrupt="handleInterrupt"
      @flush-queued="handleFlushQueued"
      @edit-queued="handleEditQueued"
      @remove-queued="handleRemoveQueued"
    />
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -20px);
}
.toast-leave-to {
  opacity: 0;
}
</style>
