import { defineStore } from 'pinia'
import { ref, reactive, computed, watch, nextTick } from 'vue'
import type { Conversation, Message, LocationRef, PromptInput, PromptOptions, ModelRef } from '../../types/ipc'
import { useWorkspaceStore } from './workspace'
import { useStreamingStore } from './streaming'
import { useModelsStore } from './models'
import { useUiStore } from './ui'
import { mapLifecycleToStatus, parseToolArgs } from './streaming/types'

// Default time filter: last 30 days
const DEFAULT_START_TIME = Date.now() - 30 * 24 * 60 * 60 * 1000
// Default page size
const DEFAULT_LIMIT = 50

// Helper to parse model ID
function parseModelId(modelId: string): ModelRef | undefined {
  if (!modelId) return undefined
  const parts = modelId.split('/')
  if (parts.length < 2) return undefined
  const providerID = parts[0]
  const modelID = parts.slice(1).join('/')
  return { providerID, modelID }
}

/**
 * PendingMessage - Client-side queue for messages waiting to be sent.
 */
export interface PendingMessage {
  id: string
  content: string
  createdAt: number
  agent?: string  // 'plan' or 'build'
}

export const useSessionStore = defineStore('session', () => {
  const workspaceStore = useWorkspaceStore()
  const streamingStore = useStreamingStore()
  const ui = useUiStore()

  // ========================================
  // Query Layer - 查询参数
  // ========================================
  const query = reactive({
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
    nextCursor: null as number | null,
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
  const hasMore = computed(() => pagination.nextCursor !== null)

  // 当前会话的 pending queue
  const currentPendingQueue = computed(() => {
    if (!currentSessionId.value) return []
    return getQueue(currentSessionId.value)
  })

  const currentConversation = computed(() =>
    state.conversations.find(c => c.id === currentSessionId.value)
  )

  const currentMessages = computed(() =>
    currentConversation.value?.messages || []
  )

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
    pagination.nextCursor = null
    state.error = null

    try {
      console.log('[SESSION_STORE_RELOAD] Calling window.desktop.session.list...')
      const result = await window.desktop.session.list({
        directory: query.directory,
        workspace: query.workspace,
        start: query.start,
        search: query.search,
        limit: query.limit,
      })

      console.log('[SESSION_STORE_RELOAD] Result received:', JSON.stringify(result).slice(0, 500))
      console.log('[SESSION_STORE_RELOAD] Conversations count:', result.conversations?.length ?? 0)

      if (currentGen !== generation) {
        console.log('[SESSION_STORE_RELOAD] Generation mismatch, skipping - current:', currentGen, 'latest:', generation)
        return
      }

      state.conversations = result.conversations
      pagination.nextCursor = result.nextCursor ?? null
      
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
      const result = await window.desktop.session.list({
        ...query,
        cursor: pagination.nextCursor,
      })

      if (currentGen !== generation) return

      // Append 去重
      const ids = new Set(state.conversations.map(c => c.id))
      for (const item of result.conversations) {
        if (!ids.has(item.id)) {
          state.conversations.push(item)
        }
      }
      pagination.nextCursor = result.nextCursor ?? null
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
    try {
      await window.desktop.session.interrupt(sessionId, workspaceStore.currentWorkspace?.path)
      // 清空该会话的客户端队列
      const queue = getQueue(sessionId)
      console.log('[DEBUG interrupt] Clearing queue for session:', sessionId, 'count:', queue.length)
      clearQueue(sessionId)
    } catch (e) {
      state.error = e instanceof Error ? e.message : 'Failed to interrupt session'
    }
  }

  /**
   * flushMessage - Send a specific queued message immediately (bypass queue order).
   * Implementation: interrupt current streaming, then send this message.
   */
  async function flushMessage(pending: PendingMessage) {
    if (!currentSessionId.value) return
    
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
    
    // Clear flag - now safe to allow processQueue again
    flushInProgress = false
    
    // 发送这条消息
    await sendPending(pending)
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
    if (!workspaceStore.currentWorkspace?.path) return
    try {
      const msgs = await window.desktop.session.messages(sessionId, 100, workspaceStore.currentWorkspace?.path)
      const conv = state.conversations.find(c => c.id === sessionId)
      if (conv) {
        const existingMap = new Map(conv.messages.map(m => [m.id, m]))
        const merged = msgs.map(m => {
          const existing = existingMap.get(m.id)
          if (existing && !m.content && existing.content) {
            return { ...existing, id: m.id }
          }
          return m
        })
        conv.messages = merged
      }
    } catch (e) {
      console.error('Failed to load messages:', e)
    }
  }

  // ========================================
  // Actions - 消息发送
  // ========================================

  async function sendMessage(content: string, options?: PromptOptions) {
    console.log('[DEBUG sendMessage] === START ===')
    console.log('[DEBUG sendMessage] content:', content.slice(0, 50))
    console.log('[DEBUG sendMessage] options:', options)
    console.log('[DEBUG sendMessage] currentSessionId:', currentSessionId.value)
    console.log('[DEBUG sendMessage] isPendingNewSession:', isPendingNewSession.value)

    if (!content.trim()) return
    state.error = null

    // 如果正在流式，将消息加入队列（不调用 backend）
    if (streamingStore.isCurrentStreaming.value && currentSessionId.value) {
      console.log('[DEBUG] === Streaming active - enqueueing message ===')

      const queueId = `queue-${Date.now()}-${Math.random().toString(36).slice(2)}`

      const pending: PendingMessage = {
        id: queueId,
        content,
        createdAt: Date.now(),
        agent: options?.agent
      }

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
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }

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
      currentConversation.value.messages.push(userMessage)
      console.log('[DEBUG sendMessage] messages.length:', currentConversation.value.messages.length)
    }

    console.log('[DEBUG sendMessage] currentMessages computed:', currentMessages.value.length)
    console.log('[DEBUG sendMessage] streamingMessage computed:', streamingMessage.value ? 'exists' : 'null')

    try {
      const prompt: PromptInput[] = [{ type: 'text', text: content }]
      console.log('[DEBUG sendMessage] Calling backend prompt with options:', promptOptions)
      await window.desktop.session.prompt(
        currentSessionId.value,
        prompt,
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
    // 如果正在流式，不处理队列
    if (streamingStore.isCurrentStreaming.value) {
      console.log('[DEBUG processQueue] Streaming active - skip')
      return
    }
    
    // 检查当前会话是否有队列
    if (!currentSessionId.value) {
      console.log('[DEBUG processQueue] No current session - skip')
      return
    }
    
    const queue = getQueue(currentSessionId.value)
    
    // 取出第一条排队消息
    const pending = queue.shift()
    if (!pending) {
      console.log('[DEBUG processQueue] Queue empty - nothing to send')
      return
    }
    
    console.log('[DEBUG processQueue] Processing queued message:', pending.id, 'session:', currentSessionId.value)
    
    // 发送（调用 backend）
    await sendPending(pending)
  }

  /**
   * sendPending - Send a queued message to backend.
   */
  async function sendPending(pending: PendingMessage) {
    if (!currentSessionId.value) {
      console.log('[DEBUG sendPending] No currentSessionId - cannot send')
      state.error = 'No active session'
      return
    }

    // 获取选择的模型
    const modelsStore = useModelsStore()
    const modelRef = parseModelId(modelsStore.selectedModel)
    // Merge model with agent from pending message
    const promptOptions: PromptOptions = {
      model: modelRef,
      agent: pending.agent
    }

    // Set streaming store to current session
    streamingStore.setCurrentSession(currentSessionId.value)

    // IMPORTANT: Start streaming BEFORE adding user message
    // This ensures Vue's reactive update sees streaming status as 'streaming'
    // and displays the "Thinking..." animation immediately
    streamingStore.resetStream(currentSessionId.value)
    streamingStore.startStreaming(currentSessionId.value)

    // Create user message AFTER streaming started
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: pending.content,
      timestamp: new Date()
    }

    if (!currentConversation.value) {
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
      currentConversation.value.messages.push(userMessage)
    }

    try {
      console.log('[DEBUG sendPending] Sending queued message:', pending.id, 'with agent:', pending.agent)
      const prompt: PromptInput[] = [{ type: 'text', text: pending.content }]
      await window.desktop.session.prompt(
        currentSessionId.value,
        prompt,
        promptOptions,
        workspaceStore.currentWorkspace?.path
      )
      console.log('[DEBUG sendPending] ✓ Prompt sent successfully')
    } catch (e) {
      console.log('[DEBUG sendPending] ✗ Prompt failed:', e)
      state.error = e instanceof Error ? e.message : 'Failed to send queued message'
    }
  }

  // ========================================
  // SSE Event Handlers
  // ========================================

  function setupStreamListeners() {
    const removeStream = window.desktop.session.onStreamEvent((data) => {
      const event = data.event as Record<string, unknown>
      const eventType = event?.type as string

      const props = (event?.data ?? event?.properties) as Record<string, unknown> | undefined
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

      if (eventSessionId) {
        streamingStore.handleEvent(eventSessionId, data.event)
        
        // STREAM_DONE: trigger processQueue (event-driven)
        // stream.ended: SSE connection closed (backend normal completion or error)
        // session.idle: V1 idle status event (interrupt completion)
        // Skip if flushInProgress (race condition protection)
        if (eventType === 'stream.ended' || eventType === 'session.idle') {
          if (flushInProgress) {
            console.log('[SSE STREAM_DONE] Skipping processQueue - flushInProgress')
          } else {
            console.log('[SSE STREAM_DONE] Triggering processQueue')
            processQueue()
          }
        }
      }
    })

    // Use sync watch to ensure finalMsg is added immediately when status becomes 'done'
    // This prevents race condition where second message's resetStream() clears status
    // before first message's watch handler executes
    watch(
      () => streamingStore.currentStream.value?.status,
      (status) => {
        console.log('[WATCH] Streaming status changed to:', status)
        
        if (status === 'done' && currentConversation.value) {
          const stream = streamingStore.currentStream.value
          if (!stream) {
            console.log('[WATCH] No stream - skipping')
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
              : undefined
          }

          console.log('[WATCH] Final message reasoning:', finalMsg.reasoning?.slice(0, 100) || 'undefined')
          console.log('[WATCH] Final message content:', finalMsg.content?.slice(0, 100) || 'empty')

          const exists = currentConversation.value.messages.some(m => m.id === finalMsg.id)
          console.log('[WATCH] Message exists:', exists)

          if (!exists && finalMsg.content) {
            currentConversation.value.messages.push(finalMsg)
            console.log('[WATCH] ✓ Assistant message added with reasoning:', finalMsg.reasoning ? 'yes' : 'no')
          } else {
            console.log('[WATCH] Skipped - exists or no content')
          }

          // Reset stream synchronously (no nextTick needed with sync watch)
          if (currentSessionId.value) {
            console.log('[WATCH] Resetting stream for session:', currentSessionId.value)
            streamingStore.resetStream(currentSessionId.value)
          }
        }
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
        pagination.nextCursor = null
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

    // Setup
    setupStreamListeners,
  }
})