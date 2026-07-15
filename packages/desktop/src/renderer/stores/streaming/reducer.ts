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
      return state

    case 'STREAM_DONE':
      // Final terminal event — response is fully complete.
      state.status = 'done'
      return state

    case 'STEP_FAILED':
      state.status = 'error'
      state.stepError = action.error
      return state

    // ============================================
    // Text
    // ============================================
    case 'TEXT_STARTED':
      // Just a marker event, text content comes via deltas
      return state

    case 'TEXT_DELTA':
      state.status = 'streaming'
      // Directly append to content - component layer will batch render via useStreamingMarkdown
      state.message.content = state.message.content + action.delta
      return state

    case 'TEXT_ENDED':
      state.message.id = action.messageId
      // TEXT_DELTA already appended deltas, no need to duplicate
      // Only use TEXT_ENDED if no deltas were received (edge case)
      if (state.message.content.length === 0 && action.text) {
        state.message.content = action.text
      }
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
      // Directly append to content - component layer will batch render
      state.reasoning.content = state.reasoning.content + action.delta
      return state

    case 'REASONING_ENDED':
      state.reasoning.status = 'done'
      // REASONING_DELTA already appended deltas
      // Only use REASONING_ENDED text if no deltas received (edge case)
      if (state.reasoning.content.length === 0 && action.text) {
        state.reasoning.content = action.text
      }
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
      if (!toolForProgress) {
        console.log('[Reducer] TOOL_PROGRESS - tool not found:', action.callId)
        return state
      }

      console.log('[Reducer] TOOL_PROGRESS for tool:', toolForProgress.name, 'callId:', action.callId)
      console.log('[Reducer] action.content:', action.content)
      console.log('[Reducer] action.content types:', action.content.map(c => typeof c))

      const progressItems: ToolProgress[] = action.content.map(item => {
        if (typeof item === 'string') {
          console.log('[Reducer] Progress item is string:', item.slice(0, 100))
          return { type: 'text', message: item, timestamp: Date.now() }
        }
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>
          console.log('[Reducer] Progress item is object, keys:', Object.keys(obj))
          console.log('[Reducer] Progress item obj.type:', obj.type, 'obj.message:', obj.message, 'obj.content:', obj.content)
          return {
            type: String(obj.type ?? 'structured'),
            message: String(obj.message ?? obj.content ?? ''),
            percent: typeof obj.percent === 'number' ? obj.percent : undefined,
            timestamp: Date.now()
          }
        }
        return { type: 'unknown', message: String(item), timestamp: Date.now() }
      })

      console.log('[Reducer] Generated progressItems:', progressItems)
      console.log('[Reducer] Before push, progress count:', toolForProgress.progress.length)

      toolForProgress.lifecycle = 'streaming'
      // Push progress items directly - Vue tracks array.push() on reactive arrays
      toolForProgress.progress.push(...progressItems)

      console.log('[Reducer] After push, progress count:', toolForProgress.progress.length)
      return state

    case 'TOOL_SUCCESS':
      // Tool completed successfully
      const toolForSuccess = state.tools.entities.get(action.callId)
      if (!toolForSuccess) {
        console.log('[Reducer] TOOL_SUCCESS - tool not found:', action.callId)
        return state
      }
      console.log('[Reducer] TOOL_SUCCESS:', action.callId, 'tool name:', toolForSuccess.name, 'output:', action.output)

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
      if (!toolForFailed) {
        console.log('[Reducer] TOOL_FAILED - tool not found:', action.callId)
        return state
      }
      console.log('[Reducer] TOOL_FAILED:', action.callId, 'tool name:', toolForFailed.name, 'error:', action.error)

      toolForFailed.lifecycle = 'failed'
      toolForFailed.error = action.error
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