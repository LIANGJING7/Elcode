<script setup lang="ts">
import type { Message } from '../../../types/ipc'
import ChatHeader from './ChatHeader.vue'
import ChatTimeline from './ChatTimeline.vue'
import Composer from '../Composer.vue'

// Props: 会话元信息 + 消息流 (store wiring 在 Task 3.7)
defineProps<{
  title: string
  sessionId: string
  pinned?: boolean
  messages: Message[]
  streamingMessage: Message | null
}>()

const emit = defineEmits<{
  rename: [title: string]
  copy: []
  pin: []
  delete: []
  export: []
  inspect: [toolCallId: string]
}>()
</script>

<template>
  <div class="chat-view flex-1 flex flex-col min-w-0 bg-base">
    <!-- 头部 -->
    <ChatHeader
      :title="title"
      :session-id="sessionId"
      :pinned="pinned"
      @rename="emit('rename', $event)"
      @copy="emit('copy')"
      @pin="emit('pin')"
      @delete="emit('delete')"
      @export="emit('export')"
    />

    <!-- 时间线 -->
    <ChatTimeline
      :messages="messages"
      :streaming-message="streamingMessage"
      class="flex-1 overflow-y-auto"
      @inspect="emit('inspect', $event)"
    />

    <!-- 输入区 (沿用旧 Composer, phase 4 改造) -->
    <Composer class="border-t border-surface" />
  </div>
</template>