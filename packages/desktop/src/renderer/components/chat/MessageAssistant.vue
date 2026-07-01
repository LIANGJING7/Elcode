<script setup lang="ts">
import { computed } from 'vue'
import type { Message, ToolCall } from '../../../types/ipc'
import ToolRenderer from '../tool/ToolRenderer.vue'
import ReasoningBlock from './ReasoningBlock.vue'
import CodeBlock from './CodeBlock.vue'

const props = defineProps<{ message: Message }>()
const emit = defineEmits<{ inspect: [id: string]; openFile: [tool: ToolCall] }>()

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
      <!-- reasoning -->
      <ReasoningBlock v-if="message.reasoning" :content="message.reasoning" />

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