/**
 * Streaming Store
 *
 * Vue reactive store for streaming state management.
 * Supports multiple sessions with independent streaming states.
 *
 * Design: Single Source of Truth
 * - streams: Record<sessionId, StreamingState> is the only data source
 * - UI only reads streams[currentSessionId]
 * - No save/restore/reset needed when switching sessions
 */

import { reactive, computed, watch, ref, type Reactive, type ComputedRef, type Ref } from 'vue'
import {
  createInitialState,
  streamingReducer,
  normalizeEvent,
  type StreamingState,
  type StreamAction,
  type StreamingToolCall
} from './index'

// ============================================
// Store Types
// ============================================

export interface StreamingStore {
  /** All session streaming states */
  streams: Reactive<Record<string, StreamingState>>

  /** Current session ID */
  currentSessionId: Ref<string | null>

  /** Current session's streaming state (computed) */
  currentStream: ComputedRef<StreamingState | null>

  /** Set current session */
  setCurrentSession: (sessionId: string | null) => void

  /** Handle SSE event for a specific session */
  handleEvent: (sessionId: string, rawEvent: unknown) => void

  /** Clean up session's streaming state */
  cleanupSession: (sessionId: string) => void

  /** Check if a session is streaming */
  isStreaming: (sessionId: string) => boolean

  /** Reset a particular session's state */
  resetStream: (sessionId: string) => void

  /** Start streaming state for a session (before receiving first event) */
  startStreaming: (sessionId: string) => void

  /** Computed: ordered tools for current session */
  orderedTools: ComputedRef<StreamingToolCall[]>

  /** Computed: has content for current session */
  hasContent: ComputedRef<boolean>

  /** Computed: is current session streaming */
  isCurrentStreaming: ComputedRef<boolean>

  /** Computed: displayed content for current session */
  displayedContent: ComputedRef<string>

  /** Computed: displayed reasoning for current session */
  displayedReasoning: ComputedRef<string>

  /** Toggle tool expansion in current session */
  toggleToolExpanded: (callId: string) => void
}

// ============================================
// Store Singleton
// ============================================

let _store: StreamingStore | null = null

// Scheduler state (per current stream)
let schedulerRAF: number | null = null
let schedulerRunning = false

// Part type mapping: partID → partType (text/reasoning)
// Used to classify message.part.delta events without explicit partType
const partTypeMap = new Map<string, 'text' | 'reasoning'>()

// V2 processed reasoning IDs - used to skip V1 duplicate processing
const v2ReasoningIds = new Set<string>()

/**
 * Create or get streaming store singleton
 */
export function useStreamingStore(): StreamingStore {
  if (_store) return _store

  // New data structure: streams per session
  const streams = reactive<Record<string, StreamingState>>({})
  const currentSessionId = ref<string | null>(null)

  // Current session's streaming state (UI only reads this)
  const currentStream = computed(() =>
    currentSessionId.value ? streams[currentSessionId.value] : null
  )

  // Ensure stream state exists for a session
  function ensureStream(sessionId: string): StreamingState {
    if (!streams[sessionId]) {
      const state = createInitialState()
      // Use reactive() to wrap the entire state object, which includes Maps
      // Vue 3's reactive() handles Map reactivity correctly when the Map is part of a reactive object
      streams[sessionId] = reactive(state)
    }
    return streams[sessionId]
  }

  // Set current session: just change currentSessionId
  function setCurrentSession(sessionId: string | null) {
    currentSessionId.value = sessionId
    // Auto-create idle state if target session has no state
    if (sessionId) {
      ensureStream(sessionId)
    }
  }

  // Handle SSE event: dispatch to target session directly
  function handleEvent(sessionId: string, rawEvent: unknown) {
    const state = ensureStream(sessionId)
    
    const event = rawEvent as { type?: string; properties?: Record<string, unknown>; data?: Record<string, unknown> }
    const props = event?.data ?? event?.properties ?? {}
    const eventSessionID = props?.sessionID as string | undefined
    
    console.log('[RENDERER] handleEvent:', event?.type, 'eventSessionID:', eventSessionID, 'targetSessionID:', sessionId, 'match:', eventSessionID === sessionId)
    
    // Track V2 reasoning IDs to avoid V1/V2 duplicate processing
    if (event?.type === 'session.next.reasoning.started') {
      const reasoningID = props.reasoningID as string
      if (reasoningID) {
        v2ReasoningIds.add(reasoningID)
        console.log('[RENDERER] Added V2 reasoning ID:', reasoningID)
      }
    }
    
    if (event?.type === 'message.part.updated') {
      const part = props.part as { 
        id?: string
        type?: string
        text?: string
        time?: { end?: number }
        messageID?: string
        tool?: string
        callID?: string
        state?: { 
          status?: string
          input?: unknown
          raw?: string
          output?: string
          metadata?: { output?: string; [key: string]: unknown }
          time?: { start?: number; end?: number }
          title?: string
        }
      } | undefined
      
      // Handle tool parts - V1 format uses message.part.updated for tool progress
      if (part?.type === 'tool' && part.callID && part.state) {
        const toolStatus = part.state.status
        const toolName = part.tool || 'unknown'
        const toolCallID = part.callID
        
        // Handle pending tool - create tool in preparing state
        if (toolStatus === 'pending') {
          const action = {
            type: 'TOOL_INPUT_STARTED' as const,
            callId: toolCallID,
            name: toolName,
            messageId: part.messageID || '',
            version: state.version
          }
          streamingReducer(state, action)
        }
        // Handle running tool with output (bash progress)
        else if (toolStatus === 'running') {
          const existingTool = state.tools.entities.get(toolCallID)
          if (!existingTool) {
            const startAction = {
              type: 'TOOL_INPUT_STARTED' as const,
              callId: toolCallID,
              name: toolName,
              messageId: part.messageID || '',
              version: state.version
            }
            streamingReducer(state, startAction)
          }
          
          const calledAction = {
            type: 'TOOL_CALLED' as const,
            callId: toolCallID,
            input: part.state.input as Record<string, unknown> || {},
            messageId: part.messageID || '',
            version: state.version
          }
          streamingReducer(state, calledAction)
          
          // Send progress if output exists (for bash tool)
          if (part.state.metadata?.output) {
            const progressAction = {
              type: 'TOOL_PROGRESS' as const,
              callId: toolCallID,
              content: [part.state.metadata.output],
              version: state.version
            }
            streamingReducer(state, progressAction)
          }
        }
        // Handle completed tool
        else if (toolStatus === 'completed') {
          const successAction = {
            type: 'TOOL_SUCCESS' as const,
            callId: toolCallID,
            output: {
              structured: part.state.metadata,
              result: part.state.output,
              content: undefined
            },
            version: state.version
          }
          streamingReducer(state, successAction)
        }
        // Handle error tool
        else if (toolStatus === 'error') {
        }
      }
      
      if (part?.id && part?.type) {
        const partType = part.type === 'reasoning' ? 'reasoning' : 'text'
        partTypeMap.set(part.id, partType)
        
        if (partType === 'text' && part.messageID) {
          state.message.id = part.messageID
        }
        
        // Skip V1 reasoning processing if already handled by V2 events
        if (partType === 'reasoning' && v2ReasoningIds.has(part.id)) {
          console.log('[STORE] Skipping V1 reasoning flush - already in v2ReasoningIds:', part.id)
        } else {
          console.log('[STORE] Flushing pending deltas for part:', part.id, 'type:', partType, 'pending count:', state.pendingDeltas.get(part.id)?.length || 0)
          flushPendingDeltas(sessionId, part.id, partType)
        }
      }
    }
    
    const action = normalizeEvent(rawEvent, state.version, partTypeMap)
    if (!action) return

    if ('version' in action && action.version < state.version) return

    if (state.status === 'idle' && isStreamingEvent(action)) {
      state.status = 'streaming'
      state.startedAt = Date.now()
    }

    streamingReducer(state, action)
  }
  
  // Flush pending deltas for a partId after receiving message.part.updated
  function flushPendingDeltas(sessionId: string, partId: string, partType: 'reasoning' | 'text') {
    const state = streams[sessionId]
    if (!state) return
    
    const pending = state.pendingDeltas.get(partId)
    console.log('[FLUSH] partId:', partId, 'partType:', partType, 'pending count:', pending?.length || 0)
    
    if (partType === 'reasoning') {
      if (pending && pending.length > 0) {
        const mergedDelta = pending.join('')
        console.log('[FLUSH] merging pending deltas, length:', mergedDelta.length)
        state.reasoning.content = state.reasoning.content + mergedDelta
        state.pendingDeltas.delete(partId)
      }
      state.reasoning.status = 'done'
      state.reasoning.endedAt = Date.now()
      state.reasoning.id = partId
      console.log('[FLUSH] reasoning.status set to done, content length:', state.reasoning.content.length)
    } else {
      if (pending && pending.length > 0) {
        const mergedDelta = pending.join('')
        state.message.content = state.message.content + mergedDelta
        state.pendingDeltas.delete(partId)
      }
    }
  }

  // Clean up completed session's streaming state
  function cleanupSession(sessionId: string) {
    const state = streams[sessionId]
    if (state && (state.status === 'done' || state.status === 'error')) {
      delete streams[sessionId]
    }
  }

  // Check if a session is streaming
  function isStreaming(sessionId: string): boolean {
    const state = streams[sessionId]
    return state?.status === 'streaming'
  }

  // Reset a particular session's state
  function resetStream(sessionId: string) {
    const state = streams[sessionId]
    if (state) {
      const newVersion = state.version + 1
      state.tools.entities.clear()
      state.pendingDeltas.clear()
      state.version = newVersion
      state.status = 'idle'
      state.message.id = null
      state.message.content = ''
      state.reasoning.id = null
      state.reasoning.status = 'idle'
      state.reasoning.content = ''
      state.reasoning.startedAt = null
      state.reasoning.endedAt = null
      state.reasoningHistory.length = 0
      state.startedAt = undefined
      state.stepError = null
      // Clear V1/V2 dedup tracking
      v2ReasoningIds.clear()
      partTypeMap.clear()
    }
  }

  // Start streaming state for a session (call before sending prompt)
  function startStreaming(sessionId: string) {
    const state = ensureStream(sessionId)
    state.tools.entities.clear()
    state.pendingDeltas.clear()
    state.status = 'streaming'
    state.startedAt = Date.now()
    state.message.id = null
    state.message.content = ''
    state.reasoning.id = null
    state.reasoning.status = 'idle'
    state.reasoning.content = ''
    state.reasoning.startedAt = null
    state.reasoning.endedAt = null
    state.reasoningHistory.length = 0
    state.stepError = null
    // Clear V1/V2 dedup tracking
    v2ReasoningIds.clear()
    partTypeMap.clear()
  }

  // Computed: ordered tools for current session
  const orderedTools = computed(() => {
    const stream = currentStream.value
    if (!stream) return []
    return Array.from(stream.tools.entities.values())
      .sort((a, b) => a.startedAt - b.startedAt)
  })

  // Computed: has content for current session
  const hasContent = computed(() => {
    const stream = currentStream.value
    if (!stream) return false
    return stream.message.content.length > 0
  })

  // Computed: is current session streaming
  const isCurrentStreaming = computed(() => {
    const stream = currentStream.value
    return stream?.status === 'streaming'
  })

  // Computed: displayed content for current session (no pending - direct append)
  const displayedContent = computed(() => {
    const stream = currentStream.value
    if (!stream) return ''
    return stream.message.content
  })

  // Computed: displayed reasoning for current session (no pending - direct append)
  const displayedReasoning = computed(() => {
    const stream = currentStream.value
    if (!stream) return ''
    const historyContent = stream.reasoningHistory.map(r => r.content).join('')
    return historyContent + stream.reasoning.content
  })

  // Toggle tool expansion in current session
  function toggleToolExpanded(callId: string) {
    const stream = currentStream.value
    if (!stream) return
    const tool = stream.tools.entities.get(callId)
    if (tool) {
      tool.expanded = !tool.expanded
    }
  }

  // Scheduler removed - no pending array to flush
  // Component layer (useStreamingMarkdown) handles batching via requestAnimationFrame

  // Scheduler removed - component layer handles batching

  _store = {
    streams,
    currentSessionId,
    currentStream,
    setCurrentSession,
    handleEvent,
    cleanupSession,
    isStreaming,
    resetStream,
    startStreaming,
    orderedTools,
    hasContent,
    isCurrentStreaming,
    displayedContent,
    displayedReasoning,
    toggleToolExpanded
  }

  return _store
}

/**
 * Reset store singleton (for testing)
 */
export function resetStreamingStoreSingleton() {
  if (_store) {
    // Stop scheduler
    schedulerRunning = false
    if (schedulerRAF !== null) {
      cancelAnimationFrame(schedulerRAF)
      schedulerRAF = null
    }
  }
  _store = null
}

// ============================================
// Helper Functions
// ============================================

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