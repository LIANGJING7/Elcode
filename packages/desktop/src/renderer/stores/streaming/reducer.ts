/**
 * Streaming State Reducer
 * 
 * Pure functions that update StreamingState based on StreamAction.
 * Only handles state mutation - no parsing, formatting, or side effects.
 */

import type {
  StreamingState,
  StreamAction,
  StreamingToolCall,
  ToolProgress
} from './types'
import { createInitialState } from './types'

// ============================================
// Reducer
// ============================================

/**
 * Main reducer - handles all action types
 */
export function streamingReducer(
  state: StreamingState,
  action: StreamAction
): StreamingState {
  // Version mismatch check (should not happen, dispatcher filters these)
  if ('version' in action && action.version < state.version) {
    console.log('[Reducer] Discarding stale action:', action.type, 'v:', action.version, 'current:', state.version)
    return state
  }

  console.log('[Reducer] Processing action:', action.type, 'status:', state.status)

  switch (action.type) {
    // ============================================
    // Lifecycle
    // ============================================
    case 'STREAM_RESET':
      // This case should use createInitialState for full reset
      // The store's reset() function handles this separately
      return createInitialState(action.version)

    case 'STREAM_START':
      state.status = 'streaming'
      state.message.id = action.messageId
      state.startedAt = Date.now()
      return state

    case 'STEP_ENDED':
      // Don't set status to 'done' — backend may send more steps.
      // Only STREAM_DONE (final terminal event) sets done.
      // Don't touch reasoning status here — let REASONING_STARTED/ENDED manage it.
      // Reset reasoning pending so deltas from this step are flushed.
      state.reasoning.pending = []
      return state

    case 'STREAM_DONE':
      // Final terminal event — response is fully complete.
      state.status = 'done'
      return state

    case 'STEP_FAILED':
      state.status = 'error'
      return state

    // ============================================
    // Text
    // ============================================
    case 'TEXT_STARTED':
      // Just a marker event, text content comes via deltas
      return state

    case 'TEXT_DELTA':
      state.status = 'streaming'
      // Push to array directly - Vue tracks array.push() on reactive arrays
      state.message.pending.push(action.delta)
      return state

    case 'TEXT_ENDED':
      // Append text from this step (multi-step responses have multiple text blocks)
      // TEXT_DELTA already accumulates via pending, so TEXT_ENDED's full text
      // may duplicate deltas. Only append if content is different from current.
      state.message.id = action.messageId
      const newText = action.text
      if (state.message.content !== newText && !state.message.content.endsWith(newText.slice(-100))) {
        // New step's text — append with separator
        state.message.content = state.message.content + (state.message.content ? '\n\n' : '') + newText
      }
      // If content matches, deltas already covered it — just clear pending
      state.message.pending = []
      return state

    // ============================================
    // Reasoning
    // ============================================
    case 'REASONING_STARTED':
      state.reasoning.id = action.reasoningId
      state.reasoning.status = 'thinking'
      state.reasoning.startedAt = Date.now()
      return state

    case 'REASONING_DELTA':
      state.reasoning.status = 'thinking'
      // Push to array directly - Vue tracks array.push() on reactive arrays
      state.reasoning.pending.push(action.delta)
      return state

    case 'REASONING_ENDED':
      // Append reasoning from this step (multi-step responses have multiple reasoning blocks)
      state.reasoning.status = 'done'
      state.reasoning.content = state.reasoning.content + action.text
      state.reasoning.pending = []
      state.reasoning.endedAt = Date.now()
      return state

    // ============================================
    // Pending Delta (waiting for partType)
    // ============================================
    case 'PENDING_DELTA':
      // Store delta in pending buffer, waiting for message.part.updated to provide partType
      const pendingList = state.pendingDeltas.get(action.partId) || []
      pendingList.push(action.delta)
      state.pendingDeltas.set(action.partId, pendingList)
      console.log('[Reducer] PENDING_DELTA stored for partId:', action.partId, 'count:', pendingList.length)
      return state

    // ============================================
    // Tool Input
    // ============================================
    case 'TOOL_INPUT_STARTED':
      // Create new tool in 'preparing' state - directly mutate reactive Map
      // Vue 3 tracks Map.set() operations on reactive Maps
      state.tools.entities.set(action.callId, {
        id: action.callId,
        name: action.name,
        lifecycle: 'preparing',
        rawInput: '',
        rawOutput: null,
        progress: [],
        error: null,
        startedAt: Date.now(),
        endedAt: null,
        expanded: false
      })
      return state

    case 'TOOL_INPUT_DELTA':
      // Append delta to rawInput - directly mutate reactive Map
      const toolForDelta = state.tools.entities.get(action.callId)
      if (!toolForDelta) return state
      
      toolForDelta.rawInput = toolForDelta.rawInput + action.delta
      return state

    case 'TOOL_INPUT_ENDED':
      // Use complete text from ended event - directly mutate reactive Map
      const toolForInputEnded = state.tools.entities.get(action.callId)
      if (!toolForInputEnded) return state
      
      toolForInputEnded.rawInput = action.text
      toolForInputEnded.lifecycle = 'waiting'
      return state

    // ============================================
    // Tool Execution
    // ============================================
    case 'TOOL_CALLED':
      // Tool execution started - transition to 'running'
      const toolForCalled = state.tools.entities.get(action.callId)
      if (!toolForCalled) return state
      
      // Update input from called event (more complete than input stream)
      toolForCalled.lifecycle = 'running'
      toolForCalled.rawInput = JSON.stringify(action.input)
      return state

    case 'TOOL_PROGRESS':
      // Add progress event, transition to 'streaming' if not already
      const toolForProgress = state.tools.entities.get(action.callId)
      if (!toolForProgress) return state

      const progressItems: ToolProgress[] = action.content.map(item => {
        if (typeof item === 'string') {
          return { type: 'text', message: item, timestamp: Date.now() }
        }
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>
          return {
            type: String(obj.type ?? 'structured'),
            message: String(obj.message ?? obj.content ?? ''),
            percent: typeof obj.percent === 'number' ? obj.percent : undefined,
            timestamp: Date.now()
          }
        }
        return { type: 'unknown', message: String(item), timestamp: Date.now() }
      })

      toolForProgress.lifecycle = 'streaming'
      // Push progress items directly - Vue tracks array.push() on reactive arrays
      toolForProgress.progress.push(...progressItems)
      return state

    case 'TOOL_SUCCESS':
      // Tool completed successfully
      const toolForSuccess = state.tools.entities.get(action.callId)
      if (!toolForSuccess) return state

      const output = action.output
      const rawOutput = typeof output === 'string' 
        ? output 
        : JSON.stringify(output)

      toolForSuccess.lifecycle = 'completed'
      toolForSuccess.rawOutput = rawOutput
      toolForSuccess.endedAt = Date.now()
      return state

    case 'TOOL_FAILED':
      // Tool failed
      const toolForFailed = state.tools.entities.get(action.callId)
      if (!toolForFailed) return state

      toolForFailed.lifecycle = 'failed'
      toolForFailed.error = action.error.message
      toolForFailed.endedAt = Date.now()
      return state

    default:
      return state
  }
}

// ============================================
// Utility Reducers
// ============================================

/**
 * Toggle tool expansion state - directly mutate reactive Map
 */
export function toggleToolExpanded(
  state: StreamingState,
  callId: string
): StreamingState {
  const tool = state.tools.entities.get(callId)
  if (!tool) return state

  tool.expanded = !tool.expanded
  return state
}

/**
 * Consume pending deltas (called by RenderScheduler) - directly mutate state
 */
export function consumePendingDeltas(state: StreamingState): StreamingState {
  // Consume message pending
  const messagePending = state.message.pending
  if (messagePending.length > 0) {
    state.message.content = state.message.content + messagePending.join('')
    state.message.pending = []
  }

  // Consume reasoning pending
  const reasoningPending = state.reasoning.pending
  if (reasoningPending.length > 0) {
    state.reasoning.content = state.reasoning.content + reasoningPending.join('')
    state.reasoning.pending = []
  }

  return state
}