<template>
  <div class="app-container h-screen flex bg-bg overflow-hidden">
    <Sidebar
      v-show="ui.sidebarOpen"
      :conversations="conversations"
      :current-session-id="currentSessionId"
      @new-chat="handleNewChat"
      @select-session="handleSelectSession"
      @select-workspace="handleSelectWorkspace"
      @add-workspace="handleAddWorkspace"
    />

    <main class="main-content flex-1 flex flex-col min-w-0 bg-bg overflow-hidden">
      <!-- 主区按 uiStore.view 渲染。空 workspace 强制 welcome；
           其它 view(skills/mcp/settings)本阶段用占位文字贯通,phase 5/6 落地真组件 -->
      <WelcomeView v-if="effectiveView === 'welcome'" @open-folder="handleAddWorkspace" />
      <template v-else-if="effectiveView === 'chat'">
        <ChatTimeline :messages="currentMessages" :streaming="isStreaming" />
        <Composer :disabled="!hasActiveSession || isLoading" @send="handleSend" />
      </template>
      <div v-else class="flex-1 p-6 text-text-muted">
        {{ placeholderLabel }}
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ChatTimeline from './components/ChatTimeline.vue'   // 阶段 1 沿用现有组件; 阶段 3 改为 ChatView
import Composer from './components/Composer.vue'
import WelcomeView from './components/WelcomeView.vue'
import { useSessionStore } from './stores/session'
import { useWorkspaceStore } from './stores/workspace'
import { useUiStore } from './stores/ui'
import { useGlobalShortcuts } from './composables/useGlobalShortcuts'

useGlobalShortcuts()

const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const ui = useUiStore()

const conversations = computed(() => sessionStore.conversations)
const currentSessionId = computed(() => sessionStore.currentSessionId)
const currentMessages = computed(() => sessionStore.currentMessages)
const hasActiveSession = computed(() => sessionStore.hasActiveSession)
const isLoading = computed(() => sessionStore.isLoading)
const isStreaming = computed(() => sessionStore.streamingMessage !== null)
const hasCurrentWorkspace = computed(() => workspaceStore.hasCurrentWorkspace)

// view 由两件事驱动: ui.view 与 workspace 是否存在。
// 没有 workspace 时强制 welcome(无论 ui.view);有 workspace 时若 ui.view=welcome 则显示 chat。
const effectiveView = computed<'welcome' | 'chat' | 'skills' | 'mcp' | 'settings'>(() => {
  if (!hasCurrentWorkspace.value) return 'welcome'
  if (ui.view === 'welcome') return 'chat'
  return ui.view
})

// 占位渲染(真视图在 phase 5/6 落地)
const placeholderLabel = computed(() => {
  if (effectiveView.value === 'skills') return 'Skills (phase 5)'
  if (effectiveView.value === 'mcp') return 'MCP (phase 5)'
  if (effectiveView.value === 'settings') return 'Settings (phase 6)'
  return ''
})

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
  const ws = workspaceStore.currentWorkspace
  if (!ws) return
  await sessionStore.createSession({ workspaceId: ws.id, path: ws.path })
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

<style scoped>
.app-container {
  background-image:
    radial-gradient(ellipse at top left, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(99, 102, 241, 0.05) 0%, transparent 50%);
}
</style>