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

/** Normalizer context - provides current version and partTypeMap */
interface NormalizerContext {
  getVersion: () => number
  /** Part type mapping from message.part.updated events */
  getPartType?: (partID: string) => 'text' | 'reasoning' | undefined
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
        'session.diff', 'message.updated', 'message.part.updated', 'message.removed', 'session.status', 'session.error',
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
    // V1 format: delta + field + partID, but no partType. Need partTypeMap to distinguish.
    if (type === 'message.part.delta') {
      const delta = props.delta as string
      const field = props.field as string
      const partID = props.partID as string
      
      // Only handle text field (reasoning also uses 'text' field in V1)
      if (!delta || field !== 'text') return null
      
      // Check partTypeMap for this partID
      if (partID && ctx.getPartType) {
        const mappedType = ctx.getPartType(partID)
        if (mappedType === 'reasoning') {
          console.log('[Normalizer] message.part.delta -> REASONING_DELTA (partTypeMap)')
          return {
            type: 'REASONING_DELTA',
            delta,
            messageId: props.messageID as string,
            version
          }
        }
        if (mappedType === 'text') {
          console.log('[Normalizer] message.part.delta -> TEXT_DELTA (partTypeMap)')
          return {
            type: 'TEXT_DELTA',
            delta,
            messageId: props.messageID as string,
            version
          }
        }
      }
      
      // No partTypeMap entry yet - store as pending delta
      // Will be flushed when message.part.updated arrives
      console.log('[Normalizer] message.part.delta -> PENDING_DELTA (no partTypeMap)')
      return {
        type: 'PENDING_DELTA',
        partId: partID,
        delta,
        messageId: props.messageID as string,
        version
      }
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
    
    // Handle session.error - V1 error event
    if (type === 'session.error') {
      const error = props.error as { name?: string; data?: { message?: string } } | undefined
      console.log('[Normalizer] session.error received:', error)
      return {
        type: 'STEP_FAILED',
        error: {
          type: error?.name ?? 'unknown',
          message: error?.data?.message ?? 'Session error'
        },
        version
      }
    }
    
    // Handle session.idle - V1 idle event
    // Note: session.status idle already triggers STREAM_DONE, so we skip this
    // to avoid duplicate STREAM_DONE events that would clear the content
    if (type === 'session.idle') {
      console.log('[Normalizer] session.idle - skipping (session.status idle already handled)')
      return null
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
      // Message part update - used to build partTypeMap (handled in store.ts)
      // DO NOT return any action here - partTypeMap updated in store.ts pre-process
      // The pending deltas will be flushed by store.ts after partTypeMap is updated
      const part = props.part as { type?: string; id?: string } | undefined
      if (part?.type) {
        console.log('[Normalizer] message.part.updated part type:', part.type, 'id:', part.id)
      }
      return null  // No action - partTypeMap updated in store.ts
    }

    if (type === 'message.removed') {
      return {
        type: 'MESSAGE_REMOVED',
        messageID: props.messageID as string,
        sessionID: props.sessionID as string,
        version
      }
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
        console.log('[Stream] Tool called:', props.callID, props.name, props.input)
        return {
          type: 'TOOL_CALLED',
          callId: props.callID as string,
          input: props.input as Record<string, unknown>,
          messageId: props.assistantMessageID as string,
          version
        }

      case 'session.next.tool.progress':
        console.log('[Normalizer] session.next.tool.progress received')
        console.log('[Normalizer] props.callID:', props.callID)
        console.log('[Normalizer] props.content:', props.content)
        console.log('[Normalizer] props.content type:', typeof props.content, Array.isArray(props.content))
        if (Array.isArray(props.content)) {
          console.log('[Normalizer] props.content length:', props.content.length)
          props.content.forEach((item, idx) => {
            console.log(`[Normalizer] content[${idx}] type:`, typeof item, item)
          })
        }
        return {
          type: 'TOOL_PROGRESS',
          callId: props.callID as string,
          content: props.content as unknown[],
          version
        }

      case 'session.next.tool.success':
        console.log('[Stream] Tool success:', props.callID)
        console.log('[Stream]   result:', typeof props.result === 'string' ? props.result.slice(0, 300) : JSON.stringify(props.result).slice(0, 300))
        console.log('[Stream]   structured:', typeof props.structured === 'string' ? props.structured.slice(0, 300) : JSON.stringify(props.structured).slice(0, 300))
        console.log('[Stream]   content:', props.content ? (Array.isArray(props.content) ? props.content.length + ' items' : typeof props.content) : 'undefined')
        return {
          type: 'TOOL_SUCCESS',
          callId: props.callID as string,
          output: {
            structured: props.structured,
            result: props.result,
            content: props.content
          },
          version
        }

      case 'session.next.tool.failed':
        const error = props.error as { type?: string; message?: string } | undefined
        console.log('[Stream] Tool failed:', props.callID, 'error:', error, 'full props:', props)
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
        const stepError = props.error as { type?: string; message?: string } | undefined
        return {
          type: 'STEP_FAILED',
          error: {
            type: stepError?.type ?? 'unknown',
            message: stepError?.message ?? 'Step failed'
          },
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
export function normalizeEvent(rawEvent: unknown, version: number, partTypeMap?: Map<string, 'text' | 'reasoning'>): StreamAction | null {
  const ctx: NormalizerContext = {
    getVersion: () => version,
    getPartType: partTypeMap ? (id) => partTypeMap.get(id) : undefined
  }
  const normalizer = createNormalizer(ctx)
  return normalizer(rawEvent)
}