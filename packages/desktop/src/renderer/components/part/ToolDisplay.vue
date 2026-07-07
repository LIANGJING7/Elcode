<script setup lang="ts">
/**
 * ToolDisplay — routes to Inline/Block/Subagent based on meta.display.
 * Does NOT know any tool names. Only knows display modes.
 */
import { computed } from 'vue'
import { getToolMeta } from '../../tool/registry-new'
import '../../tool/builtins' // Activate registrations
import InlineTool from './InlineTool.vue'
import BlockTool from './BlockTool.vue'
import SubagentTool from './SubagentTool.vue'
import GenericTool from './GenericTool.vue'
import type { ToolCall } from '../../../types/ipc'

const props = defineProps<{ tool: ToolCall }>()
const emit = defineEmits<{
  openFile: [tool: ToolCall]
  navigateSession: [sessionId: string]
  openSubagentPanel: [sessionId: string]  // New
}>()

const meta = computed(() => {
  const toolMeta = getToolMeta(props.tool?.name ?? '')
  console.log('[ToolDisplay] Tool name:', props.tool?.name)
  console.log('[ToolDisplay] Tool meta display:', toolMeta.display)
  return toolMeta
})

const inlineProps = computed(() => ({
  icon: meta.value.icon,
  summary: meta.value.summary(props.tool),
  pending: meta.value.pending,
  status: props.tool.status,
  error: props.tool.error
}))

const blockProps = computed(() => ({
  title: meta.value.title(props.tool),
  body: meta.value.detail(props.tool),
  status: props.tool.status,
  error: props.tool.error
}))

const subagentProps = computed(() => {
  console.log('[ToolDisplay] Computing subagentProps for tool:', props.tool.name)
  
  // Try structured field first
  let structured = props.tool.output?.structured as any
  console.log('[ToolDisplay] tool.output?.structured:', structured)
  
  // If structured is undefined, try parsing output.result
  if (!structured && props.tool.output?.result) {
    try {
      const result = props.tool.output.result
      console.log('[ToolDisplay] tool.output.result:', result, 'type:', typeof result)
      if (typeof result === 'string') {
        const parsed = JSON.parse(result)
        structured = parsed?.structured
        console.log('[ToolDisplay] parsed.result.structured:', structured)
      } else if (typeof result === 'object') {
        structured = result?.structured
        console.log('[ToolDisplay] result.structured:', structured)
      }
    } catch (e) {
      console.warn('[ToolDisplay] Failed to parse output.result:', e)
    }
  }
  
  console.log('[ToolDisplay] Final structured:', structured)
  console.log('[ToolDisplay] sessionId from structured:', structured?.sessionId)
  console.log('[ToolDisplay] sessionID from structured:', structured?.sessionID)
  
  // Handle both sessionId and sessionID (field name inconsistency)
  const sessionId = structured?.sessionId ?? structured?.sessionID
  
  const propsData = {
    summary: meta.value.summary(props.tool),
    status: props.tool.status,
    sessionId: sessionId,
    currentTool: structured?.currentTool,
    toolcalls: structured?.toolCalls,
    duration: props.tool.duration,
    error: props.tool.error
  }
  console.log('[ToolDisplay] subagentProps:', propsData)
  return propsData
})

const genericProps = computed(() => ({ tool: props.tool }))

// Handle SubagentTool events
function handleNavigate(sessionId: string) {
  console.log('[ToolDisplay] handleNavigate:', sessionId)
  emit('navigateSession', sessionId)
}

function handleOpenPanel() {
  console.log('[ToolDisplay] handleOpenPanel triggered, sessionId:', subagentProps.value.sessionId)
  if (subagentProps.value.sessionId) {
    console.log('[ToolDisplay] Emitting openSubagentPanel')
    emit('openSubagentPanel', subagentProps.value.sessionId)
  } else {
    console.log('[ToolDisplay] No sessionId in subagentProps')
  }
}
</script>

<template>
  <template v-if="tool && meta">
    <InlineTool v-if="meta.display === 'inline'" v-bind="inlineProps" />
    <BlockTool v-else-if="meta.display === 'block'" v-bind="blockProps" />
    <SubagentTool 
      v-else-if="meta.display === 'subagent'" 
      v-bind="subagentProps" 
      @navigate="handleNavigate"
      @open-panel="handleOpenPanel"
    />
    <GenericTool v-else v-bind="genericProps" />
  </template>
</template>