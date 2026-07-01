/**
 * SSE Event Dispatcher
 * 
 * Handles version checking and dispatches normalized actions to the reducer.
 * Auto-transitions to 'streaming' status when first event arrives (fallback for missing step.started).
 */

import type { StreamingState, StreamAction } from './types'
import { createNormalizer } from './normalizer'

// ============================================
// Types
// ============================================

interface DispatcherContext {
  getState: () => StreamingState
  dispatch: (action: StreamAction) => void
}

// ============================================
// Dispatcher
// ============================================

/**
 * Create dispatcher with state access and dispatch callback
 */
export function createDispatcher(ctx: DispatcherContext) {
  const normalizer = createNormalizer({
    getVersion: () => ctx.getState().version
  })

  return function handleEvent(rawEvent: unknown) {
    // Normalize raw SSE event to action
    const action = normalizer(rawEvent)
    if (!action) {
      // Unknown event type - log for debugging
      const event = rawEvent as Record<string, unknown>
      const eventType = event?.type as string | undefined
      if (eventType && !eventType.startsWith('server.')) {
        console.log('[Dispatcher] Unknown event discarded:', eventType)
      }
      return
    }

    console.log('[Dispatcher] Action created:', action.type, 'version:', action.version)

    // Version check: discard stale events from previous sessions
    const currentVersion = ctx.getState().version
    if (action.version < currentVersion) {
      console.log('[Dispatcher] Discarding stale event:', action.type, 'v:', action.version, 'current:', currentVersion)
      return
    }

    // Auto-transition to 'streaming' if state is still 'idle' and we receive a streaming event
    // This handles cases where 'session.next.step.started' is not sent by backend
    const state = ctx.getState()
    if (state.status === 'idle' && isStreamingEvent(action)) {
      console.log('[Dispatcher] Auto-transitioning to streaming on:', action.type)
      // Dispatch a STREAM_START action to set status
      const messageId = (action as any).messageId || state.message.id || 'streaming'
      ctx.dispatch({ type: 'STREAM_START', messageId, version: action.version })
    }

    // Dispatch the actual action
    ctx.dispatch(action)
  }
}

/**
 * Check if action is a streaming-related event (not lifecycle management)
 */
function isStreamingEvent(action: StreamAction): boolean {
  switch (action.type) {
    case 'STREAM_RESET':
    case 'STREAM_START':
    case 'STEP_ENDED':
    case 'STEP_FAILED':
      return false
    default:
      return true
  }
}

/**
 * Type guard for checking if action has version
 */
export function hasVersion(action: StreamAction): boolean {
  return 'version' in action && typeof action.version === 'number'
}