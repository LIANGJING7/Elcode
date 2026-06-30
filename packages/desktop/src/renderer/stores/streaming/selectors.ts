/**
 * Streaming State Selectors
 * 
 * Computed properties derived from StreamingState.
 * All derived data (sorting, duration, summary) computed here, not stored in state.
 */

import { computed, type ComputedRef } from 'vue'
import type { StreamingState, StreamingToolCall, ToolProgress } from './types'
import { formatDuration, parseToolArgs } from './types'

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
    return state.reasoning.content.length > 100 || state.reasoning.pending.length > 0
  })
}

// ============================================
// Message Selectors
// ============================================

/**
 * Check if message has content (content or pending)
 */
export function hasMessageContent(state: StreamingState): ComputedRef<boolean> {
  return computed(() => {
    return state.message.content.length > 0 || state.message.pending.length > 0
  })
}

/**
 * Get displayed message content (content + pending deltas)
 * Note: This is for display only, state.message.content is updated by scheduler
 */
export function displayedMessageContent(state: StreamingState): ComputedRef<string> {
  return computed(() => {
    return state.message.content + state.message.pending.join('')
  })
}

/**
 * Get displayed reasoning content
 */
export function displayedReasoningContent(state: StreamingState): ComputedRef<string> {
  return computed(() => {
    return state.reasoning.content + state.reasoning.pending.join('')
  })
}

// ============================================
// Timeline Selector
// ============================================

export interface TimelineNode {
  id: string
  type: 'reasoning' | 'tool' | 'text'
  order: number
  payload: StreamingToolCall | { content: string; status: string } | { content: string }
}

/**
 * Build timeline nodes from state (ordered by occurrence)
 */
export function timelineNodes(state: StreamingState): ComputedRef<TimelineNode[]> {
  return computed(() => {
    const nodes: TimelineNode[] = []
    let order = 0

    // Add reasoning if thinking/done
    if (state.reasoning.status !== 'idle') {
      nodes.push({
        id: state.reasoning.id ?? 'reasoning',
        type: 'reasoning',
        order: order++,
        payload: {
          content: state.reasoning.content + state.reasoning.pending.join(''),
          status: state.reasoning.status
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
    if (state.message.content || state.message.pending.length > 0) {
      nodes.push({
        id: state.message.id ?? 'text',
        type: 'text',
        order: order++,
        payload: {
          content: state.message.content + state.message.pending.join('')
        }
      })
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
    default:
      return { name, summary: name, detail: null }
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
  timelineNodes
}