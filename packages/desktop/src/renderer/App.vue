<template>
  <div class="app-container h-screen flex bg-bg">
    <Sidebar 
      :conversations="conversations" 
      :current-session-id="currentSessionId"
      @new-chat="handleNewChat"
      @select-session="handleSelectSession"
      @select-workspace="handleSelectWorkspace"
      @add-workspace="handleAddWorkspace"
    />
    
    <main class="main-content flex-1 flex flex-col overflow-hidden">
      <div v-if="!hasCurrentWorkspace" class="empty-state flex-1 flex items-center justify-center">
        <div class="text-center">
          <h2 class="text-xl text-text mb-2">Welcome to OpenCode</h2>
          <p class="text-text-muted mb-4">Select a workspace to start chatting</p>
          <button 
            class="open-folder-button px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover transition-colors duration-fast"
            @click="handleAddWorkspace"
          >
            Open Folder
          </button>
        </div>
      </div>
      
      <template v-else>
        <ChatTimeline :messages="currentMessages" :streaming="isStreaming" />
        <Composer :disabled="!hasActiveSession || isLoading" @send="handleSend" />
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ChatTimeline from './components/ChatTimeline.vue'
import Composer from './components/Composer.vue'
import { useSessionStore } from './stores/session'
import { useWorkspaceStore } from './stores/workspace'

const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()

const conversations = computed(() => sessionStore.conversations)
const currentSessionId = computed(() => sessionStore.currentSessionId)
const currentMessages = computed(() => sessionStore.currentMessages)
const hasActiveSession = computed(() => sessionStore.hasActiveSession)
const isLoading = computed(() => sessionStore.isLoading)
const isStreaming = computed(() => sessionStore.streamingMessage !== null)
const hasCurrentWorkspace = computed(() => workspaceStore.hasCurrentWorkspace)

let cleanupListeners: (() => void) | null = null

onMounted(async () => {
  cleanupListeners = sessionStore.setupStreamListeners()
  
  await workspaceStore.loadWorkspaces()
  
  if (!workspaceStore.hasWorkspaces) {
    const newWorkspace = await workspaceStore.addWorkspace()
    if (!newWorkspace) {
      return
    }
  }
  
  if (workspaceStore.currentWorkspace) {
    await sessionStore.loadConversations(workspaceStore.currentWorkspace.path)
  }
})

onUnmounted(() => {
  cleanupListeners?.()
})

async function handleNewChat() {
  if (!workspaceStore.currentWorkspace) return
  await sessionStore.createSession(workspaceStore.currentWorkspace.path)
}

function handleSelectSession(sessionId: string) {
  sessionStore.selectSession(sessionId)
}

async function handleSelectWorkspace(path: string) {
  await workspaceStore.selectWorkspace(path)
}

async function handleAddWorkspace() {
  await workspaceStore.addWorkspace()
}

async function handleSend(content: string) {
  await sessionStore.sendMessage(content)
}
</script>