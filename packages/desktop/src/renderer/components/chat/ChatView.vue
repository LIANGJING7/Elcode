<script setup lang="ts">
import type { Message, ToolCall } from '../../../types/ipc'
import type { PendingMessage } from '../../stores/session'
import ChatTimeline from './ChatTimeline.vue'
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
  inspect: [toolCallId: string]
  openFile: [tool: ToolCall]
}>()

const streamingStore = useStreamingStore()
const sessionStore = useSessionStore()

function handleSend(content: string, _options: Record<string, unknown>, _attachments: unknown[]) {
  sessionStore.sendMessage(content)
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
</script>

<template>
  <div class="chat-view flex-1 flex flex-col min-h-0 min-w-0 bg-bg overflow-hidden">
    <!-- 时间线 -->
    <ChatTimeline
      :messages="messages"
      :streaming-message="streamingMessage"
      @inspect="emit('inspect', $event)"
      @open-file="emit('openFile', $event)"
    />

    <!-- 输入区 -->
    <Composer
      :has-active-session="true"
      :is-streaming="streamingStore.isCurrentStreaming.value"
      :queue-count="sessionStore.pendingQueue.length"
      :pending-queue="sessionStore.pendingQueue"
      class="flex-shrink-0"
      @send="handleSend"
      @interrupt="handleInterrupt"
      @flush-queued="handleFlushQueued"
      @edit-queued="handleEditQueued"
      @remove-queued="handleRemoveQueued"
    />
  </div>
</template>