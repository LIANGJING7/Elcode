<script setup lang="ts">
import type { Message } from '../../../types/ipc'
import MessageUser from './MessageUser.vue'
import MessageAssistant from './MessageAssistant.vue'

const props = defineProps<{
  messages: Message[]
  streamingMessage: Message | null
}>()

const emit = defineEmits<{ inspect: [id: string] }>()

// 流式消息占位
const streamingPlaceholder = 'Thinking…'
</script>

<template>
  <div class="chat-timeline flex-1 overflow-y-auto px-4 py-2">
    <!-- 空态 placeholder -->
    <div v-if="messages.length === 0 && !streamingMessage" class="empty-state text-center py-8 text-accent-muted">
      开始新对话或选择一个会话
    </div>

    <!-- 消息列表 -->
    <div v-for="msg in messages" :key="msg.id">
      <MessageUser v-if="msg.role === 'user'" :message="msg" />
      <MessageAssistant v-else :message="msg" @inspect="emit('inspect', $event)" />
    </div>

    <!-- 流式消息 -->
    <div v-if="streamingMessage" class="message-assistant">
      <div data-testid="streaming-bubble" class="bg-surface border border-accent px-4 py-2 rounded-lg animate-pulse">
        {{ streamingMessage.content || streamingPlaceholder }}
      </div>
    </div>
  </div>
</template>