import { defineStore } from 'pinia'
import { ref, computed, watch, nextTick } from 'vue'
import type { Conversation, Message, LocationRef, PromptInput, PromptOptions, ModelRef } from '../../types/ipc'
import { useWorkspaceStore } from './workspace'
import { useStreamingStore } from './streaming'
import { useModelsStore } from './models'
import { useUiStore } from './ui'
import { mapLifecycleToStatus, parseToolArgs } from './streaming/types'

// Helper to parse model ID (format: "provider/model" or "provider/modelID")
function parseModelId(modelId: string): ModelRef | undefined {
  if (!modelId) return undefined
  const parts = modelId.split('/')
  if (parts.length < 2) return undefined
  const providerID = parts[0]
  const modelID = parts.slice(1).join('/') // Handle models like "openai/gpt-4-turbo"
  return { providerID, modelID }
}

export const useSessionStore = defineStore('session', () => {
  const workspaceStore = useWorkspaceStore()
  const streamingStore = useStreamingStore()
  const ui = useUiStore()
  
  const currentSessionId = ref<string | null>(null)
  const conversations = ref<Conversation[]>([])
  // Store message ID to role mapping for V1 events
  const messageIdToRole = new Map<string, 'user' | 'assistant'>()
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  // 标记是否处于"新建会话待发送"状态
  const isPendingNewSession = ref(false)

  const currentConversation = computed(() => 
    conversations.value.find(c => c.id === currentSessionId.value)
  )
  
  const currentMessages = computed(() => 
    currentConversation.value?.messages || []
  )

  const hasActiveSession = computed(() => 
    currentSessionId.value !== null && workspaceStore.hasCurrentWorkspace
  )

  // Streaming message computed from streaming store's currentStream
  const streamingMessage = computed(() => {
    const stream = streamingStore.currentStream.value
    // Only show streaming message during active streaming, not when done/error/idle
    if (!stream || stream.status !== 'streaming') return null
    
    // Build message from streaming state
    const msgId = stream.message.id || 'streaming'
    const content = streamingStore.displayedContent.value
    
    // Build tool calls from tools Map
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

  watch(
    () => workspaceStore.currentWorkspace,
    async (newWorkspace) => {
      if (newWorkspace) {
        await loadConversations(newWorkspace.path)
      } else {
        conversations.value = []
        currentSessionId.value = null
        isPendingNewSession.value = false
        streamingStore.setCurrentSession(null)
      }
    },
    { immediate: true }
  )

  // 新建会话：不立即调用 API，只设置 pending 状态
  function startNewSession() {
    currentSessionId.value = null
    isPendingNewSession.value = true
    // Set streaming store to no session
    streamingStore.setCurrentSession(null)
  }

  // 实际创建会话（在发送第一条消息时调用）
  async function createSession(args: { workspaceId: string; path: string }) {
    if (!args.path) {
      error.value = 'No workspace path provided'
      return null
    }

    isLoading.value = true
    error.value = null
    try {
      const location: LocationRef = { directory: args.path, workspaceID: args.workspaceId }
      const sessionId = await window.desktop.session.create(location)
      currentSessionId.value = sessionId
      isPendingNewSession.value = false
      // Set streaming store to this session
      streamingStore.setCurrentSession(sessionId)
      await loadConversations(args.path)
      return sessionId
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create session'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function loadConversations(directory?: string) {
    isLoading.value = true
    try {
      const dir = directory || workspaceStore.currentWorkspace?.path
      if (!dir) {
        conversations.value = []
        return
      }
      conversations.value = await window.desktop.session.list(dir)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load conversations'
    } finally {
      isLoading.value = false
    }
  }

  async function sendMessage(content: string) {
    console.log('[DEBUG] === sendMessage CALLED ===')
    console.log('[DEBUG] Content:', content.slice(0, 50))
    console.log('[DEBUG] isPendingNewSession:', isPendingNewSession.value)
    console.log('[DEBUG] currentSessionId:', currentSessionId.value)
    
    if (!content.trim()) return
    error.value = null
    
    // 获取选择的模型
    const modelsStore = useModelsStore()
    const modelRef = parseModelId(modelsStore.selectedModel)
    const promptOptions: PromptOptions = modelRef ? { model: modelRef } : {}
    console.log('[DEBUG] Selected model:', modelRef)
    
    // 如果是 pending 状态，先创建会话
    if (isPendingNewSession.value && workspaceStore.currentWorkspace) {
      console.log('[DEBUG] === Creating new session ===')
      const sessionId = await createSession({
        workspaceId: workspaceStore.currentWorkspace.id,
        path: workspaceStore.currentWorkspace.path
      })
      console.log('[DEBUG] createSession returned:', sessionId)
      if (!sessionId) return
    }
    
    if (!currentSessionId.value) {
      console.log('[DEBUG] ✗ No currentSessionId - RETURN')
      return
    }
    
    // Set streaming store to current session
    streamingStore.setCurrentSession(currentSessionId.value)
    
    console.log('[DEBUG] === Adding user message ===')
    console.log('[DEBUG] currentConversation:', currentConversation.value ? 'exists' : 'null')
    
    // 创建临时用户消息用于显示
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }
    
    // 确保 currentConversation 存在，如果不存在则创建临时对象
    if (!currentConversation.value) {
      console.log('[DEBUG] Creating tempConv')
      const tempConv: Conversation = {
        id: currentSessionId.value,
        title: 'New Chat',
        messages: [userMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
        directory: workspaceStore.currentWorkspace?.path || ''
      }
      conversations.value.push(tempConv)
      console.log('[DEBUG] ✓ tempConv pushed, messages count:', tempConv.messages.length)
    } else {
      console.log('[DEBUG] Adding to existing conversation')
      if (!currentConversation.value.messages) {
        currentConversation.value.messages = []
        console.log('[DEBUG] Initialized empty messages array')
      }
      currentConversation.value.messages.push(userMessage)
      console.log('[DEBUG] ✓ User message added, total messages:', currentConversation.value.messages.length)
    }

    // Reset the stream state for this session before sending
    streamingStore.resetStream(currentSessionId.value)

    try {
      console.log('[DEBUG] === Sending prompt ===')
      const prompt: PromptInput[] = [{ type: 'text', text: content }]
      await window.desktop.session.prompt(
        currentSessionId.value, 
        prompt, 
        promptOptions,
        workspaceStore.currentWorkspace?.path
      )
      console.log('[DEBUG] ✓ prompt sent successfully')
    } catch (e) {
      console.log('[DEBUG] ✗ prompt failed:', e)
      error.value = e instanceof Error ? e.message : 'Failed to send message'
    }
  }

  async function deleteSession(sessionId: string) {
    try {
      await window.desktop.session.delete(sessionId)
      conversations.value = conversations.value.filter(c => c.id !== sessionId)
      // Clean up streaming state for this session
      streamingStore.cleanupSession(sessionId)
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null
        isPendingNewSession.value = false
        streamingStore.setCurrentSession(null)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete session'
    }
  }

  async function rename(sessionId: string, title: string) {
    try {
      await window.desktop.session.update(sessionId, { title })
      const conv = conversations.value.find(c => c.id === sessionId)
      if (conv) conv.title = title
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to rename session'
    }
  }

  async function clearAll(workspacePath: string) {
    const targets = conversations.value.filter(c => c.directory === workspacePath)
    for (const c of targets) {
      try {
        await window.desktop.session.delete(c.id)
        streamingStore.cleanupSession(c.id)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to delete session'
      }
    }
    await loadConversations(workspacePath)
  }

  function selectSession(sessionId: string) {
    currentSessionId.value = sessionId
    isPendingNewSession.value = false
    // Set streaming store to this session
    streamingStore.setCurrentSession(sessionId)
    // Reset UI panels
    ui.resetForSession()
    // Load messages
    loadMessages(sessionId)
  }

  async function loadMessages(sessionId: string) {
    if (!workspaceStore.currentWorkspace?.path) return
    try {
      const msgs = await window.desktop.session.messages(sessionId, 100, workspaceStore.currentWorkspace?.path)
      const conv = conversations.value.find(c => c.id === sessionId)
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
        console.log('[loadMessages] loaded', msgs.length, 'messages, merged to', merged.length)
      }
    } catch (e) {
      console.error('Failed to load messages:', e)
    }
  }

  function setupStreamListeners() {
    console.log('[DEBUG] === setupStreamListeners CALLED ===')
    
    // SSE events are dispatched directly to the session's stream state
    const removeStream = window.desktop.session.onStreamEvent((data) => {
      const event = data.event as Record<string, unknown>
      const eventType = event?.type as string
      
      // Extract sessionID from event
      const props = (event?.data ?? event?.properties) as Record<string, unknown> | undefined
      const eventSessionId = props?.sessionID as string | undefined
      
      // Skip server lifecycle events
      if (eventType?.startsWith('server.')) {
        console.log('[SSE] Server event:', eventType)
        return
      }
      
      // Handle session.updated for title updates (not streaming content)
      if (eventType === 'session.updated') {
        const info = props?.info as Record<string, unknown> | undefined
        if (info) {
          const sessionId = info.id as string
          const newTitle = info.title as string | undefined
          const conv = conversations.value.find(c => c.id === sessionId)
          if (conv && newTitle) {
            conv.title = newTitle
            console.log('[SSE session.updated] Updated title:', sessionId, newTitle)
          }
        }
        return
      }
      
      // Handle session.created - just log
      if (eventType === 'session.created') {
        console.log('[SSE] session.created:', eventSessionId)
        return
      }
      
      // Handle V1 events for message content (still needed for legacy format)
      if (eventType === 'session.diff') {
        const diff = props?.diff as Array<{ type: string; text?: string } | undefined> | undefined
        if (diff && Array.isArray(diff)) {
          const textParts = diff.filter(p => p?.type === 'text')
          if (textParts.length > 0) {
            const fullText = textParts.map(p => p?.text || '').join('\n')
            const conv = conversations.value.find(c => c.id === eventSessionId)
            if (conv && fullText) {
              const existingAssistant = conv.messages.find(m => m.role === 'assistant' && m.content === fullText)
              if (!existingAssistant) {
                const assistantMsg: Message = {
                  id: eventSessionId + '_assistant_' + Date.now(),
                  role: 'assistant',
                  content: fullText,
                  timestamp: new Date()
                }
                conv.messages.push(assistantMsg)
                console.log('[SSE] Added assistant message from session.diff')
              }
            }
          }
        }
      }
      
      // Handle message.updated for role mapping
      if (eventType === 'message.updated') {
        const info = props?.info as { role?: string; id?: string } | undefined
        if (info?.id && info?.role) {
          messageIdToRole.set(info.id, info.role as 'user' | 'assistant')
        }
        return
      }
      
      // Handle message.part.updated for text content (V1 format)
      if (eventType === 'message.part.updated') {
        const part = props?.part as { type?: string; text?: string; messageID?: string } | undefined
        if (part?.type === 'text' && part?.text && part?.messageID) {
          const messageRole = messageIdToRole.get(part.messageID)
          if (messageRole === 'assistant' || !messageRole) {
            const conv = conversations.value.find(c => c.id === eventSessionId)
            if (conv) {
              let assistantMsg = conv.messages.find(m => m.id === part.messageID)
              if (!assistantMsg) {
                assistantMsg = {
                  id: part.messageID,
                  role: 'assistant',
                  content: part.text,
                  timestamp: new Date()
                }
                conv.messages.push(assistantMsg)
                messageIdToRole.set(part.messageID, 'assistant')
              } else {
                assistantMsg.content += part.text
              }
            }
          }
        }
        return
      }
      
      // All other events: dispatch directly to the session's stream state
      if (eventSessionId) {
        console.log('[SSE] Dispatching event to session:', eventSessionId, 'type:', eventType)
        streamingStore.handleEvent(eventSessionId, data.event)
      }
    })

    // Watch for current stream status to push completed messages
    watch(
      () => streamingStore.currentStream.value?.status,
      (status) => {
        console.log('[DEBUG] Streaming status changed to:', status)
        
        if (status === 'done' && currentConversation.value) {
          const stream = streamingStore.currentStream.value
          if (!stream) return
          
          const finalMsg: Message = {
            id: stream.message.id || 'streaming',
            role: 'assistant',
            content: streamingStore.displayedContent.value,
            timestamp: new Date(),
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

          const exists = currentConversation.value.messages.some(m => m.id === finalMsg.id)
          
          if (!exists && finalMsg.content) {
            currentConversation.value.messages.push(finalMsg)
            console.log('[DEBUG] ✓ Assistant message added')
          }
          
          // Reset the stream for current session
          nextTick(() => {
            if (currentSessionId.value) {
              streamingStore.resetStream(currentSessionId.value)
            }
          })
        }
      }
    )

    return removeStream
  }

  return {
    currentSessionId,
    conversations,
    isLoading,
    streamingMessage,
    error,
    isPendingNewSession,
    currentConversation,
    currentMessages,
    hasActiveSession,
    startNewSession,
    createSession,
    loadConversations,
    loadMessages,
    sendMessage,
    deleteSession,
    rename,
    clearAll,
    selectSession,
    setupStreamListeners
  }
})