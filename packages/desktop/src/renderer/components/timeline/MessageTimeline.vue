<script setup lang="ts">
/**
 * MessageTimeline - Adapter for history messages.
 *
 * Converts Message → TimelineNode[] using same grouping logic as streaming.
 * Preserves MessageAssistant features: duration display, reasoning threshold.
 */
import { computed } from 'vue'
import type { Message, ToolCall } from '../../../types/ipc'
import type { TimelineNode } from '../../stores/streaming/selectors'
import { getToolCategory } from '../../tool/registry'
import TimelineRenderer from './TimelineRenderer.vue'
import MessageError from '../part/MessageError.vue'

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

  const content = props.message.content || ''
  if (content.trim()) {
    nodes.push({
      id: 'text',
      type: 'text',
      order: order++,
      payload: { content }
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

    <MessageError v-if="message.error && message.error.type !== 'MessageAbortedError'" :error="message.error" />

    <div v-if="message.error?.type === 'MessageAbortedError'" class="message-interrupted text-xs text-error mt-2">
      手动中断
    </div>
  </div>
</template>