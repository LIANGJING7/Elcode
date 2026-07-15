import { defineStore } from 'pinia'
import { ref, reactive, computed, watch, nextTick, markRaw, shallowRef } from 'vue'
import type { Conversation, Message, LocationRef, PromptInput, PromptOptions, ModelRef, TodoItem, FilePromptInput, FilePart, AgentPart, AgentPromptInput } from '../../types/ipc'
import type { SessionListQuery } from '../../types/session'
import { useWorkspaceStore } from './workspace'
import { useStreamingStore } from './streaming'
import { useModelsStore } from './models'
import { useUiStore } from './ui'
import { useSessionTodoStore } from './sessionTodo'
import { mapLifecycleToStatus, parseToolArgs } from './streaming/types'

// Default time filter: last 30 days
const DEFAULT_START_TIME = Date.now() - 30 * 24 * 60 * 60 * 1000
// Default page size
const DEFAULT_LIMIT = 50

// localStorage key for reverted messages persistence
const REVERTED_MESSAGES_STORAGE_KEY = 'opencode_reverted_messages'

// Helper to parse model ID
function parseModelId(modelId: string): ModelRef | undefined {
  if (!modelId) return undefined
  const parts = modelId.split('/')
  if (parts.length < 2) return undefined
  const providerID = parts[0]
  const modelID = parts.slice(1).join('/')
  return { providerID, modelID }
}

// Cache for agent names (populated on first use)
let cachedAgentNames: Set<string> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// localStorage helpers for reverted messages
function saveRevertedMessages(sessionId: string, revertPoint: string | null) {
  try {
    const data = localStorage.getItem(REVERTED_MESSAGES_STORAGE_KEY)
    const all = data ? JSON.parse(data) : {}
    if (revertPoint) {
      all[sessionId] = revertPoint
    } else {
      delete all[sessionId]
    }
    localStorage.setItem(REVERTED_MESSAGES_STORAGE_KEY, JSON.stringify(all))
  } catch (error) {
    console.error('[saveRevertedMessages] Failed:', error)
  }
}

function loadRevertedMessages(sessionId: string): string | null {
  try {
    const data = localStorage.getItem(REVERTED_MESSAGES_STORAGE_KEY)
    if (!data) return null
    const all = JSON.parse(data)
    return all[sessionId] || null
  } catch (error) {
    console.error('[loadRevertedMessages] Failed:', error)
    return null
  }
}

/**
 * Result of parsing @mentions in text
 */
export interface ParseResult {
  parts: PromptInput[]  // Structured parts for backend
  rawText: string       // Original text for UI display
}

/**
 * Parse @mentions in text and return structured result
 * @param text - The input text containing @mentions
 * @param directory - The workspace directory for resolving file paths
 */
export async function parseMentions(text: string, directory?: string): Promise<ParseResult> {
  try {
    const parts: PromptInput[] = []

    // Regex to find @mentions: @name or @path/to/file#10-20
    const mentionRegex = /@([a-zA-Z0-9_\-./]+(?:#\d+(?:-\d+)*)?)/g

    let lastIndex = 0
    let match: RegExpExecArray | null

    // Refresh agent cache if expired or empty
    const now = Date.now()
    if (!cachedAgentNames || now - cacheTimestamp > CACHE_TTL) {
      try {
        console.log('[parseMentions] Loading agents from backend, directory:', directory)
        const agents = await window.desktop.session.agents(directory)
        console.log('[parseMentions] Backend returned agents count:', agents.length)
        console.log('[parseMentions] Backend agents:', agents.map((a: any) => ({
          name: a.name,
          mode: a.mode,
          hidden: a.hidden,
          description: a.description?.slice(0, 50)
        })))
        
        cachedAgentNames = new Set(agents.map((a: any) => a.name))
        cacheTimestamp = now
        console.log('[parseMentions] Cached agent names:', Array.from(cachedAgentNames))
        console.log('[parseMentions] Cache will expire at:', new Date(now + CACHE_TTL).toLocaleTimeString())
      } catch (error) {
        console.error('[parseMentions] Failed to load agents:', error)
        if (!cachedAgentNames) cachedAgentNames = new Set()
      }
    } else {
      console.log('[parseMentions] Using cached agents, age:', Math.round((now - cacheTimestamp) / 1000), 's')
    }

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before this mention
      if (match.index > lastIndex) {
        parts.push({ type: 'text', text: text.slice(lastIndex, match.index) })
      }

      const mentionValue = match[1]
      const hashIndex = mentionValue.indexOf('#')
      const name = hashIndex === -1 ? mentionValue : mentionValue.slice(0, hashIndex)

      // Check if it's an agent (try both original and hyphen-to-space)
      const normalizedAgentName = name.replace(/-/g, ' ')
      console.log('[parseMentions] === Checking mention ===')
      console.log('[parseMentions]   Raw text:', match[0])
      console.log('[parseMentions]   Extracted name:', name)
      console.log('[parseMentions]   Normalized:', normalizedAgentName)
      console.log('[parseMentions]   Cache size:', cachedAgentNames?.size)
      console.log('[parseMentions]   Cache contents:', cachedAgentNames ? Array.from(cachedAgentNames) : 'null')
      console.log('[parseMentions]   Has exact match?', cachedAgentNames?.has(name))
      console.log('[parseMentions]   Has normalized match?', cachedAgentNames?.has(normalizedAgentName))
      
      if (cachedAgentNames?.has(name) || cachedAgentNames?.has(normalizedAgentName)) {
        const finalName = cachedAgentNames?.has(normalizedAgentName) ? normalizedAgentName : name
        console.log('[parseMentions] ✓ MATCHED as agent:', finalName)
        parts.push({
          type: 'agent',
          name: finalName,
          source: {
            value: match[0],
            start: match.index,
            end: match.index + match[0].length
          }
        })
      } else {
        console.log('[parseMentions] ✗ NOT matched, treating as file path')
        console.log('[parseMentions]   File path:', name)

        // Build file path and URL
        const filePath = name
        const fullPath = directory ? `${directory}/${name}` : name

        // Parse line range if present
        let filename = filePath
        let url = `file://${fullPath}`

        if (hashIndex !== -1) {
          const linePart = mentionValue.slice(hashIndex + 1)
          const [start, end] = linePart.split('-').map(Number)
          filename = `${filePath}#${start}${end ? `-${end}` : ''}`
          url = `file://${fullPath}?start=${start}${end ? `&end=${end}` : ''}`
        }

        parts.push({
          type: 'file',
          url,
          filename,
          mime: 'text/plain',
          source: { 
            type: 'file', 
            path: filePath,
            text: {
              start: match.index,
              end: match.index + match[0].length,
              value: match[0]
            }
          }
        })
      }

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', text: text.slice(lastIndex) })
    }

    // Log final result
    console.log('[parseMentions] === FINAL RESULT ===')
    console.log('[parseMentions]   Input text:', text)
    console.log('[parseMentions]   Parts count:', parts.length)
    console.log('[parseMentions]   Parts:', parts.map(p => ({
      type: p.type,
      name: (p as any).name || (p as any).filename || (p as any).text?.slice(0, 30)
    })))

    // Return structured result with parts and rawText
    return {
      parts: parts.length > 0 ? parts : [{ type: 'text', text }],
      rawText: text
    }
  } catch (error) {
    console.error('[parseMentions] Error parsing mentions:', error)
    // Fallback to plain text on any error
    return {
      parts: [{ type: 'text', text }],
      rawText: text
    }
  }
}

/**
 * PendingMessage - Client-side queue for messages waiting to be sent.
 */
export interface PendingMessage {
  id: string
  content: string
  createdAt: number
  agent?: string  // 'plan' or 'build'
  inputs?: PromptInput[]  // Full prompt inputs including files
  files?: FilePart[]  // Extracted file attachments
  agents?: AgentPart[]  // Extracted agent mentions
}

export const useSessionStore = defineStore('session', () => {
  const workspaceStore = useWorkspaceStore()
  const streamingStore = useStreamingStore()
  const ui = useUiStore()
  const sessionTodoStore = useSessionTodoStore()

  // ========================================
  // Query Layer - 查询参数
  // ========================================
  const query = reactive<SessionListQuery>({
    directory: '',
    workspace: '',
    search: '',
    start: DEFAULT_START_TIME,
    limit: DEFAULT_LIMIT,
  })

  // ========================================
  // Pagination Layer - 分页状态
  // ========================================
  const pagination = reactive({
    nextCursor: undefined as number | undefined,
  })

  // ========================================
  // State Layer - 数据状态
  // ========================================
  const state = reactive({
    conversations: [] as Conversation[],
    isLoading: false,
    isLoadingMore: false,
    error: null as string | null,
  })

  // ========================================
  // Private Layer - 内部状态
  // ========================================
  let generation = 0 // Race condition 保护

  // Session state
  const currentSessionId = ref<string | null>(null)
  const isPendingNewSession = ref(false)
  const messageIdToRole = new Map<string, 'user' | 'assistant'>()

  // Workspace session memory: remember last selected session per workspace
  const lastSessionByWorkspace = new Map<string, string>()
  // Pending session to restore after reload completes (for workspace switching)
  let pendingRestoreSession: string | null = null

  // Client-side message queues, keyed by sessionId
  const pendingQueues = reactive<Record<string, PendingMessage[]>>({})
  // Flag to disable auto processQueue when flushMessage is active (race condition protection)
  let flushInProgress = false
  // Flag to track if user manually interrupted - should not auto-send queue (persists until user clicks "立即")
  let manuallyInterrupted = false
  // Flag to prevent concurrent processQueue calls
  let processingQueue = false

  // Revert point: messages with id >= this are hidden (null = no revert active)
  const revertPoint = ref<string | null>(null)
  watch(revertPoint, (newVal, oldVal) => {
    console.log('[WATCH revertPoint] CHANGED:', { from: oldVal, to: newVal })
  })
  // Lock for preventing concurrent revert operations
  const isReverting = ref(false)
  
  // Helper: get or create queue array for a session
  function getQueue(sessionId: string): PendingMessage[] {
    if (!pendingQueues[sessionId]) {
      pendingQueues[sessionId] = []
    }
    return pendingQueues[sessionId]
  }
  
  // Helper: clear queue for a session
  function clearQueue(sessionId: string) {
    pendingQueues[sessionId] = []
  }

  // ========================================
  // Computed
  // ========================================
  const hasMore = computed(() => pagination.nextCursor !== undefined)

  // 当前会话的 pending queue
  const currentPendingQueue = computed(() => {
    if (!currentSessionId.value) return []
    return getQueue(currentSessionId.value)
  })

  const currentConversation = computed(() =>
    state.conversations.find(c => c.id === currentSessionId.value)
  )

  const currentMessages = computed(() => {
    const msgs = currentConversation.value?.messages || []
    console.log('[currentMessages] msgs:', msgs.length, 'revertPoint:', revertPoint.value, 'first 3 ids:', msgs.slice(0, 3).map(m => m.id))
    if (!revertPoint.value) return msgs
    const filtered = msgs.filter(m => m.id.startsWith('temp-') || m.id < revertPoint.value!)
    console.log('[currentMessages] filtered:', filtered.length, 'ids:', filtered.map(m => m.id))
    return filtered
  })

  const revertedMessages = computed(() => {
    const msgs = currentConversation.value?.messages || []
    if (!revertPoint.value) return []
    const filtered = msgs.filter(m => !m.id.startsWith('temp-') && m.id >= revertPoint.value! && m.role === 'user')
    console.log('[revertedMessages] revertPoint:', revertPoint.value, 'filtered:', filtered.length, 'ids:', filtered.map(m => m.id))
    return filtered
  })

  const hasActiveSession = computed(() =>
    currentSessionId.value !== null && workspaceStore.hasCurrentWorkspace
  )

  const streamingMessage = computed(() => {
    const stream = streamingStore.currentStream.value
    console.log('[DEBUG streamingMessage] currentStream:', stream ? { status: stream.status, sessionId: streamingStore.currentSessionId.value } : null)
    if (!stream || stream.status !== 'streaming') {
      console.log('[DEBUG streamingMessage] Returning null - stream:', stream ? 'exists' : 'null', 'status:', stream?.status)
      return null
    }

    const msgId = stream.message.id || 'streaming'
    const content = streamingStore.displayedContent.value

    const toolCalls = streamingStore.orderedTools.value.map(t => ({
      id: t.id,
      name: t.name,
      args: parseToolArgs(t.rawInput),
      status: mapLifecycleToStatus(t.lifecycle),
      result: t.rawOutput ? (typeof t.rawOutput === 'string' ? t.rawOutput : parseToolArgs(t.rawOutput)) : undefined,
      error: t.error || undefined
    }))

    return {
      id: msgId,
      role: 'assistant' as const,
      content,
      timestamp: new Date(),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      reasoning: stream.reasoning.status === 'done'
        ? streamingStore.displayedReasoning.value
        : undefined
    } as Message
  })

  // ========================================
  // Actions - 会话列表操作
  // ========================================

  /**
   * reload - 核心加载方法
   */
  async function reload(options?: { silent?: boolean }) {
    generation++
    const currentGen = generation

    console.log('[SESSION_STORE_RELOAD] Starting reload, gen:', currentGen, 'silent:', options?.silent)
    console.log('[SESSION_STORE_RELOAD] Query:', JSON.stringify(query))

    if (!options?.silent) {
      state.isLoading = true
      state.conversations = []
    }
    pagination.nextCursor = undefined
    state.error = null

    try {
      console.log('[SESSION_STORE_RELOAD] Calling window.desktop.session.list with params:', {
        directory: query.directory,
        workspace: query.workspace,
        start: query.start,
        search: query.search,
        limit: query.limit,
        roots: true,  // Only return root sessions (exclude subagent child sessions)
      })
      const result = await window.desktop.session.list({
        directory: query.directory,
        workspace: query.workspace,
        start: query.start,
        search: query.search,
        limit: query.limit,
        roots: true,  // Only return root sessions (exclude subagent child sessions)
      })

      console.log('[SESSION_STORE_RELOAD] Result received:', JSON.stringify(result).slice(0, 500))
      console.log('[SESSION_STORE_RELOAD] Conversations count:', result.conversations?.length ?? 0)
      
      // Debug: Check if any conversation has parentID (should be undefined for roots)
      if (result.conversations && result.conversations.length > 0) {
        const withParentId = result.conversations.filter(c => c.parentID !== undefined)
        console.log('[SESSION_STORE_RELOAD] Conversations with parentID (SHOULD BE 0):', withParentId.length)
        if (withParentId.length > 0) {
          console.error('[SESSION_STORE_RELOAD] BUG: Backend returned child sessions despite roots=true!', 
            withParentId.map(c => ({ id: c.id, title: c.title, parentID: c.parentID })))
        }
      }

      if (currentGen !== generation) {
        console.log('[SESSION_STORE_RELOAD] Generation mismatch, skipping - current:', currentGen, 'latest:', generation)
        return
      }

      state.conversations = result.conversations
      pagination.nextCursor = result.nextCursor ?? undefined
      
      console.log('[SESSION_STORE_RELOAD] State updated - conversations:', state.conversations.length, 'nextCursor:', pagination.nextCursor)
    } catch (e) {
      console.error('[SESSION_STORE_RELOAD] Error:', e)
      if (currentGen !== generation) return
      state.error = e instanceof Error ? e.message : 'Failed to load conversations'
    } finally {
      if (currentGen === generation) {
        state.isLoading = false
        console.log('[SESSION_STORE_RELOAD] Loading complete, isLoading set to false')

        // Restore remembered session after reload (for workspace switching)
        if (pendingRestoreSession) {
          const sessionId = pendingRestoreSession
          pendingRestoreSession = null
          const exists = state.conversations.find(c => c.id === sessionId)
          if (exists) {
            console.log('[DEBUG reload] Restoring session', sessionId)
            // Use nextTick to ensure Vue reactivity has processed the new conversations
            nextTick(() => {
              currentSessionId.value = sessionId
              isPendingNewSession.value = false
              streamingStore.setCurrentSession(sessionId)
              loadMessages(sessionId)
            })
          } else {
            console.log('[DEBUG reload] Remembered session', sessionId, 'no longer exists')
          }
        }
      }
    }
  }

  /**
   * tryLoadMore - UI 调用的入口
   */
  function tryLoadMore() {
    if (!hasMore.value) return
    if (state.isLoadingMore) return
    if (state.isLoading) return
    loadMore()
  }

  /**
   * loadMore - 内部加载更多方法
   */
  async function loadMore() {
    generation++
    const currentGen = generation

    state.isLoadingMore = true
    state.error = null

    try {
      console.log('[SESSION_STORE_LOADMORE] Calling window.desktop.session.list with params:', {
        ...query,
        cursor: pagination.nextCursor,
        roots: true,  // Only return root sessions (exclude subagent child sessions)
      })
      const result = await window.desktop.session.list({
        ...query,
        cursor: pagination.nextCursor,
        roots: true,  // Only return root sessions (exclude subagent child sessions)
      })

      if (currentGen !== generation) return

      // Debug: Check if any conversation has parentID
      if (result.conversations && result.conversations.length > 0) {
        const withParentId = result.conversations.filter(c => c.parentID !== undefined)
        console.log('[SESSION_STORE_LOADMORE] Loaded', result.conversations.length, 'conversations, with parentID (SHOULD BE 0):', withParentId.length)
        if (withParentId.length > 0) {
          console.error('[SESSION_STORE_LOADMORE] BUG: Backend returned child sessions despite roots=true!', 
            withParentId.map(c => ({ id: c.id, title: c.title, parentID: c.parentID })))
        }
      }

      // Append 去重
      const ids = new Set(state.conversations.map(c => c.id))
      for (const item of result.conversations) {
        if (!ids.has(item.id)) {
          state.conversations.push(item)
        }
      }
      pagination.nextCursor = result.nextCursor ?? undefined
    } catch (e) {
      if (currentGen !== generation) return
      state.error = e instanceof Error ? e.message : 'Failed to load more'
    } finally {
      if (currentGen === generation) {
        state.isLoadingMore = false
      }
    }
  }

  /**
   * setSearch - 设置搜索词
   */
  function setSearch(search: string) {
    query.search = search
  }

  /**
   * setWorkspace - 设置 workspace
   */
  function setWorkspace(workspace: string, directory: string) {
    query.workspace = workspace
    query.directory = directory
    reload()
  }

  /**
   * refresh - 刷新列表
   */
  function refresh() {
    reload()
  }

  /**
   * refreshSilent - 后台刷新
   */
  function refreshSilent() {
    reload({ silent: true })
  }

  // ========================================
  // Actions - 会话操作
  // ========================================

  function startNewSession() {
    currentSessionId.value = null
    isPendingNewSession.value = true
    streamingStore.setCurrentSession(null)
  }

  async function createSession(args: { workspaceId: string; path: string }) {
    if (!args.path) {
      state.error = 'No workspace path provided'
      return null
    }

    state.isLoading = true
    state.error = null
    try {
      const location: LocationRef = { directory: args.path, workspaceID: args.workspaceId }
      const sessionId = await window.desktop.session.create(location)
      currentSessionId.value = sessionId
      isPendingNewSession.value = false
      streamingStore.setCurrentSession(sessionId)
      // REMOVED: refreshSilent() - this clears state.conversations which would
      // delete the tempConv created by sendMessage. The session list will be
      // refreshed later when SSE event session.created is received.
      return sessionId
    } catch (e) {
      state.error = e instanceof Error ? e.message : 'Failed to create session'
      return null
    } finally {
      state.isLoading = false
    }
  }

  async function deleteSession(sessionId: string) {
    try {
      await window.desktop.session.delete(sessionId)
      state.conversations = state.conversations.filter(c => c.id !== sessionId)
      streamingStore.cleanupSession(sessionId)
      // Clear queue for this session
      clearQueue(sessionId)
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null
        isPendingNewSession.value = false
        streamingStore.setCurrentSession(null)
      }
    } catch (e) {
      state.error = e instanceof Error ? e.message : 'Failed to delete session'
    }
  }

  async function interrupt(sessionId: string) {
    console.log('[DEBUG interrupt] CALLED - sessionId:', sessionId, 'previous manuallyInterrupted:', manuallyInterrupted)
    console.log('[DEBUG interrupt] CALL STACK:', new Error().stack)
    manuallyInterrupted = true
    console.log('[DEBUG interrupt] manuallyInterrupted set to TRUE')
    try {
      await window.desktop.session.interrupt(sessionId, workspaceStore.currentWorkspace?.path)
    } catch (e) {
      state.error = e instanceof Error ? e.message : 'Failed to interrupt session'
    }
  }

  /**
   * flushMessage - Send a specific queued message immediately (bypass queue order).
   * Implementation: interrupt current streaming, then send this message.
   * After this message completes, auto-send remaining queue (reset manuallyInterrupted).
   */
  async function flushMessage(pending: PendingMessage) {
    if (!currentSessionId.value) return
    
    // Reset manuallyInterrupted - user wants to resume auto-sending queue after this message
    manuallyInterrupted = false
    // Set flag to prevent processQueue from being triggered by interrupt's SSE event
    flushInProgress = true
    
    // 从当前会话的队列中移除
    const queue = getQueue(currentSessionId.value)
    const index = queue.findIndex(p => p.id === pending.id)
    if (index !== -1) {
      queue.splice(index, 1)
    }
    
    // 中断当前流式
    await window.desktop.session.interrupt(currentSessionId.value, workspaceStore.currentWorkspace?.path)
    
    // 发送这条消息（sendPending 内部会在流式开始后重置 flushInProgress）
    await sendPending(pending, true)  // passing flag to indicate this is from flushMessage
  }

  /**
   * removeMessage - Remove a message from the current session's queue without sending.
   */
  function removeMessage(pendingId: string) {
    if (!currentSessionId.value) return
    const queue = getQueue(currentSessionId.value)
    const index = queue.findIndex(p => p.id === pendingId)
    if (index !== -1) {
      queue.splice(index, 1)
      console.log('[DEBUG removeMessage] Removed from queue:', pendingId, 'session:', currentSessionId.value)
    }
  }

  /**
   * editMessage - Get message content for editing (moves to input box).
   * Returns the content and removes from current session's queue.
   */
  function editMessage(pendingId: string): string | null {
    if (!currentSessionId.value) return null
    const queue = getQueue(currentSessionId.value)
    const index = queue.findIndex(p => p.id === pendingId)
    if (index !== -1) {
      const pending = queue[index]
      queue.splice(index, 1)
      console.log('[DEBUG editMessage] Editing:', pendingId, 'session:', currentSessionId.value)
      return pending.content
    }
    return null
  }

  async function rename(sessionId: string, title: string) {
    try {
      await window.desktop.session.update(sessionId, { title })
      const conv = state.conversations.find(c => c.id === sessionId)
      if (conv) conv.title = title
    } catch (e) {
      state.error = e instanceof Error ? e.message : 'Failed to rename session'
    }
  }

  async function clearAll(workspacePath: string) {
    const targets = state.conversations.filter(c => c.directory === workspacePath)
    for (const c of targets) {
      try {
        await window.desktop.session.delete(c.id)
        streamingStore.cleanupSession(c.id)
      } catch (e) {
        state.error = e instanceof Error ? e.message : 'Failed to delete session'
      }
    }
    reload()
  }

  function selectSession(sessionId: string) {
    currentSessionId.value = sessionId
    isPendingNewSession.value = false
    streamingStore.setCurrentSession(sessionId)

    // Load revert point from localStorage
    revertPoint.value = loadRevertedMessages(sessionId)

    // Remember this session for current workspace
    if (workspaceStore.currentWorkspace) {
      lastSessionByWorkspace.set(workspaceStore.currentWorkspace.id, sessionId)
      console.log('[DEBUG selectSession] Remembered session', sessionId, 'for workspace', workspaceStore.currentWorkspace.id)
    }

    // Note: pendingQueue is preserved per-session, not cleared on switch
    ui.resetForSession()
    loadMessages(sessionId)

    // Check if this session has queued messages and is not streaming
    // If so, trigger processQueue to send them
    const queue = getQueue(sessionId)
    if (queue.length > 0 && !streamingStore.isCurrentStreaming.value) {
      console.log('[DEBUG selectSession] Session has queued messages, triggering processQueue')
      processQueue()
    }
  }

  async function loadMessages(sessionId: string) {
    const loadStart = Date.now()
    console.log('[LOAD_MSG] ========== START ==========')
    console.log('[LOAD_MSG] Time:', new Date().toISOString())
    console.log('[LOAD_MSG] sessionId:', sessionId)
    console.log('[LOAD_MSG] Stack:', new Error().stack?.split('\n').slice(1, 4).join('\n'))
    
    if (!workspaceStore.currentWorkspace?.path) {
      console.log('[LOAD_MSG] No workspace path - skip')
      return
    }
    
    try {
      console.log('[LOAD_MSG] Fetching messages from backend...')
      const msgs = await window.desktop.session.messages(sessionId, 100, workspaceStore.currentWorkspace?.path)
      console.log('[LOAD_MSG] Received msgs count:', msgs.length)
      console.log('[LOAD_MSG] Backend msg IDs:', msgs.map(m => m.id))
      
      // Log tool calls structured data
      msgs.forEach((msg, idx) => {
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          msg.toolCalls.forEach((tc, tcIdx) => {
            console.log(`[LOAD_MSG] msg[${idx}] toolCall[${tcIdx}] name:`, tc.name)
            console.log(`[LOAD_MSG]   tc.output keys:`, tc.output ? Object.keys(tc.output) : 'undefined')
            console.log(`[LOAD_MSG]   tc.output.structured:`, tc.output?.structured ? JSON.stringify(tc.output.structured).slice(0, 200) : 'undefined')
          })
        }
      })
      
      const conv = state.conversations.find(c => c.id === sessionId)
      if (conv) {
        console.log('[LOAD_MSG] Before merge - conv.messages count:', conv.messages.length)
        console.log('[LOAD_MSG] Before merge - conv.messages IDs:', conv.messages.map(m => m.id))
        
        // 收集后端用户消息的内容，用于匹配 temp 消息
        const backendUserMessages = new Map<string, Message>()
        for (const msg of msgs) {
          if (msg.role === 'user') {
            backendUserMessages.set(msg.content, msg)
          }
        }
        
        // 合并消息：用后端消息替换 temp 消息（通过内容匹配）
        const merged = conv.messages.map(m => {
          // 如果是 temp 用户消息，检查后端是否有相同内容的消息
          if (m.id.startsWith('temp-') && m.role === 'user') {
            const backendMsg = backendUserMessages.get(m.content)
            if (backendMsg) {
              console.log('[LOAD_MSG] Replacing temp message with backend message:', m.id, '->', backendMsg.id)
              return backendMsg
            }
          }
          return m
        })
        
        // 添加后端有但前端没有的消息（assistant 回复等）
        const frontendIds = new Set(merged.map(m => m.id))
        for (const msg of msgs) {
          if (!frontendIds.has(msg.id)) {
            console.log('[LOAD_MSG] Adding new message from backend:', msg.id)
            merged.push(msg)
          }
        }
        
        conv.messages = merged.map(m => markRaw(m))
        
        console.log('[LOAD_MSG] After merge - conv.messages count:', conv.messages.length)
        console.log('[LOAD_MSG] After merge - conv.messages IDs:', conv.messages.map(m => m.id))
      } else {
        console.log('[LOAD_MSG] No conversation found for sessionId:', sessionId)
      }
      
      console.log('[LOAD_MSG] ========== END (success), elapsed:', Date.now() - loadStart, 'ms ==========')
    } catch (e) {
      console.error('[LOAD_MSG] ERROR:', e)
      console.log('[LOAD_MSG] ========== END (error) ==========')
    }
  }

  // ========================================
  // Actions - 消息发送
  // ========================================

  async function sendMessage(inputs: PromptInput[], options?: PromptOptions, rawText?: string) {
    console.log('[DEBUG sendMessage] === START ===')
    console.log('[DEBUG sendMessage] inputs:', inputs.length, 'types:', inputs.map(i => i.type))
    console.log('[DEBUG sendMessage] manuallyInterrupted:', manuallyInterrupted)
    console.log('[DEBUG sendMessage] options:', options)
    console.log('[DEBUG sendMessage] currentSessionId:', currentSessionId.value)
    console.log('[DEBUG sendMessage] isPendingNewSession:', isPendingNewSession.value)
    console.log('[DEBUG sendMessage] isCurrentStreaming:', streamingStore.isCurrentStreaming.value)
    console.log('[DEBUG sendMessage] workspaceStore.currentWorkspace:', workspaceStore.currentWorkspace?.path)

    // Extract text content for UI display and validation
    const textContent = inputs.filter(i => i.type === 'text').map(i => i.text).join(' ')
    const hasFiles = inputs.some(i => i.type === 'file')
    const hasAgents = inputs.some(i => i.type === 'agent')

    // Use rawText if provided, otherwise fall back to textContent
    const displayText = rawText || textContent

    console.log('[DEBUG sendMessage] textContent:', textContent)
    console.log('[DEBUG sendMessage] rawText:', rawText)
    console.log('[DEBUG sendMessage] displayText:', displayText)
    console.log('[DEBUG sendMessage] hasFiles:', hasFiles)
    console.log('[DEBUG sendMessage] hasAgents:', hasAgents)

    // Allow message if has text, files, or agents (e.g., @mention-only messages)
    if (!textContent.trim() && !hasFiles && !hasAgents) {
      console.log('[DEBUG sendMessage] ❌ RETURN: empty text and no files/agents')
      return
    }
    state.error = null

    console.log('[sendMessage] BEFORE: revertPoint:', revertPoint.value, 'msgs:', currentMessages.value.length, 'reverted:', revertedMessages.value.length)

    if (revertPoint.value) {
      const conv = currentConversation.value
      if (conv) {
        const idx = conv.messages.findIndex(m => m.id === revertPoint.value)
        console.log('[sendMessage] revertPoint:', revertPoint.value, 'found idx:', idx, 'total msgs:', conv.messages.length)
        if (idx !== -1) {
          console.log('[sendMessage] Splicing from idx', idx, 'msg IDs:', conv.messages.slice(idx).map(m => m.id))
          conv.messages.splice(idx)
        }
      }
      revertPoint.value = null
      if (currentSessionId.value) {
        saveRevertedMessages(currentSessionId.value, null)
      }
      console.log('[sendMessage] AFTER CLEAR: revertPoint:', revertPoint.value, 'msgs:', currentConversation.value?.messages.length)
    }

    // 如果正在流式，将消息加入队列（不调用 backend）
    if (streamingStore.isCurrentStreaming.value && currentSessionId.value) {
      console.log('[DEBUG] === Streaming active - enqueueing message ===')

      // Extract file and agent parts for UI display
      const pendingFiles: FilePart[] = inputs
        .filter((i): i is FilePromptInput => i.type === 'file')
        .map(i => ({
          type: 'file',
          mime: i.mime,
          name: i.filename,
          url: i.url
        }))

      const pendingAgents: AgentPart[] = inputs
        .filter((i): i is AgentPromptInput => i.type === 'agent')
        .map(i => ({
          type: 'agent',
          name: i.name,
          source: i.source
        }))

      const queueId = `queue-${Date.now()}-${Math.random().toString(36).slice(2)}`

      const pending: PendingMessage = {
        id: queueId,
        content: displayText,  // Use display text for UI
        createdAt: Date.now(),
        agent: options?.agent,
        inputs,
        files: pendingFiles.length > 0 ? pendingFiles : undefined,
        agents: pendingAgents.length > 0 ? pendingAgents : undefined
      }

      console.log('[DEBUG] Pending message created:')
      console.log('[DEBUG]   files:', pending.files?.length, pending.files?.map(f => f.name))
      console.log('[DEBUG]   agents:', pending.agents?.length, pending.agents?.map(a => a.name))

      // Push to current session's queue
      const queue = getQueue(currentSessionId.value)
      queue.push(pending)
      console.log('[DEBUG] Enqueued message, queueId:', queueId, 'queue length:', queue.length)

      return  // 不调用 backend，等待流式完成后 processQueue 处理
    }

    const modelsStore = useModelsStore()
    const modelRef = parseModelId(modelsStore.selectedModel)
    // Merge model from store with options passed in
    const promptOptions: PromptOptions = {
      model: modelRef,
      agent: options?.agent
    }

    if (isPendingNewSession.value && workspaceStore.currentWorkspace) {
      console.log('[DEBUG sendMessage] Creating new session...')
      const sessionId = await createSession({
        workspaceId: workspaceStore.currentWorkspace.id,
        path: workspaceStore.currentWorkspace.path
      })
      console.log('[DEBUG sendMessage] Session created:', sessionId, 'currentSessionId now:', currentSessionId.value)
      if (!sessionId) return
    }

    if (!currentSessionId.value) {
      console.log('[DEBUG sendMessage] ERROR: No currentSessionId after createSession')
      return
    }

    console.log('[DEBUG sendMessage] Setting streaming session and starting streaming')
    streamingStore.setCurrentSession(currentSessionId.value)

    // IMPORTANT: Start streaming BEFORE adding user message
    // This ensures Vue's reactive update sees streaming status as 'streaming'
    // and displays the "Thinking..." animation immediately
    streamingStore.resetStream(currentSessionId.value)
    streamingStore.startStreaming(currentSessionId.value)

    console.log('[DEBUG sendMessage] Streaming started - currentStream.status:', streamingStore.currentStream.value?.status)
    console.log('[DEBUG sendMessage] isCurrentStreaming:', streamingStore.isCurrentStreaming.value)

    // Create user message AFTER streaming started
    const fileParts: FilePart[] = inputs
      .filter((i): i is FilePromptInput => i.type === 'file')
      .map(i => ({
        type: 'file',
        mime: i.mime,
        name: i.filename,
        url: i.url
      }))

    const agentParts: AgentPart[] = inputs
      .filter((i): i is AgentPromptInput => i.type === 'agent')
      .map(i => ({
        type: 'agent',
        name: i.name,
        source: i.source
      }))

    console.log('[DEBUG sendMessage] === Extracted parts ===')
    console.log('[DEBUG sendMessage]   inputs count:', inputs.length)
    console.log('[DEBUG sendMessage]   inputs types:', inputs.map(i => i.type))
    console.log('[DEBUG sendMessage]   fileParts:', fileParts.length, fileParts.map(f => f.name))
    console.log('[DEBUG sendMessage]   agentParts:', agentParts.length, agentParts.map(a => a.name))

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: displayText,  // Use display text for UI (contains @mentions)
      timestamp: new Date(),
      files: fileParts.length > 0 ? fileParts : undefined,
      agents: agentParts.length > 0 ? agentParts : undefined
    }

    console.log('[DEBUG sendMessage] === userMessage created ===')
    console.log('[DEBUG sendMessage]   userMessage.files:', userMessage.files?.length, userMessage.files?.map(f => f.name))
    console.log('[DEBUG sendMessage]   userMessage.agents:', userMessage.agents?.length, userMessage.agents?.map(a => a.name))

    console.log('[DEBUG sendMessage] currentConversation:', currentConversation.value ? 'exists' : 'null')
    if (!currentConversation.value) {
      console.log('[DEBUG sendMessage] Creating temp conversation and pushing to state.conversations')
      const tempConv: Conversation = {
        id: currentSessionId.value,
        title: 'New Chat',
        messages: [userMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
        directory: workspaceStore.currentWorkspace?.path || ''
      }
      state.conversations.unshift(tempConv)
      console.log('[DEBUG sendMessage] state.conversations.length:', state.conversations.length)
    } else {
      console.log('[DEBUG sendMessage] Pushing to existing conversation.messages')
      if (!currentConversation.value.messages) {
        currentConversation.value.messages = []
      }
      currentConversation.value.messages.push(markRaw(userMessage))
      console.log('[DEBUG sendMessage] messages.length:', currentConversation.value.messages.length)
    }

    console.log('[DEBUG sendMessage] currentMessages computed:', currentMessages.value.length)
    console.log('[DEBUG sendMessage] streamingMessage computed:', streamingMessage.value ? 'exists' : 'null')

    try {
      console.log('[DEBUG sendMessage] Calling backend prompt with options:', promptOptions)
      await window.desktop.session.prompt(
        currentSessionId.value,
        inputs,
        promptOptions,
        workspaceStore.currentWorkspace?.path
      )
      console.log('[DEBUG sendMessage] Backend prompt call completed')
    } catch (e) {
      state.error = e instanceof Error ? e.message : 'Failed to send message'
      console.log('[DEBUG sendMessage] ERROR:', state.error)
    }

    console.log('[DEBUG sendMessage] === END ===')
  }

  /**
   * processQueue - Unified entry point for processing pending messages.
   * Called by STREAM_DONE event, selectSession, retry, resume, etc.
   */
  async function processQueue() {
    const startTime = Date.now()
    console.log('[QUEUE] ========== processQueue CALLED ==========')
    console.log('[QUEUE] Time:', new Date().toISOString())
    console.log('[QUEUE] Stack:', new Error().stack?.split('\n').slice(1, 4).join('\n'))
    
    // 防止并发调用
    if (processingQueue) {
      console.log('[QUEUE] Already processing - skip')
      return
    }
    
    // 如果正在流式，不处理队列
    const isStreaming = streamingStore.isCurrentStreaming.value
    console.log('[QUEUE] isCurrentStreaming:', isStreaming)
    if (isStreaming) {
      console.log('[QUEUE] Streaming active - skip')
      return
    }
    
    // 检查当前会话是否有队列
    if (!currentSessionId.value) {
      console.log('[QUEUE] No current session - skip')
      return
    }
    
    const queue = getQueue(currentSessionId.value)
    console.log('[QUEUE] Queue length:', queue.length)
    
    // 取出第一条排队消息
    const pending = queue.shift()
    if (!pending) {
      console.log('[QUEUE] Queue empty - nothing to send')
      return
    }
    
    processingQueue = true
    console.log('[QUEUE] Processing queued message:', pending.id)
    console.log('[QUEUE]   pending.content:', pending.content?.slice(0, 50))
    console.log('[QUEUE]   pending.agent:', pending.agent)
    console.log('[QUEUE]   pending.inputs count:', pending.inputs?.length)
    
    try {
      // 发送（调用 backend）
      await sendPending(pending)
      console.log('[QUEUE] sendPending completed, elapsed:', Date.now() - startTime, 'ms')
    } catch (e) {
      console.error('[QUEUE] sendPending ERROR:', e)
    } finally {
      processingQueue = false
      console.log('[QUEUE] ========== processQueue END ==========')
    }
  }

  /**
   * sendPending - Send a queued message to backend.
   * @param pending - The queued message to send
   * @param fromFlush - If true, reset flushInProgress after streaming starts
   */
  async function sendPending(pending: PendingMessage, fromFlush = false) {
    const sendPendingStart = Date.now()
    console.log('[SEND_PENDING] ========== START ==========')
    console.log('[SEND_PENDING] Time:', new Date().toISOString())
    console.log('[SEND_PENDING] pending.id:', pending.id)
    console.log('[SEND_PENDING] pending.content:', pending.content?.slice(0, 50))
    
    if (!currentSessionId.value) {
      console.log('[SEND_PENDING] ERROR: No currentSessionId')
      state.error = 'No active session'
      return
    }

    // Clear revert point before sending - same behavior as sendMessage
    console.log('[SEND_PENDING] revertPoint:', revertPoint.value)
    if (revertPoint.value) {
      const conv = currentConversation.value
      if (conv) {
        const idx = conv.messages.findIndex(m => m.id === revertPoint.value)
        console.log('[SEND_PENDING] splice idx:', idx, 'msgs before:', conv.messages.length)
        if (idx !== -1) {
          conv.messages.splice(idx)
          console.log('[SEND_PENDING] splice done, msgs after:', conv.messages.length)
        }
      }
      revertPoint.value = null
      saveRevertedMessages(currentSessionId.value, null)
    }

    // 获取选择的模型
    const modelsStore = useModelsStore()
    const modelRef = parseModelId(modelsStore.selectedModel)
    console.log('[SEND_PENDING] model:', modelRef)
    // Merge model with agent from pending message
    const promptOptions: PromptOptions = {
      model: modelRef,
      agent: pending.agent
    }
    console.log('[SEND_PENDING] promptOptions:', promptOptions)

    // Set streaming store to current session
    console.log('[SEND_PENDING] Before resetStream - stream status:', streamingStore.currentStream.value?.status, 'version:', streamingStore.currentStream.value?.version)
    streamingStore.setCurrentSession(currentSessionId.value)

    // IMPORTANT: Start streaming BEFORE adding user message
    // This ensures Vue's reactive update sees streaming status as 'streaming'
    // and displays the "Thinking..." animation immediately
    streamingStore.resetStream(currentSessionId.value)
    console.log('[SEND_PENDING] After resetStream - stream status:', streamingStore.currentStream.value?.status, 'version:', streamingStore.currentStream.value?.version)
    
    streamingStore.startStreaming(currentSessionId.value)
    console.log('[SEND_PENDING] After startStreaming - stream status:', streamingStore.currentStream.value?.status, 'version:', streamingStore.currentStream.value?.version)
    
    // Reset flushInProgress after streaming starts (if from flushMessage)
    if (fromFlush) {
      flushInProgress = false
    }

    // Create user message AFTER streaming started
    const fileParts: FilePart[] = (pending.inputs ?? [])
      .filter((i): i is FilePromptInput => i.type === 'file')
      .map(i => ({
        type: 'file',
        mime: i.mime,
        name: i.filename,
        url: i.url
      }))

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: pending.content,
      timestamp: new Date(),
      files: fileParts.length > 0 ? fileParts : undefined
    }
    console.log('[SEND_PENDING] Created temp user message:', userMessage.id)
    console.log('[SEND_PENDING] conv.messages before push:', currentConversation.value?.messages?.length)

    if (!currentConversation.value) {
      console.log('[SEND_PENDING] No currentConversation, creating new one')
      const tempConv: Conversation = {
        id: currentSessionId.value,
        title: 'New Chat',
        messages: [userMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
        directory: workspaceStore.currentWorkspace?.path || ''
      }
      state.conversations.unshift(tempConv)
    } else {
      if (!currentConversation.value.messages) {
        currentConversation.value.messages = []
      }
      currentConversation.value.messages.push(markRaw(userMessage))
      console.log('[SEND_PENDING] Pushed user message, conv.messages length:', currentConversation.value.messages.length)
    }

    const maxRetries = 3
    const retryDelay = 1000

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log('[SEND_PENDING] Calling prompt, attempt:', attempt + 1, 'time:', Date.now() - sendPendingStart, 'ms')

        // Use pending.inputs if available (already parsed), otherwise parse mentions
        let inputs: PromptInput[]
        if (pending.inputs) {
          // Deep clone to remove Vue reactive Proxy wrapper (IPC cannot serialize Proxy)
          inputs = JSON.parse(JSON.stringify(pending.inputs))
          console.log('[SEND_PENDING] Using cached inputs (cloned), count:', inputs.length)
        } else {
          console.log('[SEND_PENDING] Parsing mentions from content...')
          const result = await parseMentions(pending.content, workspaceStore.currentWorkspace?.path)
          inputs = result.parts
          console.log('[SEND_PENDING] Parsed inputs, count:', inputs.length)
        }
        
        console.log('[SEND_PENDING] === CALLING PROMPT ===')
        console.log('[SEND_PENDING] sessionId:', currentSessionId.value)
        console.log('[SEND_PENDING] inputs types:', inputs.map(i => i.type))
        console.log('[SEND_PENDING] promptOptions:', promptOptions)
        
        await window.desktop.session.prompt(
          currentSessionId.value,
          inputs,
          promptOptions,
          workspaceStore.currentWorkspace?.path
        )
        console.log('[SEND_PENDING] ✓ Prompt returned successfully, elapsed:', Date.now() - sendPendingStart, 'ms')
        console.log('[SEND_PENDING] ========== END (success) ==========')
        return
      } catch (e) {
        console.log('[SEND_PENDING] ✗ Prompt failed (attempt ' + (attempt + 1) + '/' + maxRetries + '):', e)
        const isBusyError = e instanceof Error && (
          e.message.includes('Session is busy') ||
          e.message.includes('SessionBusy') ||
          e.message.includes('busy')
        )

        if (isBusyError && attempt < maxRetries - 1) {
          console.log('[SEND_PENDING] Session busy, retrying in', retryDelay, 'ms...')
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue
        }

        state.error = e instanceof Error ? e.message : 'Failed to send queued message'
        console.log('[SEND_PENDING] ERROR, resetting stream:', state.error)
        // 出错时重置流式状态，防止一直显示"思考中"
        if (currentSessionId.value) {
          streamingStore.resetStream(currentSessionId.value)
        }
        console.log('[SEND_PENDING] ========== END (error) ==========')
        return
      }
    }
  }

  // ========================================
  // SSE Event Handlers
  // ========================================

  async function revertMessage(sessionId: string, messageId: string) {
    console.log('[revertMessage] ENTRY: sessionId:', sessionId, 'messageId:', messageId)
    if (isReverting.value) return
    if (streamingStore.isCurrentStreaming.value) {
      console.log('[revertMessage] Interrupting streaming before revert')
      await window.desktop.session.interrupt(sessionId, workspaceStore.currentWorkspace?.path)
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    isReverting.value = true

    const prevRevertPoint = revertPoint.value
    const msgs = currentConversation.value?.messages || []
    const targetIdx = msgs.findIndex(m => m.id === messageId)
    const targetMsg = targetIdx >= 0 ? msgs[targetIdx] : null
    let optimisticPoint: string | null = null
    if (targetMsg) {
      if (targetMsg.role === 'user') {
        optimisticPoint = targetMsg.id
      } else {
        for (let i = targetIdx - 1; i >= 0; i--) {
          if (msgs[i].role === 'user') {
            optimisticPoint = msgs[i].id
            break
          }
        }
        if (!optimisticPoint) optimisticPoint = messageId
      }
    }

    if (sessionId === currentSessionId.value && optimisticPoint) {
      revertPoint.value = optimisticPoint
      saveRevertedMessages(sessionId, optimisticPoint)
    }

    try {
      const result = await window.desktop.session.revert(sessionId, messageId, workspaceStore.currentWorkspace?.path)
      console.log('[revertMessage] FULL response:', JSON.stringify(result))
      const res = result as Record<string, unknown>
      const revertInfo = res?.revert as Record<string, unknown> | undefined
      const newRevertPoint = (revertInfo?.messageID as string) || null
      console.log('[revertMessage] new revertPoint:', newRevertPoint)

      if (sessionId === currentSessionId.value) {
        revertPoint.value = newRevertPoint
        saveRevertedMessages(sessionId, newRevertPoint)
        console.log('[revertMessage] revertPoint set, hidden msgs:', revertedMessages.value.length)
      }
    } catch (error) {
      console.error('[revertMessage] Failed:', error)
      if (sessionId === currentSessionId.value) {
        revertPoint.value = prevRevertPoint
        saveRevertedMessages(sessionId, prevRevertPoint)
      }
      state.error = error instanceof Error ? error.message : 'Failed to revert message'
    } finally {
      isReverting.value = false
    }
  }

  async function recoverMessage(sessionId: string, targetMessageId: string) {
    console.log('[recoverMessage] ENTRY:', targetMessageId)
    if (isReverting.value) return

    isReverting.value = true
    const prevRevertPoint = revertPoint.value

    const revertedList = revertedMessages.value
    const targetIndex = revertedList.findIndex(m => m.id === targetMessageId)
    console.log('[recoverMessage] targetIndex:', targetIndex, 'of', revertedList.length)
    if (targetIndex === -1) { isReverting.value = false; return }

    const nextUserMessage = revertedList.slice(targetIndex + 1).find(m => m.role === 'user')
    const optimisticPoint = nextUserMessage ? nextUserMessage.id : null

    if (sessionId === currentSessionId.value) {
      revertPoint.value = optimisticPoint
      saveRevertedMessages(sessionId, optimisticPoint)
    }

    try {
      let result: unknown
      if (nextUserMessage) {
        result = await window.desktop.session.revert(sessionId, nextUserMessage.id, workspaceStore.currentWorkspace?.path)
      } else {
        result = await window.desktop.session.unrevert(sessionId, workspaceStore.currentWorkspace?.path)
      }
      console.log('[recoverMessage] FULL response:', JSON.stringify(result))

      const res = result as Record<string, unknown>
      const revertInfo = res?.revert as Record<string, unknown> | undefined
      const newRevertPoint = (revertInfo?.messageID as string) || null
      console.log('[recoverMessage] new revertPoint:', newRevertPoint)

      if (sessionId === currentSessionId.value) {
        revertPoint.value = newRevertPoint
        saveRevertedMessages(sessionId, newRevertPoint)
        console.log('[recoverMessage] complete, hidden:', revertedMessages.value.length)
      }
    } catch (error) {
      console.error('[recoverMessage] Failed:', error)
      if (sessionId === currentSessionId.value) {
        revertPoint.value = prevRevertPoint
        saveRevertedMessages(sessionId, prevRevertPoint)
      }
      state.error = error instanceof Error ? error.message : 'Failed to recover message'
    } finally {
      isReverting.value = false
    }
  }

  function setupStreamListeners() {
    const removeStream = window.desktop.session.onStreamEvent((data) => {
      const event = data.event as Record<string, unknown>
      const eventType = event?.type as string
      const props = (event?.data ?? event?.properties) as Record<string, unknown> | undefined

      console.log('[SSE] eventType:', eventType, 'props:', JSON.stringify(props).slice(0, 200))

      const eventSessionId = props?.sessionID as string | undefined

      if (eventType?.startsWith('server.')) return

      if (eventType === 'session.updated') {
        const info = props?.info as Record<string, unknown> | undefined
        if (info) {
          const sessionId = info.id as string
          const newTitle = info.title as string | undefined
          const conv = state.conversations.find(c => c.id === sessionId)
          if (conv && newTitle) conv.title = newTitle
        }
        return
      }

      if (eventType === 'session.created') {
        // Don't call refreshSilent() - it clears state.conversations
        // which would delete the tempConv we just created.
        // Just update the conversation info if it exists.
        const info = props?.info as Record<string, unknown> | undefined
        if (info) {
          const sessionId = info.id as string
          const parentID = info.parentID as string | undefined
          
          // Skip child sessions (subagent sessions) - only show root sessions in sidebar
          if (parentID) {
            console.log('[SSE] session.created - skipping child session:', sessionId, 'parent:', parentID)
            return
          }
          
          const conv = state.conversations.find(c => c.id === sessionId)
          if (conv) {
            // Update existing tempConv with backend info
            const slug = info.slug as string | undefined
            if (slug) conv.title = slug
          } else {
            // Session not in our list - this shouldn't happen for our own sessions
            // but we can add it silently without clearing everything
            const newConv: Conversation = {
              id: sessionId,
              title: (info.slug as string) || 'New Chat',
              messages: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              directory: (info.directory as string) || ''
            }
            state.conversations.unshift(newConv)
          }
        }
        return
      }

      if (eventType === 'session.diff') return

      if (eventType === 'message.updated') {
        const info = props?.info as { role?: string; id?: string } | undefined
        if (info?.id && info?.role) {
          messageIdToRole.set(info.id, info.role as 'user' | 'assistant')
        }
      }

      if (eventType === 'message.removed') {
        // No action needed - revert state managed through API response
        return
      }

      if (eventSessionId) {
        const rawEvent = data.event as { type?: string }
        if (rawEvent.type === 'todo.updated') {
          console.log('[SSE] todo.updated event received, eventSessionId:', eventSessionId, 'currentSessionId:', currentSessionId.value)
          const props = (data.event as { properties?: { sessionID?: string; todos?: TodoItem[] } }).properties
          if (props?.sessionID && props?.todos) {
            sessionTodoStore.handleTodoUpdated({
              type: 'todo.updated',
              sessionID: props.sessionID,
              todos: props.todos
            })
          } else {
            console.error('[SSE] todo.updated missing properties:', data.event)
          }
        } else {
          streamingStore.handleEvent(eventSessionId, data.event)
        }
        
        // STREAM_DONE: trigger processQueue (event-driven)
        // stream.ended: SSE connection closed (backend normal completion or error)
        // session.idle: V1 idle status event (interrupt completion)
        // Skip if flushInProgress (race condition protection)
        // Skip if manuallyInterrupted (user clicked interrupt button - persists until user clicks "立即")
        console.log('[SSE_HANDLER] ========== EVENT CHECK ==========')
        console.log('[SSE_HANDLER] eventType:', eventType)
        console.log('[SSE_HANDLER] eventSessionId:', eventSessionId)
        console.log('[SSE_HANDLER] currentSessionId:', currentSessionId.value)
        console.log('[SSE_HANDLER] manuallyInterrupted:', manuallyInterrupted)
        console.log('[SSE_HANDLER] flushInProgress:', flushInProgress)
        console.log('[SSE_HANDLER] stream status:', streamingStore.currentStream.value?.status)
        console.log('[SSE_HANDLER] stream version:', streamingStore.currentStream.value?.version)
        
        if (eventType === 'stream.ended' || eventType === 'session.idle') {
          console.log('[SSE_HANDLER] === STREAM END EVENT ===')
          if (flushInProgress) {
            console.log('[SSE_HANDLER] Skipping processQueue - flushInProgress')
          } else if (manuallyInterrupted) {
            console.log('[SSE_HANDLER] Skipping processQueue - manually interrupted (persisted)')
          } else {
            console.log('[SSE_HANDLER] ⚡ TRIGGERING processQueue')
            console.log('[SSE_HANDLER] Stack:', new Error().stack?.split('\n').slice(1, 4).join('\n'))
            processQueue()
          }
        }
        console.log('[SSE_HANDLER] ========== EVENT CHECK END ==========')
      }
    })

    // Use sync watch to ensure finalMsg is added immediately when status becomes 'done'
    // This prevents race condition where second message's resetStream() clears status
    // before first message's watch handler executes
    watch(
      () => streamingStore.currentStream.value?.status,
      (status) => {
        const watchTime = Date.now()
        console.log('[WATCH] ========== STATUS CHANGE ==========')
        console.log('[WATCH] Time:', new Date().toISOString())
        console.log('[WATCH] Status changed to:', status)
        console.log('[WATCH] Stack:', new Error().stack?.split('\n').slice(1, 4).join('\n'))
        
        if (status === 'done' && currentConversation.value) {
          const stream = streamingStore.currentStream.value
          if (!stream) {
            console.log('[WATCH] No stream - skipping')
            return
          }

          console.log('[WATCH] Stream version:', stream.version)
          console.log('[WATCH] Current stream version:', streamingStore.currentStream.value?.version)

          // 检查流是否已经被新流替换（version 检查）
          // 如果 version 已经改变，说明新流已经启动，跳过处理
          const currentVersion = streamingStore.currentStream.value?.version
          if (currentVersion !== stream.version) {
            console.log('[WATCH] ⚠️ VERSION MISMATCH - skipping')
            console.log('[WATCH]   stream.version:', stream.version)
            console.log('[WATCH]   currentVersion:', currentVersion)
            return
          }

          console.log('[WATCH] Building final message:')
          console.log('[WATCH]   stream.message.id:', stream.message.id)
          console.log('[WATCH]   stream.message.content length:', stream.message.content.length)
          console.log('[WATCH]   stream.reasoning.status:', stream.reasoning.status)
          console.log('[WATCH]   stream.reasoning.content length:', stream.reasoning.content.length)
          console.log('[WATCH]   displayedContent:', streamingStore.displayedContent.value?.slice(0, 100))
          console.log('[WATCH]   displayedReasoning:', streamingStore.displayedReasoning.value?.slice(0, 100))

          const finalMsg: Message = {
            id: stream.message.id || 'streaming',
            role: 'assistant',
            content: streamingStore.displayedContent.value,
            timestamp: new Date(),
            duration: stream.startedAt ? Date.now() - stream.startedAt : undefined,
            reasoningDuration: stream.reasoning.startedAt && stream.reasoning.endedAt
              ? stream.reasoning.endedAt - stream.reasoning.startedAt
              : undefined,
            toolCalls: streamingStore.orderedTools.value.length > 0
              ? streamingStore.orderedTools.value.map(t => ({
                  id: t.id,
                  name: t.name,
                  args: parseToolArgs(t.rawInput),
                  status: mapLifecycleToStatus(t.lifecycle),
                  result: t.rawOutput ? (typeof t.rawOutput === 'string' ? t.rawOutput : parseToolArgs(t.rawOutput)) : undefined,
                  error: t.error || undefined
                }))
              : undefined,
            reasoning: stream.reasoning.status === 'done'
              ? streamingStore.displayedReasoning.value
              : undefined,
            error: stream.stepError || undefined
          }

          console.log('[WATCH] Final message reasoning:', finalMsg.reasoning?.slice(0, 100) || 'undefined')
          console.log('[WATCH] Final message content:', finalMsg.content?.slice(0, 100) || 'empty')
          console.log('[WATCH] Final message error:', finalMsg.error)

          const exists = currentConversation.value.messages.some(m => m.id === finalMsg.id)
          console.log('[WATCH] Message exists:', exists)

          // Add message if it doesn't exist and has content OR error
          if (!exists && (finalMsg.content || finalMsg.error)) {
            currentConversation.value.messages.push(markRaw(finalMsg))
            console.log('[WATCH] ✓ Assistant message added with reasoning:', finalMsg.reasoning ? 'yes' : 'no', 'error:', finalMsg.error ? 'yes' : 'no')
          } else {
            console.log('[WATCH] Skipped - exists or no content/error')
          }

          // Only reset and loadMessages if this is still the current stream
          // (new stream may have started during this handler)
          const stillCurrent = streamingStore.currentStream.value?.version === stream.version
          console.log('[WATCH] stillCurrent:', stillCurrent, 'version check:', streamingStore.currentStream.value?.version, '===', stream.version)
          
          if (currentSessionId.value && stillCurrent) {
            console.log('[WATCH] === CALLING RESET STREAM ===')
            console.log('[WATCH] conv.messages before reset:', currentConversation.value.messages.length)
            streamingStore.resetStream(currentSessionId.value)
            console.log('[WATCH] Stream reset, version now:', streamingStore.currentStream.value?.version)
            // Refresh messages from backend to get real IDs (replaces temp messages)
            console.log('[WATCH] === CALLING LOAD MESSAGES ===')
            loadMessages(currentSessionId.value)
            console.log('[WATCH] loadMessages called')
          } else if (!stillCurrent) {
            console.log('[WATCH] ⚠️ SKIPPING reset - new stream started (version changed)')
          }
        }
        console.log('[WATCH] ========== STATUS CHANGE END ==========')
      },
      { flush: 'sync' }  // Sync watch to prevent race condition with processQueue
    )

    return removeStream
  }

  // ========================================
  // Watchers
  // ========================================

  // Track previous workspace to detect switches
  let previousWorkspaceId: string | null = null

  watch(
    () => workspaceStore.currentWorkspace,
    (newWorkspace, oldWorkspace) => {
      // Save current session to old workspace before switching
      if (oldWorkspace && currentSessionId.value) {
        lastSessionByWorkspace.set(oldWorkspace.id, currentSessionId.value)
        console.log('[DEBUG workspace switch] Saved session', currentSessionId.value, 'to workspace', oldWorkspace.id)
      }

      if (newWorkspace) {
        // Load conversations for new workspace
        setWorkspace(newWorkspace.id, newWorkspace.path)

        // Set pending restore session (will be restored after reload completes)
        const rememberedSession = lastSessionByWorkspace.get(newWorkspace.id)
        if (rememberedSession) {
          console.log('[DEBUG workspace switch] Will restore session', rememberedSession, 'for workspace', newWorkspace.id)
          pendingRestoreSession = rememberedSession
        } else {
          console.log('[DEBUG workspace switch] No remembered session for workspace', newWorkspace.id)
          currentSessionId.value = null
          isPendingNewSession.value = false
          streamingStore.setCurrentSession(null)
        }

        previousWorkspaceId = newWorkspace.id
      } else {
        // No workspace: clear everything
        state.conversations = []
        pagination.nextCursor = undefined
        state.isLoading = false
        state.isLoadingMore = false
        state.error = null
        currentSessionId.value = null
        isPendingNewSession.value = false
        streamingStore.setCurrentSession(null)
        previousWorkspaceId = null
      }
    },
    { immediate: true }
  )

  // ========================================
  // Return
  // ========================================

  return {
    // State
    state,
    pagination,
    query,

    // Computed
    hasMore,
    currentSessionId,
    streamingMessage,
    isPendingNewSession,
    currentConversation,
    currentMessages,
    hasActiveSession,

    // Actions - 会话列表
    reload,
    tryLoadMore,
    setSearch,
    setWorkspace,
    refresh,
    refreshSilent,

    // Actions - 会话操作
    startNewSession,
    createSession,
    deleteSession,
    interrupt,
    rename,
    clearAll,
    selectSession,
    loadMessages,

    // Actions - 消息发送
    sendMessage,
    currentPendingQueue,
    flushMessage,
    removeMessage,
    editMessage,

    // Revert/Recover
    revertedMessages,
    isReverting,
    revertMessage,
    recoverMessage,

    // Setup
    setupStreamListeners,
  }
})