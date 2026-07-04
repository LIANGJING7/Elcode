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
}>()

const meta = computed(() => getToolMeta(props.tool.name))

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
  const output = props.tool.output?.structured as any
  return {
    summary: meta.value.summary(props.tool),
    status: props.tool.status,
    sessionId: output?.sessionId,
    currentTool: output?.currentTool,
    toolcalls: output?.toolcalls,
    duration: props.tool.duration,
    error: props.tool.error
  }
})

const genericProps = computed(() => ({ tool: props.tool }))
</script>

<template>
  <InlineTool v-if="meta.display === 'inline'" v-bind="inlineProps" @click="emit('openFile', tool)" />
  <BlockTool v-else-if="meta.display === 'block'" v-bind="blockProps" @click="emit('openFile', tool)" />
  <SubagentTool v-else-if="meta.display === 'subagent'" v-bind="subagentProps" @navigate="emit('navigateSession', $event)" />
  <GenericTool v-else v-bind="genericProps" />
</template>