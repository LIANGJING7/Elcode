<script setup lang="ts">
import { computed } from 'vue'
import type { Message, ToolCall } from '../../../types/ipc'
import MessageUser from './MessageUser.vue'
import MessageAssistant from './MessageAssistant.vue'
import StreamingMessage from '../streaming/StreamingMessage.vue'

const props = defineProps<{
  messages: Message[]
  streamingMessage: Message | null
}>()

const emit = defineEmits<{ inspect: [id: string]; openFile: [tool: ToolCall] }>()

// 一个 user turn 的多步 agentic 响应会被后端持久化为多条 assistant message
// (每个 step.started 都 appendMessage 一条)，每条各带自己的 reasoning。
// 流式时 timelineNodes 已把所有 reasoning 合并成单块；历史回看需对齐——
// 把两条 user message 之间连续的 assistant message 聚合成一条渲染，
// reasoning 拼接为单个块，避免出现多个 Reasoning。
interface TimelineItem {
  key: string
  role: 'user' | 'assistant'
  message: Message
}

const aggregatedItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []
  let group: Message[] = []
  let groupKeys: string[] = []

  const flush = () => {
    if (group.length === 0) return
    const reasoning = group
      .map(m => m.reasoning)
      .filter((r): r is string => Boolean(r))
      .join('\n\n')
    const content = group
      .map(m => m.content)
      .filter(c => Boolean(c && c.trim()))
      .join('\n\n')
    const toolCalls = group.flatMap(m => m.toolCalls ?? [])
    const merged: Message = {
      id: group[0].id,
      role: 'assistant',
      content,
      timestamp: group[0].timestamp,
      ...(reasoning ? { reasoning } : {}),
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
    }
    items.push({ key: groupKeys.join('|'), role: 'assistant', message: merged })
    group = []
    groupKeys = []
  }

  for (const msg of props.messages) {
    if (msg.role === 'user') {
      flush()
      items.push({ key: msg.id, role: 'user', message: msg })
    } else {
      group.push(msg)
      groupKeys.push(msg.id)
    }
  }
  flush()
  return items
})
</script>

<template>
  <div class="chat-timeline flex-1 min-h-0 h-0 overflow-y-auto py-4 mt-6 mb-2">
    <div class="max-w-chat-max mx-auto px-6">
    <!-- 空态 placeholder -->
    <div v-if="messages.length === 0 && !streamingMessage" class="empty-state text-center py-8 text-accent-muted">
      开始新对话或选择一个会话
    </div>

    <!-- 消息列表（连续 assistant 已按 user turn 聚合） -->
    <div v-for="item in aggregatedItems" :key="item.key">
      <MessageUser v-if="item.role === 'user'" :message="item.message" />
      <MessageAssistant v-else :message="item.message" @inspect="emit('inspect', $event)" @open-file="emit('openFile', $event)" />
    </div>

    <!-- 流式消息 -->
    <div v-if="streamingMessage">
      <StreamingMessage @open-file="emit('openFile', $event)" />
    </div>
    </div>
  </div>
</template>