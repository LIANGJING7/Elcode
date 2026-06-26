import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Conversation, Message, LocationRef, PromptInput } from '../../types/ipc'
import { useWorkspaceStore } from './workspace'

export const useSessionStore = defineStore('session', () => {
  const workspaceStore = useWorkspaceStore()
  
  const currentSessionId = ref<string | null>(null)
  const conversations = ref<Conversation[]>([])
  const isLoading = ref(false)
  const streamingMessage = ref<Message | null>(null)
  const error = ref<string | null>(null)

  const currentConversation = computed(() => 
    conversations.value.find(c => c.id === currentSessionId.value)
  )
  
  const currentMessages = computed(() => 
    currentConversation.value?.messages || []
  )

  const hasActiveSession = computed(() => 
    currentSessionId.value !== null && workspaceStore.hasCurrentWorkspace
  )

  watch(
    () => workspaceStore.currentWorkspace,
    async (newWorkspace) => {
      if (newWorkspace) {
        await loadConversations(newWorkspace.path)
      } else {
        conversations.value = []
        currentSessionId.value = null
      }
    }
  )

  async function createSession(args: { workspaceId: string; path: string; primaryWorkspaceId?: string; workspaceIds?: string[] }) {
    if (!args.path) {
      error.value = 'No workspace path provided'
      return
    }

    isLoading.value = true
    error.value = null
    try {
      const location: LocationRef = { directory: args.path, workspaceID: args.workspaceId }
      const sessionId = await window.desktop.session.create(location)
      currentSessionId.value = sessionId

      // 桌面端附加 metadata 落 sessions.json(经 main 进程). 单挂载默认 primaryWorkspaceId = workspaceId.
      const primary = args.primaryWorkspaceId ?? args.workspaceId
      const ids = args.workspaceIds ?? [args.workspaceId]
      await window.desktop.session.update(sessionId, {
        primaryWorkspaceId: primary,
        workspaceIds: ids,
      }).catch(() => { /* 持久化失败不阻塞会话创建 */ })

      await loadConversations(args.path)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create session'
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
    if (!currentSessionId.value || !content.trim()) return
    error.value = null
    
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }
    
    if (currentConversation.value) {
      currentConversation.value.messages.push(userMessage)
    }

    try {
      const prompt: PromptInput[] = [{ type: 'text', text: content }]
      await window.desktop.session.prompt(
        currentSessionId.value, 
        prompt, 
        workspaceStore.currentWorkspace?.path
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to send message'
    }
  }

  async function deleteSession(sessionId: string) {
    try {
      await window.desktop.session.delete(sessionId)
      conversations.value = conversations.value.filter(c => c.id !== sessionId)
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete session'
    }
  }

  // 改写桌面端附加 metadata. core 无 rename/pin 路由, 全部经 SESSION_UPDATE 落 sessions.json.
  // directory 取自当前 workspace 的 path(若已选中). 二者仅作为透传给后端的 location hint,
  // 不影响 sessions.json 的 sessionID 键索引.
  function directoryOf(workspaceId?: string): string | undefined {
    if (workspaceId) {
      return workspaceStore.workspaces.find(w => w.id === workspaceId)?.path
    }
    return workspaceStore.currentWorkspace?.path
  }

  async function rename(sessionId: string, title: string) {
    const dir = directoryOf()
    try {
      await window.desktop.session.update(sessionId, { title }, dir)
      const conv = conversations.value.find(c => c.id === sessionId)
      if (conv) conv.title = title
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to rename session'
    }
  }

  async function togglePin(sessionId: string) {
    const dir = directoryOf()
    const conv = conversations.value.find(c => c.id === sessionId)
    const next = !conv?.pinned
    try {
      await window.desktop.session.update(sessionId, { pinned: next }, dir)
      if (conv) conv.pinned = next
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to pin session'
    }
  }

  async function clearAll(workspaceId: string) {
    const dir = directoryOf(workspaceId)
    const targets = conversations.value.filter(c => c.primaryWorkspaceId === workspaceId)
    for (const c of targets) {
      try {
        await window.desktop.session.delete(c.id, dir)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to delete session'
      }
    }
    await loadConversations(dir)
  }

  function selectSession(sessionId: string) {
    currentSessionId.value = sessionId
  }

  function setupStreamListeners() {
    const removeStream = window.desktop.session.onStreamEvent((data) => {
      const event = data.event as Record<string, unknown>
      if (event?.type === 'message') {
        streamingMessage.value = event.message as Message
      }
      if (event?.type === 'complete') {
        if (streamingMessage.value && currentConversation.value) {
          currentConversation.value.messages.push(streamingMessage.value)
        }
        streamingMessage.value = null
      }
    })

    return removeStream
  }

  return {
    currentSessionId,
    conversations,
    isLoading,
    streamingMessage,
    error,
    currentConversation,
    currentMessages,
    hasActiveSession,
    createSession,
    loadConversations,
    sendMessage,
    deleteSession,
    rename,
    togglePin,
    clearAll,
    selectSession,
    setupStreamListeners
  }
})