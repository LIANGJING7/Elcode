<template>
  <div class="app-container h-screen flex bg-bg">
    <Sidebar :conversations="conversations" :current-session-id="currentSessionId" @new-chat="handleNewChat" @select-session="handleSelectSession" />
    
    <main class="main-content flex-1 flex flex-col overflow-hidden">
      <ChatTimeline :messages="currentMessages" :streaming="isStreaming" />
      <Composer :disabled="!hasActiveSession || isLoading" @send="handleSend" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ChatTimeline from './components/ChatTimeline.vue'
import Composer from './components/Composer.vue'
import { useSessionStore } from './stores/session'

const sessionStore = useSessionStore()

const conversations = computed(() => sessionStore.conversations)
const currentSessionId = computed(() => sessionStore.currentSessionId)
const currentMessages = computed(() => sessionStore.currentMessages)
const hasActiveSession = computed(() => sessionStore.hasActiveSession)
const isLoading = computed(() => sessionStore.isLoading)
const isStreaming = computed(() => sessionStore.streamingMessage !== null)

let cleanupListeners: (() => void) | null = null

onMounted(async () => {
  cleanupListeners = sessionStore.setupStreamListeners()
  await sessionStore.loadConversations()
})

onUnmounted(() => {
  cleanupListeners?.()
})

async function handleNewChat() {
  const workspacePath = process.cwd()
  await sessionStore.createSession(workspacePath)
}

function handleSelectSession(sessionId: string) {
  sessionStore.selectSession(sessionId)
}

async function handleSend(content: string) {
  await sessionStore.sendMessage(content)
}
</script>