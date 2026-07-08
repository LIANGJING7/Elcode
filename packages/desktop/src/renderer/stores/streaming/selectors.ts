/**
 * Streaming State Selectors
 * 
 * Computed properties derived from StreamingState.
 * All derived data (sorting, duration, summary) computed here, not stored in state.
 */

import { computed, type ComputedRef } from 'vue'
import type { StreamingState, StreamingToolCall, ToolProgress } from './types'
import { formatDuration, parseToolArgs } from './types'
import { getToolCategory } from '../../tool/registry'

// ============================================
// Tool Summary Types
// ============================================

export interface ToolSummary {
  /** Tool display name (plain, no emoji) */
  name: string
  /** Primary summary text (bold in UI) */
  summary: string
  /** Optional gray detail text (right side) */
  detail: string | null
}

/** Extract domain from URL for web_fetch summary */
function extractDomain(url: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

// ============================================
// Tool Selectors
// ============================================

/**
 * Get tools ordered by startedAt timestamp
 */
export function orderedTools(state: StreamingState): ComputedRef<StreamingToolCall[]> {
  return computed(() => {
    return Array.from(state.tools.entities.values())
      .sort((a, b) => a.startedAt - b.startedAt)
  })
}

/**
 * Get tool count
 */
export function toolCount(state: StreamingState): ComputedRef<number> {
  return computed(() => state.tools.entities.size)
}

/**
 * Check if there are any running tools
 */
export function hasRunningTools(state: StreamingState): ComputedRef<boolean> {
  return computed(() => {
    for (const tool of state.tools.entities.values()) {
      if (tool.lifecycle === 'running' || tool.lifecycle === 'streaming') {
        return true
      }
    }
    return false
  })
}

/**
 * Get tool duration (null if not ended)
 */
export function toolDuration(tool: StreamingToolCall): ComputedRef<string | null> {
  return computed(() => {
    if (!tool.endedAt) return null
    return formatDuration(tool.endedAt - tool.startedAt)
  })
}

/**
 * Get tool running duration (current, even if not ended)
 */
export function toolRunningDuration(tool: StreamingToolCall): ComputedRef<string | null> {
  return computed(() => {
    if (tool.lifecycle !== 'running' && tool.lifecycle !== 'streaming') return null
    return formatDuration(Date.now() - tool.startedAt)
  })
}

/**
 * Get latest progress message for streaming tool
 */
export function toolLatestProgress(tool: StreamingToolCall): ComputedRef<string | null> {
  return computed(() => {
    if (tool.progress.length === 0) return null
    const latest = tool.progress[tool.progress.length - 1]
    return latest.message
  })
}

/**
 * Get tool summary as structured ToolSummary object
 */
export function toolSummary(tool: StreamingToolCall): ComputedRef<ToolSummary> {
  return computed(() => {
    const args = parseToolArgs(tool.rawInput)
    return formatToolSummary(tool.name, args)
  })
}

/**
 * Get tool status icon
 */
export function toolStatusIcon(tool: StreamingToolCall): ComputedRef<string> {
  return computed(() => {
    switch (tool.lifecycle) {
      case 'preparing': return '○'
      case 'waiting': return '○'
      case 'running': return '●'
      case 'streaming': return '●'
      case 'completed': return '✓'
      case 'failed': return '✗'
      case 'cancelled': return '○'
      default: return '○'
    }
  })
}

/**
 * Get tool border class based on lifecycle
 */
export function toolBorderClass(tool: StreamingToolCall): ComputedRef<string> {
  return computed(() => {
    switch (tool.lifecycle) {
      case 'preparing': return 'border-muted'
      case 'waiting': return 'border-warning'
      case 'running': return 'border-warning'
      case 'streaming': return 'border-warning'
      case 'completed': return 'border-success'
      case 'failed': return 'border-error'
      case 'cancelled': return 'border-muted'
      default: return 'border-muted'
    }
  })
}

// ============================================
// Reasoning Selectors
// ============================================

/**
 * Get reasoning duration
 */
export function reasoningDuration(state: StreamingState): ComputedRef<string | null> {
  return computed(() => {
    const { startedAt, endedAt } = state.reasoning
    if (!startedAt) return null
    const end = endedAt ?? Date.now()
    return formatDuration(end - startedAt)
  })
}

/**
 * Check if reasoning should be expandable (> 100 chars)
 */
export function reasoningExpandable(state: StreamingState): ComputedRef<boolean> {
  return computed(() => {
    return state.reasoning.content.length > 100
  })
}

// ============================================
// Message Selectors
// ============================================

/**
 * Check if message has content
 */
export function hasMessageContent(state: StreamingState): ComputedRef<boolean> {
  return computed(() => {
    return state.message.content.length > 0
  })
}

/**
 * Get displayed message content
 * Note: Directly appended to content, no pending buffer
 */
export function displayedMessageContent(state: StreamingState): ComputedRef<string> {
  return computed(() => {
    return state.message.content
  })
}

/**
 * Get displayed reasoning content
 * Note: Directly appended to content, no pending buffer
 */
export function displayedReasoningContent(state: StreamingState): ComputedRef<string> {
  return computed(() => {
    return state.reasoning.content
  })
}

// ============================================
// Timeline Selector
// ============================================

export interface TimelineNode {
  id: string
  type: 'reasoning' | 'tool' | 'text' | 'queryGroup'
  order: number
  payload: StreamingToolCall | StreamingToolCall[] | { content: string; status: 'idle' | 'thinking' | 'done'; duration: string | null } | { content: string }
}

/**
 * Build timeline nodes from state (ordered by occurrence)
 */
export function timelineNodes(state: StreamingState): ComputedRef<TimelineNode[]> {
  return computed(() => {
    const nodes: TimelineNode[] = []
    let order = 0

    // Merge all reasoning blocks into one node at the top
    const allReasoning: Array<{
      id: string
      content: string
      status: 'idle' | 'thinking' | 'done'
      startedAt: number
      endedAt: number | null
    }> = []

    // Add completed reasoning blocks from previous steps
    for (const block of state.reasoningHistory) {
      allReasoning.push({
        id: block.id,
        content: block.content,
        status: 'done',
        startedAt: block.startedAt,
        endedAt: block.endedAt
      })
    }

    // Add current reasoning if thinking/done
    if (state.reasoning.status !== 'idle') {
      allReasoning.push({
        id: state.reasoning.id ?? 'current-reasoning',
        content: state.reasoning.content,
        status: state.reasoning.status,
        startedAt: state.reasoning.startedAt ?? Date.now(),
        endedAt: state.reasoning.endedAt
      })
    }

    // If there's any reasoning, merge and add as first node
    if (allReasoning.length > 0) {
      // Merge content directly without separators
      const mergedContent = allReasoning.map(r => r.content).join('')

      // Status: if any is thinking, show thinking; otherwise done
      const mergedStatus = allReasoning.some(r => r.status === 'thinking')
        ? 'thinking'
        : 'done'

      // Calculate total duration
      let totalDuration = 0
      for (const r of allReasoning) {
        if (r.startedAt && r.endedAt) {
          totalDuration += r.endedAt - r.startedAt
        } else if (r.startedAt && r.status === 'thinking') {
          totalDuration += Date.now() - r.startedAt
        }
      }

      nodes.push({
        id: 'merged-reasoning',
        type: 'reasoning',
        order: order++,
        payload: {
          content: mergedContent,
          status: mergedStatus,
          duration: totalDuration > 0 ? formatDuration(totalDuration) : null
        }
      })
    }

    // Add tools in order
    const tools = Array.from(state.tools.entities.values())
      .sort((a, b) => a.startedAt - b.startedAt)

    for (const tool of tools) {
      nodes.push({
        id: tool.id,
        type: 'tool',
        order: order++,
        payload: tool
      })
    }

    // Add text if has content
    if (state.message.content) {
      nodes.push({
        id: state.message.id ?? 'text',
        type: 'text',
        order: order++,
        payload: {
          content: state.message.content
        }
      })
    }

    return nodes
  })
}

/**
 * Build grouped tool nodes from state (consecutive query tools grouped).
 * Query tools (read/grep/glob/web_*) are grouped into 'queryGroup' nodes.
 * Execution tools (bash/edit/write/todo/task) remain as individual 'tool' nodes.
 * Tools with lifecycle 'preparing' are NOT grouped (still pending).
 */
export function groupedToolNodes(state: StreamingState): ComputedRef<TimelineNode[]> {
  return computed(() => {
    const nodes: TimelineNode[] = []
    let order = 0

    const tools = Array.from(state.tools.entities.values())
      .sort((a, b) => a.startedAt - b.startedAt)

    let queryGroup: StreamingToolCall[] = []

    for (const tool of tools) {
      const category = getToolCategory(tool.name)
      const isPreparing = tool.lifecycle === 'preparing' || tool.lifecycle === 'waiting'

      if (category === 'query' && !isPreparing) {
        queryGroup.push(tool)
      } else {
        if (queryGroup.length > 0) {
          nodes.push({
            id: `query-group-${order}`,
            type: 'queryGroup',
            order: order++,
            payload: [...queryGroup],
          })
          queryGroup = []
        }
        nodes.push({
          id: tool.id,
          type: 'tool',
          order: order++,
          payload: tool,
        })
      }
    }

    if (queryGroup.length > 0) {
      nodes.push({
        id: `query-group-${order}`,
        type: 'queryGroup',
        order: order++,
        payload: [...queryGroup],
      })
    }

    return nodes
  })
}

/**
 * Build text node from state (separate selector for performance).
 */
export function textNode(state: StreamingState): ComputedRef<TimelineNode | null> {
  return computed(() => {
    if (!state.message.content) return null
    return {
      id: state.message.id ?? 'text',
      type: 'text',
      order: 0,
      payload: {
        content: state.message.content
      }
    }
  })
}

/**
 * Build reasoning node from state (separate selector for performance).
 */
export function reasoningNode(state: StreamingState): ComputedRef<TimelineNode | null> {
  return computed(() => {
    const allReasoning: Array<{
      id: string
      content: string
      status: 'idle' | 'thinking' | 'done'
      startedAt: number
      endedAt: number | null
    }> = []

    for (const block of state.reasoningHistory) {
      allReasoning.push({
        id: block.id,
        content: block.content,
        status: 'done',
        startedAt: block.startedAt,
        endedAt: block.endedAt
      })
    }

    if (state.reasoning.status !== 'idle') {
      allReasoning.push({
        id: state.reasoning.id ?? 'current-reasoning',
        content: state.reasoning.content,
        status: state.reasoning.status,
        startedAt: state.reasoning.startedAt ?? Date.now(),
        endedAt: state.reasoning.endedAt
      })
    }

    if (allReasoning.length === 0) return null

    const mergedContent = allReasoning.map(r => r.content).join('')
    const mergedStatus = allReasoning.some(r => r.status === 'thinking') ? 'thinking' : 'done'

    let totalDuration = 0
    for (const r of allReasoning) {
      if (r.startedAt && r.endedAt) {
        totalDuration += r.endedAt - r.startedAt
      } else if (r.startedAt && r.status === 'thinking') {
        totalDuration += Date.now() - r.startedAt
      }
    }

    return {
      id: 'merged-reasoning',
      type: 'reasoning',
      order: 0,
      payload: {
        content: mergedContent,
        status: mergedStatus,
        duration: totalDuration > 0 ? formatDuration(totalDuration) : null
      }
    }
  })
}

/**
 * Build complete grouped timeline (reasoning + grouped tools + text).
 * Uses split selectors for performance (only recomputes relevant parts).
 */
export function groupedTimelineNodes(state: StreamingState): ComputedRef<TimelineNode[]> {
  return computed(() => {
    const nodes: TimelineNode[] = []
    let order = 0

    const reasoning = reasoningNode(state).value
    if (reasoning) {
      nodes.push({ ...reasoning, order: order++ })
    }

    const toolNodes = groupedToolNodes(state).value
    for (const node of toolNodes) {
      nodes.push({ ...node, order: order++ })
    }

    const text = textNode(state).value
    if (text) {
      nodes.push({ ...text, order: order++ })
    }

    return nodes
  })
}

// ============================================
// Tool Summary Formatter
// ============================================

/**
 * Format tool summary based on tool name and args
 */
function formatToolSummary(name: string, args: Record<string, unknown>): ToolSummary {
  const truncate = (str: string, maxLen: number = 50): string => {
    if (!str) return ''
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
  }

  // Helper: find first string value from args
  const firstString = (): string => {
    const priorityKeys = [
      'path', 'filePath', 'file',
      'command', 'cmd',
      'pattern',
      'query',
      'url',
      'description',
      'skill', 'name',
      'prompt', 'message',
    ]
    for (const key of priorityKeys) {
      if (typeof args[key] === 'string' && String(args[key]).length > 0) {
        return String(args[key])
      }
    }
    for (const val of Object.values(args)) {
      if (typeof val === 'string' && val.length > 0) return val
    }
    return ''
  }

  // Clean up display name: "codegraph_codegraph_files" → "codegraph_files"
  const cleanName = (n: string): string => {
    const parts = n.split('_')
    if (parts.length >= 2 && parts[0] === parts[1]) {
      return parts.slice(1).join('_')
    }
    return n
  }

  switch (name) {
    case 'read':
      return { name: 'read', summary: truncate(String(args.filePath ?? args.path ?? '')), detail: null }
    case 'write':
      return { name: 'write', summary: truncate(String(args.filePath ?? args.path ?? '')), detail: null }
    case 'edit':
      return { name: 'edit', summary: truncate(String(args.filePath ?? args.path ?? '')), detail: null }
    case 'bash':
    case 'shell':
      return { name: 'bash', summary: truncate(String(args.command ?? ''), 50), detail: null }
    case 'grep':
      return { name: 'grep', summary: `"${truncate(String(args.pattern ?? ''))}"`, detail: null }
    case 'glob':
      return { name: 'glob', summary: truncate(String(args.pattern ?? '')), detail: null }
    case 'web_search':
      return { name: 'search', summary: truncate(String(args.query ?? '')), detail: null }
    case 'web_fetch':
      return { name: 'fetch', summary: extractDomain(String(args.url ?? '')), detail: null }
    case 'task':
      return { name: 'task', summary: truncate(String(args.description ?? ''), 40), detail: null }
    case 'todo_write':
      return { name: 'todo', summary: 'Update todo list', detail: null }
    case 'skill':
      return { name: 'skill', summary: truncate(String(args.skill ?? args.name ?? '')), detail: null }
    // MCP / codegraph tools
    case 'codegraph_codegraph_files':
    case 'codegraph_files':
      return { name: 'files', summary: truncate(String(args.pattern ?? args.path ?? '')), detail: null }
    case 'codegraph_codegraph_search':
    case 'codegraph_search':
      return { name: 'search', summary: truncate(String(args.query ?? '')), detail: null }
    case 'codegraph_codegraph_explore':
    case 'codegraph_explore':
      return { name: 'explore', summary: truncate(String(args.query ?? '')), detail: null }
    case 'codegraph_codegraph_context':
    case 'codegraph_context':
      return { name: 'context', summary: truncate(String(args.task ?? args.query ?? '')), detail: null }
    case 'codegraph_codegraph_callers':
    case 'codegraph_callers':
      return { name: 'callers', summary: truncate(String(args.symbol ?? '')), detail: null }
    case 'codegraph_codegraph_callees':
    case 'codegraph_callees':
      return { name: 'callees', summary: truncate(String(args.symbol ?? '')), detail: null }
    case 'codegraph_codegraph_node':
    case 'codegraph_node':
      return { name: 'node', summary: truncate(String(args.symbol ?? '')), detail: null }
    case 'codegraph_codegraph_impact':
    case 'codegraph_impact':
      return { name: 'impact', summary: truncate(String(args.symbol ?? '')), detail: null }
    case 'codegraph_codegraph_trace':
    case 'codegraph_trace':
      return { name: 'trace', summary: truncate(String(args.from ?? '')), detail: args.to ? `→ ${truncate(String(args.to))}` : null }
    case 'codegraph_codegraph_status':
    case 'codegraph_status':
      return { name: 'status', summary: '', detail: null }
    // Generic fallback: show tool name, try to find a summary from args
    default: {
      const summary = firstString()
      return { name: cleanName(name), summary: truncate(summary), detail: null }
    }
  }
}

// ============================================
// Export all selectors as object
// ============================================

export const selectors = {
  // Tools
  orderedTools,
  toolCount,
  hasRunningTools,
  toolDuration,
  toolRunningDuration,
  toolLatestProgress,
  toolSummary,
  toolStatusIcon,
  toolBorderClass,
  
  // Reasoning
  reasoningDuration,
  reasoningExpandable,
  
  // Message
  hasMessageContent,
  displayedMessageContent,
  displayedReasoningContent,
  
  // Timeline
  timelineNodes,
  groupedToolNodes,
  textNode,
  reasoningNode,
  groupedTimelineNodes
}