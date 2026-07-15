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
  type StreamingState,
  type StreamingToolCall,
  type ToolProgress
} from './index'
import { useQuestionStore } from '../question'

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
    
    const event = rawEvent as { type?: string; properties?: Record<string, unknown>; data?: Record<string, unknown>; seq?: number }
    const type = event?.type
    const props = event?.data ?? event?.properties ?? {}
    
    if (!type) return
    
    // Version check for stale events
    const eventVersion = typeof event.seq === 'number' ? event.seq : (props.version as number)
    if (eventVersion !== undefined && eventVersion < state.version) {
      console.log('[handleEvent] Skip stale event:', type, 'v:', eventVersion, 'current:', state.version)
      return
    }
    
    // Switch-based event handling (like TUI)
    switch (type) {
      // ============================================
      // V2 Format - Text
      // ============================================
      case 'session.next.text.started':
        // Just marker event, content comes via deltas
        break
        
      case 'session.next.text.delta':
        state.status = 'streaming'
        state.message.content += props.delta as string
        break
        
      case 'session.next.text.ended':
        state.message.id = (props.assistantMessageID || props.messageID) as string
        break
        
      // ============================================
      // V2 Format - Reasoning
      // ============================================
      case 'session.next.reasoning.started':
        state.reasoning.id = props.reasoningID as string
        state.reasoning.status = 'thinking'
        state.reasoning.startedAt = Date.now()
        break
        
      case 'session.next.reasoning.delta':
        state.reasoning.status = 'thinking'
        state.reasoning.content += props.delta as string
        break
        
      case 'session.next.reasoning.ended':
        state.reasoning.status = 'done'
        state.reasoning.endedAt = Date.now()
        if (state.reasoning.content.length === 0 && props.text) {
          state.reasoning.content = props.text as string
        }
        break
        
      // ============================================
      // V2 Format - Tool Input
      // ============================================
      case 'session.next.tool.input.started':
        handleToolInputStarted(state, props)
        break
        
      case 'session.next.tool.input.delta':
        handleToolInputDelta(state, props)
        break
        
      case 'session.next.tool.input.ended':
        handleToolInputEnded(state, props)
        break
        
      // ============================================
      // V2 Format - Tool Execution
      // ============================================
      case 'session.next.tool.called':
        handleToolCalled(state, props)
        break
        
      case 'session.next.tool.progress':
        handleToolProgress(state, props)
        break
        
      case 'session.next.tool.success':
        handleToolSuccess(state, props)
        break
        
      case 'session.next.tool.failed':
        handleToolFailed(state, props)
        break
        
      // ============================================
      // V2 Format - Step
      // ============================================
      case 'session.next.step.started':
        state.status = 'streaming'
        state.message.id = props.assistantMessageID as string
        state.startedAt = Date.now()
        break
        
      case 'session.next.step.ended':
        // Don't set done - backend may send more steps
        break
        
      case 'session.next.step.failed':
        state.status = 'error'
        const stepError = props.error as { type?: string; message?: string } | undefined
        state.stepError = {
          type: stepError?.type ?? 'unknown',
          message: stepError?.message ?? 'Step failed'
        }
        break
        
      // ============================================
      // V1 Format - Legacy Events
      // ============================================
      case 'session.next.text.started':
      case 'session.next.reasoning.started':
        // Already handled above
        break
        
      case 'session.diff': {
        const diff = props.diff as Array<{ type?: string; text?: string }> | undefined
        if (diff) {
          const textParts = diff.filter(p => p?.type === 'text')
          if (textParts.length > 0) {
            state.message.content = textParts.map(p => p?.text || '').join('\n')
          }
        }
        break
      }
      
      case 'message.part.updated': {
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
          }
        } | undefined
        
        if (part?.type === 'tool' && part.callID && part.state) {
          handleV1ToolPart(state, part)
        }
        
        if (part?.id && part?.type) {
          partTypeMap.set(part.id, part.type === 'reasoning' ? 'reasoning' : 'text')
          if (part.type === 'text' && part.messageID) {
            state.message.id = part.messageID
          }
          if (part.type === 'reasoning') {
            state.reasoning.status = 'done'
            state.reasoning.id = part.id
            state.reasoning.endedAt = part.time?.end ? new Date(part.time.end).getTime() : Date.now()
          }
          flushPendingDeltas(sessionId, part.id, part.type === 'reasoning' ? 'reasoning' : 'text')
        }
        break
      }
      
      case 'message.part.delta': {
        const delta = props.delta as string
        const field = props.field as string
        const partID = props.partID as string
        
        if (delta && field === 'text' && partID) {
          const partType = partTypeMap.get(partID)
          if (partType === 'reasoning') {
            state.reasoning.content += delta
          } else if (partType === 'text') {
            state.message.content += delta
          } else {
            // Store as pending, will be flushed on message.part.updated
            const pending = state.pendingDeltas.get(partID) || []
            pending.push(delta)
            state.pendingDeltas.set(partID, pending)
          }
        }
        break
      }
      
      case 'session.status': {
        const status = props.status as { type?: string } | undefined
        if (status?.type === 'idle') {
          state.status = 'done'
        }
        break
      }
      
      case 'session.error': {
        const error = props.error as { name?: string; data?: { message?: string } } | undefined
        state.status = 'error'
        state.stepError = {
          type: error?.name ?? 'unknown',
          message: error?.data?.message ?? 'Session error'
        }
        break
      }
      
      // ============================================
      // Question Events
      // ============================================
      case 'question.asked': {
        const questionStore = useQuestionStore()
        questionStore.addQuestion({
          id: props.id as string,
          sessionID: props.sessionID as string,
          questions: props.questions as any[],
          tool: props.tool as any
        })
        break
      }
      
      case 'question.replied':
      case 'question.rejected': {
        const questionStore = useQuestionStore()
        questionStore.removeQuestion(props.sessionID as string, props.requestID as string)
        break
      }
      
      // ============================================
      // Stream End
      // ============================================
      case 'stream.ended':
        state.status = 'done'
        break
        
      default:
        // Log unknown events in dev
        if (import.meta.env.DEV && !type.startsWith('server.')) {
          console.log('[handleEvent] Unknown event type:', type)
        }
    }
  }
  
  // ============================================
  // Tool Handlers
  // ============================================
  
  function handleToolInputStarted(state: StreamingState, props: Record<string, unknown>) {
    const callID = props.callID as string
    const name = props.name as string
    const messageID = props.assistantMessageID as string
    
    if (!callID) return
    
    const tool: StreamingToolCall = {
      id: callID,
      name,
      lifecycle: 'preparing',
      rawInput: '',
      rawOutput: null,
      progress: [],
      error: null,
      startedAt: Date.now(),
      endedAt: null,
      expanded: true
    }
    state.tools.entities.set(callID, tool)
    state.message.id = messageID
  }
  
  function handleToolInputDelta(state: StreamingState, props: Record<string, unknown>) {
    const callID = props.callID as string
    const delta = props.delta as string
    
    const tool = state.tools.entities.get(callID)
    if (tool) {
      tool.rawInput += delta
    }
  }
  
  function handleToolInputEnded(state: StreamingState, props: Record<string, unknown>) {
    const callID = props.callID as string
    const text = props.text as string
    
    const tool = state.tools.entities.get(callID)
    if (tool && text) {
      tool.rawInput = text
    }
  }
  
  function handleToolCalled(state: StreamingState, props: Record<string, unknown>) {
    const callID = props.callID as string
    const input = props.input as Record<string, unknown>
    const messageID = props.assistantMessageID as string
    
    let tool = state.tools.entities.get(callID)
    if (!tool) {
      // Create if not exists
      tool = {
        id: callID,
        name: props.name as string || 'unknown',
        lifecycle: 'running',
        rawInput: '',
        rawOutput: null,
        progress: [],
        error: null,
        startedAt: Date.now(),
        endedAt: null,
        expanded: true
      }
      state.tools.entities.set(callID, tool)
    }
    
    tool.lifecycle = 'running'
    tool.rawInput = typeof input === 'string' ? input : JSON.stringify(input)
    state.message.id = messageID
  }
  
  function handleToolProgress(state: StreamingState, props: Record<string, unknown>) {
    const callID = props.callID as string
    const content = props.content as unknown[]
    
    const tool = state.tools.entities.get(callID)
    if (tool && content) {
      tool.lifecycle = 'streaming'
      for (const item of content) {
        tool.progress.push({
          type: 'text',
          message: typeof item === 'string' ? item : JSON.stringify(item),
          timestamp: Date.now()
        })
      }
    }
  }
  
  function handleToolSuccess(state: StreamingState, props: Record<string, unknown>) {
    const callID = props.callID as string
    
    const tool = state.tools.entities.get(callID)
    if (tool) {
      tool.lifecycle = 'completed'
      tool.endedAt = Date.now()
      tool.rawOutput = typeof props.result === 'string' ? props.result : JSON.stringify(props.result)
    }
  }
  
  function handleToolFailed(state: StreamingState, props: Record<string, unknown>) {
    const callID = props.callID as string
    const error = props.error as { type?: string; message?: string } | undefined
    
    const tool = state.tools.entities.get(callID)
    if (tool) {
      tool.lifecycle = 'failed'
      tool.endedAt = Date.now()
      tool.error = {
        type: error?.type ?? 'unknown',
        message: error?.message ?? 'Unknown error'
      }
    }
  }
  
  function handleV1ToolPart(state: StreamingState, part: {
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
    }
  }) {
    if (!part.callID || !part.state) return
    
    const callID = part.callID
    const toolName = part.tool || 'unknown'
    const toolStatus = part.state.status
    
    if (toolStatus === 'pending') {
      // Create tool in preparing state
      state.tools.entities.set(callID, {
        id: callID,
        name: toolName,
        lifecycle: 'preparing',
        rawInput: '',
        rawOutput: null,
        progress: [],
        error: null,
        startedAt: Date.now(),
        endedAt: null,
        expanded: true
      })
    } else if (toolStatus === 'running') {
      let tool = state.tools.entities.get(callID)
      if (!tool) {
        tool = {
          id: callID,
          name: toolName,
          lifecycle: 'running',
          rawInput: '',
          rawOutput: null,
          progress: [],
          error: null,
          startedAt: Date.now(),
          endedAt: null,
          expanded: true
        }
        state.tools.entities.set(callID, tool)
      }
      tool.lifecycle = 'running'
      tool.rawInput = typeof part.state.input === 'string' ? part.state.input : JSON.stringify(part.state.input)
      
      if (part.state.metadata?.output) {
        tool.progress.push({
          type: 'text',
          message: part.state.metadata.output,
          timestamp: Date.now()
        })
      }
    } else if (toolStatus === 'completed') {
      const tool = state.tools.entities.get(callID)
      if (tool) {
        tool.lifecycle = 'completed'
        tool.endedAt = Date.now()
        tool.rawOutput = part.state.output || ''
      }
    }
  }
  
  // Flush pending deltas for a partId after receiving message.part.updated
  function flushPendingDeltas(sessionId: string, partId: string, partType: 'reasoning' | 'text') {
    const state = streams[sessionId]
    if (!state) return
    
    const pending = state.pendingDeltas.get(partId)
    if (!pending || pending.length === 0) return
    
    if (partType === 'reasoning') {
      state.reasoning.status = 'thinking'
      state.reasoning.id = partId
      if (!state.reasoning.startedAt) {
        state.reasoning.startedAt = Date.now()
      }
    }
    
    const mergedDelta = pending.join('')
    
    if (partType === 'reasoning') {
      state.reasoning.status = 'thinking'
      state.reasoning.id = partId
      if (!state.reasoning.startedAt) {
        state.reasoning.startedAt = Date.now()
      }
      state.reasoning.content = state.reasoning.content + mergedDelta
      state.reasoning.status = 'done'
      state.reasoning.endedAt = Date.now()
    } else {
      state.message.content = state.message.content + mergedDelta
    }
    
    state.pendingDeltas.delete(partId)
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