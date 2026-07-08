<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { Message, ToolCall, PromptOptions } from '../../../types/ipc'
import type { PendingMessage } from '../../stores/session'
import type { ChatTimelineExpose } from './ChatTimeline.vue'
import ChatTimeline from './ChatTimeline.vue'
import ChatTodo from './ChatTodo.vue'
import Composer from '../Composer.vue'
import { useStreamingStore } from '../../stores/streaming'
import { useSessionStore } from '../../stores/session'

// Props: 会话元信息 + 消息流
const props = defineProps<{
  sessionId: string
  messages: Message[]
  streamingMessage: Message | null
}>()

const emit = defineEmits<{
  openFile: [tool: ToolCall]
}>()

const timelineRef = ref<ChatTimelineExpose>()

// 一次性滚动标志：只在首次打开或切换会话时滚动
const needInitialScroll = ref(false)

const streamingStore = useStreamingStore()
const sessionStore = useSessionStore()

async function handleSend(content: string, options: Record<string, unknown>, _attachments: unknown[]) {
  const mode = options.mode as string | undefined
  const agent = mode === 'plan' ? 'plan' : 'build'
  const promptOptions: PromptOptions = { agent }
  sessionStore.sendMessage(content, promptOptions)

  // 用户发送消息时平滑滚动到底部
  await nextTick()
  requestAnimationFrame(() => {
    timelineRef.value?.scrollToBottom({ behavior: 'smooth' })
    needInitialScroll.value = false
  })
}

function handleInterrupt() {
  if (props.sessionId) {
    sessionStore.interrupt(props.sessionId)
  }
}

function handleFlushQueued(pending: PendingMessage) {
  sessionStore.flushMessage(pending)
}

function handleEditQueued(pending: PendingMessage) {
  // editMessage removes from queue and returns content; Composer will put it into the input box
  sessionStore.editMessage(pending.id)
}

function handleRemoveQueued(pendingId: string) {
  sessionStore.removeMessage(pendingId)
}

// 监听会话切换，设置一次性滚动标志
watch(
  () => sessionStore.currentSessionId,
  () => {
    needInitialScroll.value = true
  },
  { immediate: true }
)

// 监听消息变化，在标志为 true 时执行滚动
watch(
  () => sessionStore.currentMessages.length,
  async (length) => {
    if (!needInitialScroll.value) return
    if (length === 0) return
    
    await nextTick()
    requestAnimationFrame(() => {
      timelineRef.value?.scrollToBottom({ behavior: 'auto' })
      needInitialScroll.value = false
    })
  }
)
</script>

<template>
  <div class="chat-view flex-1 flex flex-col min-h-0 min-w-0 bg-bg overflow-hidden">
    <!-- 时间线 -->
    <ChatTimeline
      ref="timelineRef"
      :messages="messages"
      :streaming-message="streamingMessage"
      @open-file="emit('openFile', $event)"
    />

    <!-- Todo 面板: 输入框上方 -->
    <ChatTodo class="flex-shrink-0" />

    <!-- 输入区 -->
    <Composer
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