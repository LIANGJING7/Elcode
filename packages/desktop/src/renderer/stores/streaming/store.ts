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
      streams[sessionId] = createInitialState()
      // Make the Maps reactive
      const reactiveToolsMap = reactive(streams[sessionId].tools.entities)
      streams[sessionId].tools.entities = reactiveToolsMap
      const reactivePendingDeltas = reactive(streams[sessionId].pendingDeltas)
      streams[sessionId].pendingDeltas = reactivePendingDeltas
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
    
    // Pre-process message.part.updated to build partTypeMap and flush pending deltas
    const event = rawEvent as { type?: string; properties?: Record<string, unknown>; data?: Record<string, unknown> }
    const props = event?.data ?? event?.properties ?? {}
    
    if (event?.type === 'message.part.updated') {
      const part = props.part as { id?: string; type?: string } | undefined
      if (part?.id && part?.type) {
        const partType = part.type === 'reasoning' ? 'reasoning' : 'text'
        partTypeMap.set(part.id, partType)
        console.log('[Store] partTypeMap updated:', part.id, '→', partType)
        
        // Flush pending deltas for this partId
        flushPendingDeltas(sessionId, part.id, partType)
      }
    }
    
    const action = normalizeEvent(rawEvent, state.version, partTypeMap)
    if (!action) return

    // Version check (per session)
    if ('version' in action && action.version < state.version) {
      console.log('[Store] Discarding stale event for session:', sessionId, 'v:', action.version, 'current:', state.version)
      return
    }

    // Auto-transition to streaming if idle and receiving streaming event
    if (state.status === 'idle' && isStreamingEvent(action)) {
      console.log('[Store] Auto-transitioning to streaming for session:', sessionId)
      state.status = 'streaming'
      state.startedAt = Date.now()
    }

    // Dispatch action to this session's reducer
    console.log('[Store] Dispatching to session:', sessionId, 'action:', action.type)
    streamingReducer(state, action)
    console.log('[Store] After dispatch - session:', sessionId, 'status:', state.status, 'content:', state.message.content.length)
  }
  
  // Flush pending deltas for a partId after receiving message.part.updated
  function flushPendingDeltas(sessionId: string, partId: string, partType: 'reasoning' | 'text') {
    const state = streams[sessionId]
    if (!state) return
    
    const pending = state.pendingDeltas.get(partId)
    if (!pending || pending.length === 0) return
    
    console.log('[Store] Flushing pending deltas for partId:', partId, 'type:', partType, 'count:', pending.length)
    
    // For reasoning type, set reasoning status before dispatching deltas
    if (partType === 'reasoning') {
      // Set reasoning status to 'thinking' first, then 'done' after all deltas
      state.reasoning.status = 'thinking'
      state.reasoning.id = partId
      if (!state.reasoning.startedAt) {
        state.reasoning.startedAt = Date.now()
      }
      console.log('[Store] Reasoning status set to thinking for partId:', partId)
    }
    
    // Dispatch each pending delta as the correct type
    for (const delta of pending) {
      if (partType === 'reasoning') {
        streamingReducer(state, {
          type: 'REASONING_DELTA',
          delta,
          messageId: partId,
          version: state.version
        })
      } else {
        streamingReducer(state, {
          type: 'TEXT_DELTA',
          delta,
          messageId: partId,
          version: state.version
        })
      }
    }
    
    // For reasoning, mark as done after all deltas are dispatched
    if (partType === 'reasoning') {
      state.reasoning.status = 'done'
      state.reasoning.endedAt = Date.now()
    }
    
    // Clear pending deltas for this partId
    state.pendingDeltas.delete(partId)
    console.log('[Store] Pending deltas flushed and cleared for partId:', partId)
  }

  // Clean up completed session's streaming state
  function cleanupSession(sessionId: string) {
    const state = streams[sessionId]
    if (state) {
      // Only clean up if done/error (keep streaming states)
      if (state.status === 'done' || state.status === 'error') {
        delete streams[sessionId]
        console.log('[Store] Cleaned up session:', sessionId)
      }
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
      // Increment version to reject stale events
      const newVersion = state.version + 1
      // Clear the tools Map
      state.tools.entities.clear()
      // Clear pending deltas
      state.pendingDeltas.clear()
      // Reset state
      state.version = newVersion
      state.status = 'idle'
      state.message.id = null
      state.message.content = ''
      state.message.pending.length = 0
      state.reasoning.id = null
      state.reasoning.status = 'idle'
      state.reasoning.content = ''
      state.reasoning.pending.length = 0
      state.reasoning.startedAt = null
      state.reasoning.endedAt = null
      state.reasoningHistory.length = 0
      state.startedAt = undefined
      console.log('[Store] Reset session:', sessionId, 'new version:', newVersion)
    }
  }

  // Start streaming state for a session (call before sending prompt)
  function startStreaming(sessionId: string) {
    const state = ensureStream(sessionId)
    // Clear the tools Map
    state.tools.entities.clear()
    // Clear pending deltas
    state.pendingDeltas.clear()
    // Set streaming status
    state.status = 'streaming'
    state.startedAt = Date.now()
    state.message.id = null
    state.message.content = ''
    state.message.pending.length = 0
    state.reasoning.id = null
    state.reasoning.status = 'idle'
    state.reasoning.content = ''
    state.reasoning.pending.length = 0
    state.reasoning.startedAt = null
    state.reasoning.endedAt = null
    state.reasoningHistory.length = 0
    console.log('[Store] Start streaming for session:', sessionId)
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
    return stream.message.content.length > 0 || stream.message.pending.length > 0
  })

  // Computed: is current session streaming
  const isCurrentStreaming = computed(() => {
    const stream = currentStream.value
    return stream?.status === 'streaming'
  })

  // Computed: displayed content for current session
  const displayedContent = computed(() => {
    const stream = currentStream.value
    if (!stream) return ''
    return stream.message.content + stream.message.pending.join('')
  })

  // Computed: displayed reasoning for current session
  const displayedReasoning = computed(() => {
    const stream = currentStream.value
    if (!stream) return ''
    // Include reasoningHistory + current reasoning content
    const historyContent = stream.reasoningHistory.map(r => r.content).join('')
    const currentContent = stream.reasoning.content + stream.reasoning.pending.join('')
    return historyContent + currentContent
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

  // Scheduler: consume pending deltas for current stream
  function startScheduler() {
    if (schedulerRunning) return
    schedulerRunning = true

    function tick() {
      if (!schedulerRunning) return

      const stream = currentStream.value
      if (stream) {
        // Consume pending deltas
        const messagePending = stream.message.pending
        if (messagePending.length > 0) {
          stream.message.content += messagePending.join('')
          messagePending.length = 0
        }

        const reasoningPending = stream.reasoning.pending
        if (reasoningPending.length > 0) {
          stream.reasoning.content += reasoningPending.join('')
          reasoningPending.length = 0
        }
      }

      schedulerRAF = requestAnimationFrame(tick)
    }

    schedulerRAF = requestAnimationFrame(tick)
  }

  function stopScheduler() {
    schedulerRunning = false
    if (schedulerRAF !== null) {
      cancelAnimationFrame(schedulerRAF)
      schedulerRAF = null
    }
  }

  // Watch currentStream status to start/stop scheduler
  watch(
    () => currentStream.value?.status,
    (status) => {
      if (status === 'streaming') {
        startScheduler()
      } else if (status === 'done' || status === 'error' || status === 'idle') {
        stopScheduler()
      }
    }
  )

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