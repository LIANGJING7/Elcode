<script setup lang="ts">
import type { Message } from '../../../types/ipc'
import ChatTimeline from './ChatTimeline.vue'
import Composer from '../Composer.vue'

// Props: 会话元信息 + 消息流
defineProps<{
  sessionId: string
  messages: Message[]
  streamingMessage: Message | null
}>()

const emit = defineEmits<{
  inspect: [toolCallId: string]
}>()
</script>

<template>
  <div class="chat-view flex-1 flex flex-col min-w-0 bg-bg">
    <!-- 时间线 -->
    <ChatTimeline
      :messages="messages"
      :streaming-message="streamingMessage"
      class="flex-1 overflow-y-auto"
      @inspect="emit('inspect', $event)"
    />

    <!-- 输入区 -->
    <Composer
      :has-active-session="true"
      class="flex-shrink-0"
    />
  </div>
</template>