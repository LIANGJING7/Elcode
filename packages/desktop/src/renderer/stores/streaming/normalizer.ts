/**
 * SSE Event Normalizer
 * 
 * Converts backend SSE events to uniform StreamAction format.
 * This layer isolates the reducer from raw SSE event format changes.
 */

import type { StreamAction } from './types'

// ============================================
// Types
// ============================================

/** Raw SSE event from backend (see packages/core/src/core/session/event.ts) */
interface RawSSEEvent {
  id?: string
  type: string
  data?: Record<string, unknown>
  properties?: Record<string, unknown>
  seq?: number
  version?: number
  timestamp?: number
}

/** Normalizer context - provides current version */
interface NormalizerContext {
  getVersion: () => number
}

// ============================================
// Normalizer
// ============================================

/**
 * Create event normalizer with version context
 */
export function createNormalizer(ctx: NormalizerContext) {
  return function normalizeEvent(rawEvent: unknown): StreamAction | null {
    const event = rawEvent as RawSSEEvent
    const type = event.type
    // Support both `data` (EventV2 format) and `properties` (bridge format)
    const props = event.data ?? event.properties ?? {}
    const version = ctx.getVersion()

    // Debug log for unknown events
    if (process.env.NODE_ENV !== 'production') {
      const knownTypes = [
        'session.next.text.started', 'session.next.text.delta', 'session.next.text.ended',
        'session.next.reasoning.started', 'session.next.reasoning.delta', 'session.next.reasoning.ended',
        'session.next.tool.input.started', 'session.next.tool.input.delta', 'session.next.tool.input.ended',
        'session.next.tool.called', 'session.next.tool.progress', 'session.next.tool.success', 'session.next.tool.failed',
        'session.next.step.started', 'session.next.step.ended', 'session.next.step.failed',
        'stream.ended',
        // SessionV1 events (legacy)
        'session.diff', 'message.updated', 'message.part.updated', 'session.status',
      ]
      if (type && !knownTypes.includes(type) && !type.startsWith('server.')) {
        console.log('[Normalizer] Unknown event type:', type, 'keys:', Object.keys(event), 'props keys:', Object.keys(props))
      }
    }

    // Stream ended (SSE connection closed) - final completion signal
    if (type === 'stream.ended') {
      return { type: 'STREAM_DONE', version }
    }

    // SessionV1 events (legacy format) - convert to SessionV2 actions
    // These events use a different structure and need special handling
    if (type === 'session.diff') {
      // SessionV1 diff contains parts array with text/tool/reasoning
      const diff = props.diff as Array<{ type: string; text?: string; content?: unknown } | undefined> | undefined
      if (!diff || !Array.isArray(diff)) return null
      
      // Process diff parts and convert to appropriate actions
      console.log('[Normalizer] session.diff received, parts:', diff.length)
      
      // Extract text from parts
      const textParts = diff.filter(p => p?.type === 'text')
      if (textParts.length > 0) {
        const fullText = textParts.map(p => p?.text || '').join('\n')
        // Return a TEXT_ENDED action with the full text (since diff gives us completed content)
        return {
          type: 'TEXT_ENDED',
          text: fullText,
          textId: 'legacy',
          messageId: 'legacy',
          version
        }
      }
      return null
    }
    
    // Handle message.part.delta - V1 streaming delta event
    if (type === 'message.part.delta') {
      const delta = props.delta as string
      const field = props.field as string
      if (delta && field === 'text') {
        console.log('[Normalizer] message.part.delta text:', delta.slice(0, 50))
        return {
          type: 'TEXT_DELTA',
          delta,
          messageId: props.messageID as string,
          version
        }
      }
      return null
    }
    
    // Handle session.status - V1 status event (busy/idle)
    if (type === 'session.status') {
      const status = props.status as { type?: string } | undefined
      if (status?.type === 'idle') {
        console.log('[Normalizer] session.status idle - marking as done')
        return {
          type: 'STREAM_DONE',
          version
        }
      }
      return null
    }
    
    // Handle session.idle - V1 idle event
    if (type === 'session.idle') {
      console.log('[Normalizer] session.idle - marking as done')
      return {
        type: 'STREAM_DONE',
        version
      }
    }
    
    if (type === 'message.updated') {
      // Message role update - just track role mapping, don't trigger completion
      const info = props.info as { role?: string; id?: string } | undefined
      if (info?.role === 'assistant') {
        console.log('[Normalizer] message.updated for assistant message:', info.id)
      }
      return null
    }
    
    if (type === 'message.part.updated') {
      // Message part update - contains actual text content
      const part = props.part as { type?: string; text?: string } | undefined
      if (part?.type === 'text' && part.text) {
        console.log('[Normalizer] message.part.updated text length:', part.text.length)
        return {
          type: 'TEXT_DELTA',
          delta: part.text,
          messageId: 'legacy',
          version
        }
      }
      return null
    }

    // Text events
    switch (type) {
      case 'session.next.text.started':
        return {
          type: 'TEXT_STARTED',
          textId: props.textID as string,
          messageId: props.assistantMessageID as string,
          version
        }

      case 'session.next.text.delta':
        return {
          type: 'TEXT_DELTA',
          delta: props.delta as string,
          messageId: props.assistantMessageID as string,
          version
        }

      case 'session.next.text.ended':
        return {
          type: 'TEXT_ENDED',
          text: props.text as string,
          textId: props.textID as string,
          messageId: props.assistantMessageID as string,
          version
        }
    }

    // Reasoning events
    switch (type) {
      case 'session.next.reasoning.started':
        return {
          type: 'REASONING_STARTED',
          reasoningId: props.reasoningID as string,
          messageId: props.assistantMessageID as string,
          version
        }

      case 'session.next.reasoning.delta':
        return {
          type: 'REASONING_DELTA',
          delta: props.delta as string,
          messageId: props.assistantMessageID as string,
          version
        }

      case 'session.next.reasoning.ended':
        return {
          type: 'REASONING_ENDED',
          text: props.text as string,
          reasoningId: props.reasoningID as string,
          messageId: props.assistantMessageID as string,
          version
        }
    }

    // Tool input events
    switch (type) {
      case 'session.next.tool.input.started':
        return {
          type: 'TOOL_INPUT_STARTED',
          callId: props.callID as string,
          name: props.name as string,
          messageId: props.assistantMessageID as string,
          version
        }

      case 'session.next.tool.input.delta':
        return {
          type: 'TOOL_INPUT_DELTA',
          callId: props.callID as string,
          delta: props.delta as string,
          version
        }

      case 'session.next.tool.input.ended':
        return {
          type: 'TOOL_INPUT_ENDED',
          callId: props.callID as string,
          text: props.text as string,
          version
        }
    }

    // Tool execution events
    switch (type) {
      case 'session.next.tool.called':
        return {
          type: 'TOOL_CALLED',
          callId: props.callID as string,
          input: props.input as Record<string, unknown>,
          messageId: props.assistantMessageID as string,
          version
        }

      case 'session.next.tool.progress':
        return {
          type: 'TOOL_PROGRESS',
          callId: props.callID as string,
          content: props.content as unknown[],
          version
        }

      case 'session.next.tool.success':
        return {
          type: 'TOOL_SUCCESS',
          callId: props.callID as string,
          output: props.result ?? props.content,
          version
        }

      case 'session.next.tool.failed':
        const error = props.error as { type?: string; message?: string } | undefined
        return {
          type: 'TOOL_FAILED',
          callId: props.callID as string,
          error: {
            type: error?.type ?? 'unknown',
            message: error?.message ?? 'Unknown error'
          },
          version
        }
    }

    // Step events
    switch (type) {
      case 'session.next.step.started':
        return {
          type: 'STREAM_START',
          messageId: props.assistantMessageID as string,
          version
        }

      case 'session.next.step.ended':
        return {
          type: 'STEP_ENDED',
          version
        }

      case 'session.next.step.failed':
        const stepError = props.error as { message?: string } | undefined
        return {
          type: 'STEP_FAILED',
          error: stepError?.message ?? 'Step failed',
          version
        }
    }

    // Unknown event - ignore
    return null
  }
}

// ============================================
// Simple normalizer (without context)
// ============================================

/**
 * Simple normalizer for testing - accepts version as parameter
 */
export function normalizeEvent(rawEvent: unknown, version: number): StreamAction | null {
  const ctx = { getVersion: () => version }
  const normalizer = createNormalizer(ctx)
  return normalizer(rawEvent)
}