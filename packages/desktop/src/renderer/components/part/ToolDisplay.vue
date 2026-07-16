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
import EditBlockTool from './EditBlockTool.vue'
import ShellTool from './ShellTool.vue'
import SubagentTool from './SubagentTool.vue'
import GenericTool from './GenericTool.vue'
import type { ToolCall } from '../../../types/ipc'
import { firstArgString, PATH_KEYS } from '../../tool/summary'

const props = defineProps<{ tool: ToolCall }>()
const emit = defineEmits<{
  openFile: [tool: ToolCall]
  openOriginalFile: [{ filePath: string; diff: string }]
  openDiffFile: [string]
  navigateSession: [sessionId: string]
  openSubagentPanel: [sessionId: string]  // New
}>()

const meta = computed(() => getToolMeta(props.tool?.name ?? ''))

const inlineProps = computed(() => ({
  icon: meta.value.icon,
  summary: meta.value.summary(props.tool),
  pending: meta.value.pending,
  status: props.tool.status,
  error: props.tool.error,
  hideStatusIcon: (meta.value as any).hideStatusIcon ?? false
}))

const blockProps = computed(() => ({
  title: meta.value.title(props.tool),
  body: meta.value.detail(props.tool),
  status: props.tool.status,
  error: props.tool.error
}))

// EditBlockTool props with extra data
const editBlockProps = computed(() => {
  const filePath = firstArgString(props.tool.args, PATH_KEYS)
  const structured = props.tool.output?.structured as any
  const editStructured = structured && structured.type === 'edit' ? structured : undefined
  
  // Try structured.diff first, then fallback to result.diff
  const resultObj = props.tool.output?.result as { diff?: string; additions?: number; deletions?: number } | undefined
  let diff = editStructured?.diff ?? resultObj?.diff ?? ''
  const additions = editStructured?.additions ?? resultObj?.additions ?? null
  const deletions = editStructured?.deletions ?? resultObj?.deletions ?? null
  
  // If no diff, generate it from oldString and newString
  if (!diff && props.tool.args.oldString && props.tool.args.newString) {
    const oldStr = String(props.tool.args.oldString)
    const newStr = String(props.tool.args.newString)
    const oldLines = oldStr.split('\n')
    const newLines = newStr.split('\n')
    
    // Simple unified diff generation
    const diffLines: string[] = [
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
      `@@ -1,${oldLines.length} +1,${newLines.length} @@`,
    ]
    
    // Simple line-by-line comparison
    const maxLen = Math.max(oldLines.length, newLines.length)
    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i]
      const newLine = newLines[i]
      if (oldLine !== newLine) {
        if (oldLine !== undefined) {
          diffLines.push(`-${oldLine}`)
        }
        if (newLine !== undefined) {
          diffLines.push(`+${newLine}`)
        }
      } else {
        diffLines.push(` ${oldLine}`)
      }
    }
    
    diff = diffLines.join('\n')
  }
  
  return {
    title: meta.value.title(props.tool),
    body: meta.value.detail(props.tool),
    filePath,
    diff,
    status: props.tool.status,
    error: props.tool.error
  }
})

const subagentProps = computed(() => {
  let structured = props.tool.output?.structured as any
  
  if (!structured && props.tool.output?.result) {
    try {
      const result = props.tool.output.result
      if (typeof result === 'string') {
        const parsed = JSON.parse(result)
        structured = parsed?.structured
      }
    } catch {}
  }
  
  const sessionId = structured?.sessionId ?? structured?.sessionID
  
  const args = props.tool.args as Record<string, unknown>
  const subagentType = String(args.subagent_type ?? args.subagentType ?? structured?.subagentType ?? 'general')
  const description = String(args.description ?? structured?.summary ?? '')
  const state = structured?.state ?? (props.tool.status === 'completed' ? 'completed' : props.tool.status === 'error' ? 'error' : 'running')
  
  return {
    subagentType,
    description,
    state,
    status: props.tool.status,
    sessionId: sessionId,
    currentTool: structured?.currentTool,
    toolcalls: structured?.toolCalls,
    duration: props.tool.duration,
    summary: meta.value.summary(props.tool),
  }
})

const genericProps = computed(() => ({ tool: props.tool }))

const shellProps = computed(() => ({ tool: props.tool }))

// Handle SubagentTool events
function handleNavigate(sessionId: string) {
  emit('navigateSession', sessionId)
}

function handleOpenPanel() {
  if (subagentProps.value.sessionId) {
    emit('openSubagentPanel', subagentProps.value.sessionId)
  }
}

// Handle EditBlockTool events
function handleOpenOriginalFile(event: { filePath: string; diff: string }) {
  emit('openOriginalFile', event)
}

function handleOpenDiffFile(filePath: string) {
  emit('openDiffFile', filePath)
}

// Check if this is an edit or write tool
const isEditTool = computed(() => props.tool?.name === 'edit' || props.tool?.name === 'edit_file' || props.tool?.name === 'write')
</script>

<template>
  <template v-if="tool && meta">
    <!-- Skip tools explicitly marked as display: 'none' -->
    <template v-if="meta.display !== 'none'">
      <InlineTool v-if="meta.display === 'inline'" v-bind="inlineProps" />
      <EditBlockTool 
        v-else-if="meta.display === 'block' && isEditTool" 
        v-bind="editBlockProps"
        @open-original-file="handleOpenOriginalFile"
        @open-diff-file="handleOpenDiffFile"
      />
      <BlockTool v-else-if="meta.display === 'block'" v-bind="blockProps" />
      <ShellTool v-else-if="meta.display === 'shell'" v-bind="shellProps" />
      <SubagentTool 
        v-else-if="meta.display === 'subagent'" 
        v-bind="subagentProps" 
        @navigate="handleNavigate"
        @open-panel="handleOpenPanel"
      />
      <GenericTool v-else v-bind="genericProps" />
    </template>
  </template>
</template>