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

  async function createSession(workspacePath: string, workspaceID?: string) {
    if (!workspaceStore.currentWorkspace) {
      error.value = 'No workspace selected'
      return
    }
    
    isLoading.value = true
    error.value = null
    try {
      const location: LocationRef = { directory: workspacePath, workspaceID }
      const sessionId = await window.desktop.session.create(location)
      currentSessionId.value = sessionId
      await loadConversations(workspacePath)
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
    selectSession,
    setupStreamListeners
  }
})