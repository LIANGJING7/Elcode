<template>
  <div class="chat-timeline flex-1 overflow-y-auto p-4">
    <div v-for="message in messages" :key="message.id" class="message-block mb-6" :class="message.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
      <div class="message-content max-w-[80%] px-4 py-3 rounded-lg" :class="message.role === 'user' ? 'bg-accent text-white' : 'bg-bg-secondary text-text'">
        <div class="message-header flex items-center gap-2 mb-2 text-xs opacity-70">
          <span class="role-label font-medium">{{ message.role }}</span>
          <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
        </div>

        <div class="message-body text-sm">
          <div v-html="parseContent(message.content)" />
        </div>

        <div v-if="message.toolCalls && message.toolCalls.length > 0" class="tool-calls mt-3">
          <div v-for="tool in message.toolCalls" :key="tool.name" class="tool-call bg-code-bg rounded p-2 mb-2">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-medium text-accent">{{ tool.name }}</span>
              <span class="status-badge px-2 py-0.5 rounded text-xs" :class="statusClass(tool.status)">{{ tool.status }}</span>
            </div>
            <pre class="text-xs text-text-muted overflow-x-auto">{{ JSON.stringify(tool.args, null, 2) }}</pre>
          </div>
        </div>

        <div v-if="message.reasoning" class="reasoning mt-3">
          <details class="bg-bg-tertiary rounded p-2">
            <summary class="text-xs cursor-pointer">Reasoning</summary>
            <div class="mt-2 text-xs text-text-muted">{{ message.reasoning }}</div>
          </details>
        </div>
      </div>
    </div>

    <div v-if="messages.length === 0" class="empty-state flex-1 flex items-center justify-center text-text-muted text-sm">
      Start a conversation
    </div>

    <div v-if="streaming" class="message-block flex justify-start mb-6">
      <div class="message-content max-w-[80%] px-4 py-3 rounded-lg bg-bg-secondary text-text">
        <div class="stream-indicator flex items-center gap-2">
          <div class="animate-pulse-slow w-2 h-2 bg-accent rounded-full"></div>
          <span class="text-xs text-text-muted">Thinking...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatTime } from '../utils/formatting'
import type { Message, ToolCall } from '../../types/ipc'

const props = defineProps<{
  messages: Message[]
  streaming?: boolean
}>()

function parseContent(content: string): string {
  return content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block bg-code-bg rounded p-3 my-2 overflow-x-auto font-mono text-xs"><code>$2</code></pre>')
    .replace(/\n/g, '<br>')
}

function statusClass(status: ToolCall['status']): string {
  switch (status) {
    case 'completed': return 'bg-green-500/20 text-green-400'
    case 'running': return 'bg-yellow-500/20 text-yellow-400'
    case 'error': return 'bg-red-500/20 text-red-400'
    default: return 'bg-bg-tertiary text-text-muted'
  }
}
</script>

<style scoped>
.message-content {
  word-break: break-word;
}

:deep(.code-block) {
  background-color: #2d2d2d;
  border-radius: 0.25rem;
  padding: 0.75rem;
  margin: 0.5rem 0;
  overflow-x: auto;
  font-family: 'JetBrains Mono', monospace;
}
</style>