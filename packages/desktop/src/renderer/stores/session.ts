import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Conversation, Message } from '../../types/ipc'

export const useSessionStore = defineStore('session', () => {
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
    currentSessionId.value !== null
  )

  async function createSession(workspacePath: string) {
    isLoading.value = true
    error.value = null
    try {
      const sessionId = await window.desktop.session.create(workspacePath)
      currentSessionId.value = sessionId
      await loadConversations()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create session'
    } finally {
      isLoading.value = false
    }
  }

  async function loadConversations() {
    isLoading.value = true
    try {
      conversations.value = await window.desktop.session.list()
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
      await window.desktop.session.sendMessage(currentSessionId.value, content)
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
    const removeDataStream = window.desktop.session.onStreamData((data) => {
      streamingMessage.value = data.message
    })

    const removeEndStream = window.desktop.session.onStreamEnd(() => {
      if (streamingMessage.value && currentConversation.value) {
        currentConversation.value.messages.push(streamingMessage.value)
      }
      streamingMessage.value = null
    })

    return () => {
      removeDataStream()
      removeEndStream()
    }
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