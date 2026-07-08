<script setup lang="ts">
/**
 * MessageTimeline - Adapter for history messages.
 *
 * Converts Message → TimelineNode[] using same grouping logic as streaming.
 * Preserves MessageAssistant features: duration display, reasoning threshold, code extraction.
 */
import { computed } from 'vue'
import type { Message, ToolCall } from '../../../types/ipc'
import type { TimelineNode } from '../../stores/streaming/selectors'
import { getToolCategory } from '../../tool/registry'
import TimelineRenderer from './TimelineRenderer.vue'
import ReasoningBlock from '../chat/ReasoningBlock.vue'
import CodeBlock from '../chat/CodeBlock.vue'

const props = defineProps<{ message: Message }>()
const emit = defineEmits<{
  openFile: [tool: ToolCall]
  openOriginalFile: [{ filePath: string; diff: string }]
  openDiffFile: [string]
  openSubagentPanel: [sessionId: string]  // New
}>()

const REASONING_THRESHOLD_MS = 3000

function handleOpenSubagentPanel(sessionId: string) {
  console.log('[MessageTimeline] handleOpenSubagentPanel:', sessionId)
  emit('openSubagentPanel', sessionId)
}

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

const showReasoning = computed(() => {
  if (!props.message.reasoning || props.message.reasoning.length === 0) return false
  if (props.message.reasoningDuration !== undefined) {
    return props.message.reasoningDuration >= REASONING_THRESHOLD_MS
  }
  return true
})

const codeBlocks = computed(() => {
  const content = props.message.content || ''
  const matches = content.matchAll(/```(\w+)\n([\s\S]*?)```/g)
  return Array.from(matches, (m) => ({ lang: m[1], code: m[2].trim() }))
})

const textContent = computed(() => {
  const content = props.message.content || ''
  return content.replace(/```(\w+)\n([\s\S]*?)```/g, '').trim()
})

const timelineNodes = computed(() => {
  const nodes: TimelineNode[] = []
  let order = 0

  if (showReasoning.value) {
    nodes.push({
      id: 'reasoning',
      type: 'reasoning',
      order: order++,
      payload: {
        content: props.message.reasoning!,
        status: 'done',
        duration: null
      }
    })
  }

  const toolNodes = buildGroupedToolNodes(props.message.toolCalls || [])
  for (const node of toolNodes) {
    nodes.push({ ...node, order: order++ })
  }

  if (textContent.value) {
    nodes.push({
      id: 'text',
      type: 'text',
      order: order++,
      payload: { content: textContent.value }
    })
  }

  return nodes
})

function buildGroupedToolNodes(tools: ToolCall[]): TimelineNode[] {
  const nodes: TimelineNode[] = []
  let order = 0
  let queryGroup: ToolCall[] = []

  for (const tool of tools) {
    const category = getToolCategory(tool.name)
    if (category === 'query') {
      queryGroup.push(tool)
    } else {
      if (queryGroup.length > 0) {
        nodes.push({
          id: `query-group-${order}`,
          type: 'queryGroup',
          order: order++,
          payload: [...queryGroup] as ToolCall[]
        })
        queryGroup = []
      }
      nodes.push({
        id: tool.id,
        type: 'tool',
        order: order++,
        payload: tool
      })
    }
  }

  if (queryGroup.length > 0) {
    nodes.push({
      id: `query-group-${order}`,
      type: 'queryGroup',
      order: order++,
      payload: [...queryGroup] as ToolCall[]
    })
  }

  return nodes
}
</script>

<template>
  <div class="message-timeline">
    <div v-if="formattedDuration" class="response-time mb-2 text-xs text-text-muted">
      <span class="inline-flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ formattedDuration }}
      </span>
    </div>

    <TimelineRenderer
      :nodes="timelineNodes"
      @open-file="emit('openFile', $event)"
      @open-original-file="emit('openOriginalFile', $event)"
      @open-diff-file="emit('openDiffFile', $event)"
      @open-subagent-panel="handleOpenSubagentPanel($event)"
    />

    <div v-if="codeBlocks.length" class="mt-2">
      <CodeBlock v-for="(block, i) in codeBlocks" :key="i" :code="block.code" :lang="block.lang" />
    </div>
  </div>
</template>