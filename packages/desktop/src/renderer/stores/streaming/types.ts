/**
 * Streaming Store Types
 * 
 * Based on design doc: docs/superpowers/specs/2026-06-29-desktop-chat-streaming-design.md
 */

import type { ToolCall, ToolOutput } from '../../../types/ipc'

// ============================================
// Core State Types
// ============================================

export interface StreamingState {
  /** Stream version - prevents stale events from polluting new session */
  version: number
  /** Overall streaming status */
  status: StreamingStatus
  /** Message content state */
  message: MessageState
  /** Reasoning/thinking state */
  reasoning: ReasoningState
  /** Tool calls state */
  tools: ToolStore
  /** Pending deltas for message.part events - keyed by partId */
  pendingDeltas: Map<string, string[]>
  /** Completed reasoning blocks from previous steps */
  reasoningHistory: ReasoningBlock[]
  /** Stream start timestamp (optional, set when streaming starts) */
  startedAt?: number
}

/** Completed reasoning block from a previous step */
export interface ReasoningBlock {
  id: string
  content: string
  startedAt: number
  endedAt: number
}

export type StreamingStatus = 'idle' | 'streaming' | 'done' | 'error'

export interface MessageState {
  /** Message ID from backend */
  id: string | null
  /** Rendered content - direct append from deltas */
  content: string
}

export interface ReasoningState {
  /** Reasoning ID from backend */
  id: string | null
  /** Reasoning status */
  status: 'idle' | 'thinking' | 'done'
  /** Raw reasoning content - direct append from deltas */
  content: string
  /** Start timestamp */
  startedAt: number | null
  /** End timestamp */
  endedAt: number | null
}

export interface ToolStore {
  /** Tools indexed by callID - no orderedIds, sorting done by selector */
  entities: Map<string, StreamingToolCall>
}

// ============================================
// Tool Call Types
// ============================================

export interface StreamingToolCall {
  /** Unique call ID from backend */
  id: string
  /** Tool name (e.g., 'read', 'bash', 'grep') */
  name: string
  /** Current lifecycle state */
  lifecycle: ToolLifecycle
  
  /** Raw JSON input string */
  rawInput: string
  /** Raw output (may be JSON string or plain text) */
  rawOutput: string | null
  
  /** Progress events (stdout, structured content) */
  progress: ToolProgress[]
  
  /** Error message if failed */
  error: string | null
  
  /** Start timestamp */
  startedAt: number
  /** End timestamp */
  endedAt: number | null
  
  /** UI state - expanded/collapsed (managed by Container component) */
  expanded: boolean
}

export type ToolLifecycle =
  | 'preparing'   // Tool input streaming (tool.input.started -> tool.input.ended)
  | 'waiting'     // Waiting for user approval (if needed)
  | 'running'     // Tool execution started (tool.called)
  | 'streaming'   // Tool with output stream (tool.progress events)
  | 'completed'   // Tool finished successfully (tool.success)
  | 'failed'      // Tool failed (tool.failed)
  | 'cancelled'   // Tool cancelled (interrupted)

export interface ToolProgress {
  /** Progress type from backend */
  type: string
  /** Progress message/content */
  message: string
  /** Optional percentage (0-100) */
  percent?: number
  /** Timestamp */
  timestamp: number
}

// ============================================
// Action Types
// ============================================

export type StreamAction =
  // Lifecycle
  | { type: 'STREAM_RESET'; version: number }
  | { type: 'STREAM_START'; messageId: string; version: number }
  | { type: 'STREAM_DONE'; version: number }
  | { type: 'STEP_ENDED'; version: number }
  | { type: 'STEP_FAILED'; error: string; version: number }
  
  // Text
  | { type: 'TEXT_STARTED'; textId: string; messageId: string; version: number }
  | { type: 'TEXT_DELTA'; delta: string; messageId: string; version: number }
  | { type: 'TEXT_ENDED'; text: string; textId: string; messageId: string; version: number }
  
  // Reasoning
  | { type: 'REASONING_STARTED'; reasoningId: string; messageId: string; version: number }
  | { type: 'REASONING_DELTA'; delta: string; messageId: string; version: number }
  | { type: 'REASONING_ENDED'; text: string; reasoningId: string; messageId: string; version: number }
  
  // Pending Delta (waiting for partType from message.part.updated)
  | { type: 'PENDING_DELTA'; partId: string; delta: string; messageId: string; version: number }
  
  // Tool Input
  | { type: 'TOOL_INPUT_STARTED'; callId: string; name: string; messageId: string; version: number }
  | { type: 'TOOL_INPUT_DELTA'; callId: string; delta: string; version: number }
  | { type: 'TOOL_INPUT_ENDED'; callId: string; text: string; version: number }
  
  // Tool Execution
  | { type: 'TOOL_CALLED'; callId: string; input: Record<string, unknown>; messageId: string; version: number }
  | { type: 'TOOL_PROGRESS'; callId: string; content: unknown[]; version: number }
  | { type: 'TOOL_SUCCESS'; callId: string; output: unknown; version: number }
  | { type: 'TOOL_FAILED'; callId: string; error: { type: string; message: string }; version: number }

// ============================================
// Helper Functions
// ============================================

/** Create initial streaming state */
export function createInitialState(version: number = 0): StreamingState {
  return {
    version,
    status: 'idle',
    message: {
      id: null,
      content: '',
    },
    reasoning: {
      id: null,
      status: 'idle',
      content: '',
      startedAt: null,
      endedAt: null
    },
    tools: {
      // Note: Map needs special handling for Vue reactivity
      // It will be wrapped in reactive() in the store
      entities: new Map()
    },
    // Pending deltas for V1 message.part events - still needed
    pendingDeltas: new Map(),
    // Completed reasoning blocks from previous steps
    reasoningHistory: []
  }
}

/** Map ToolLifecycle to display status (for compatibility with existing ToolCall type) */
export function mapLifecycleToStatus(lifecycle: ToolLifecycle): 'pending' | 'running' | 'completed' | 'error' {
  switch (lifecycle) {
    case 'preparing':
    case 'waiting':
      return 'pending'
    case 'running':
    case 'streaming':
      return 'running'
    case 'completed':
      return 'completed'
    case 'failed':
    case 'cancelled':
      return 'error'
    default:
      return 'pending'
  }
}

/** Safely parse JSON, return empty object on failure */
export function parseToolArgs(rawInput: string): Record<string, unknown> {
  if (!rawInput) return {}
  try {
    return JSON.parse(rawInput) as Record<string, unknown>
  } catch {
    return { raw: rawInput }
  }
}

/** Format duration in human-readable format */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

/** Convert StreamingToolCall to ToolCall (for compatibility with presentation layer) */
export function streamingToolToToolCall(tool: StreamingToolCall): ToolCall {
  const args = parseToolArgs(tool.rawInput)
  const output: ToolOutput = {}
  
  if (tool.rawOutput) {
    try {
      const parsedOutput = JSON.parse(tool.rawOutput)
      console.log('[streamingToolToToolCall] tool:', tool.name, 'rawOutput parsed:', JSON.stringify(parsedOutput).slice(0, 500))
      console.log('[streamingToolToToolCall] parsedOutput.structured:', JSON.stringify(parsedOutput?.structured).slice(0, 300))
      output.result = parsedOutput
      output.structured = parsedOutput?.structured ?? { type: 'unknown' }
      output.content = parsedOutput?.content ?? undefined
    } catch {
      output.result = tool.rawOutput
    }
  }
  
  if (tool.progress && tool.progress.length > 0) {
    const content = tool.progress
      .filter(p => p.type === 'text')
      .map(p => ({ type: 'text' as const, text: p.message }))
    if (content.length > 0) {
      output.content = content
    }
  }
  
  if (tool.error && !output.result) {
    output.result = { error: tool.error }
  }
  
  return {
    id: tool.id,
    name: tool.name,
    status: mapLifecycleToStatus(tool.lifecycle),
    args,
    output: output.result || output.content || output.structured ? output : undefined,
    error: tool.error ?? undefined,
    duration: tool.endedAt && tool.startedAt ? tool.endedAt - tool.startedAt : undefined,
  }
}