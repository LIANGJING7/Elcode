<script setup lang="ts">
import { computed } from 'vue'
import type { Message, ToolCall } from '../../../types/ipc'
import ToolRenderer from '../tool/ToolRenderer.vue'
import ReasoningBlock from './ReasoningBlock.vue'
import CodeBlock from './CodeBlock.vue'

const props = defineProps<{ message: Message }>()
const emit = defineEmits<{ inspect: [id: string]; openFile: [tool: ToolCall] }>()

// Format duration (ms) to human readable
const formattedDuration = computed(() => {
  if (!props.message.duration) return null
  const ms = props.message.duration
  if (ms < 1000) return '< 1s'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
})

// 提取代码块 (简化实现: 正则匹配 ```lang\ncode```)
const codeBlocks = computed(() => {
  const content = props.message.content || ''
  const matches = content.matchAll(/```(\w+)\n([\s\S]*?)```/g)
  return Array.from(matches, (m) => ({ lang: m[1], code: m[2].trim() }))
})

// 去掉代码块后的纯文本
const textContent = computed(() => {
  const content = props.message.content || ''
  return content.replace(/```(\w+)\n([\s\S]*?)```/g, '').trim()
})

// Reasoning duration threshold (3 seconds) - don't show if shorter
// Matches streaming threshold in selectors.ts
const REASONING_THRESHOLD_MS = 3000

// Check if reasoning should be shown
const showReasoning = computed(() => {
  if (!props.message.reasoning || props.message.reasoning.length === 0) return false
  // For streaming messages with reasoningDuration, check threshold
  if (props.message.reasoningDuration !== undefined) {
    return props.message.reasoningDuration >= REASONING_THRESHOLD_MS
  }
  // For history messages without reasoningDuration, default to show
  return true
})

function handleInspect(id: string) {
  emit('inspect', id)
}
</script>

<template>
  <div class="message-assistant mb-4">
    <div
      data-testid="assistant-bubble"
      class="max-w-[80%]"
    >
      <!-- Response time -->
      <div v-if="formattedDuration" class="response-time mb-2 text-xs text-text-muted">
        <span class="inline-flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ formattedDuration }}
        </span>
      </div>

      <!-- reasoning -->
      <ReasoningBlock v-if="showReasoning" :content="message.reasoning!" />

      <!-- 纯文本内容 -->
      <div v-if="textContent" class="whitespace-pre-wrap mb-2 text-sm leading-relaxed">{{ textContent }}</div>

      <!-- tool calls -->
      <div v-if="message.toolCalls?.length" class="space-y-0.5">
        <ToolRenderer
          v-for="tc in message.toolCalls"
          :key="tc.id"
          :tool="tc"
          @inspect="handleInspect"
          @open-file="(tool) => emit('openFile', tool)"
        />
      </div>

      <!-- 代码块 -->
      <div v-if="codeBlocks.length">
        <CodeBlock v-for="(block, i) in codeBlocks" :key="i" :code="block.code" :lang="block.lang" />
      </div>
    </div>
  </div>
</template>