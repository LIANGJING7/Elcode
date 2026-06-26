<template>
  <div class="app-container h-screen flex bg-bg overflow-hidden">
    <Sidebar v-show="ui.sidebarOpen" />

    <main class="main-content flex-1 flex flex-col min-w-0 bg-bg overflow-hidden">
      <!-- 主区按 uiStore.view 渲染。空 workspace 强制 welcome；
           其它 view(skills/mcp/settings)本阶段用占位文字贯通,phase 5/6 落地真组件 -->
      <WelcomeView v-if="effectiveView === 'welcome'" @open-folder="handleAddWorkspace" />
      <ChatView
        v-else-if="effectiveView === 'chat'"
        :title="currentConversation?.title ?? 'New Chat'"
        :session-id="currentSessionId ?? ''"
        :pinned="currentConversation?.pinned"
        :messages="currentMessages"
        :streaming-message="sessionStore.streamingMessage"
        @rename="handleRename"
        @pin="handleTogglePin"
        @delete="handleDeleteSession"
        @inspect="handleInspect"
      />
      <div v-else class="flex-1 p-6 text-text-muted">
        {{ placeholderLabel }}
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ChatView from './components/chat/ChatView.vue'
import WelcomeView from './components/WelcomeView.vue'
import { useSessionStore } from './stores/session'
import { useWorkspaceStore } from './stores/workspace'
import { useUiStore } from './stores/ui'
import { useGlobalShortcuts } from './composables/useGlobalShortcuts'

useGlobalShortcuts()

const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const ui = useUiStore()

const currentSessionId = computed(() => sessionStore.currentSessionId)
const currentConversation = computed(() => sessionStore.currentConversation)
const currentMessages = computed(() => sessionStore.currentMessages)
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

// Sidebar 内的 workspaces/sessions 子组件已直连 store, 不再经 App.vue 中转;
// 这里只保留 WelcomeView 的 open-folder 与 ChatView 的事件处理.
async function handleAddWorkspace() {
  await workspaceStore.addWorkspace()
}

async function handleRename(title: string) {
  if (currentSessionId.value) {
    await sessionStore.rename(currentSessionId.value, title)
  }
}

async function handleTogglePin() {
  if (currentSessionId.value) {
    await sessionStore.togglePin(currentSessionId.value)
  }
}

async function handleDeleteSession() {
  if (currentSessionId.value) {
    await sessionStore.deleteSession(currentSessionId.value)
  }
}

function handleInspect(toolCallId: string) {
  ui.activeToolCallId = toolCallId
  ui.inspectorOpen = true
}
</script>

<style scoped>
.app-container {
  background-image:
    radial-gradient(ellipse at top left, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(99, 102, 241, 0.05) 0%, transparent 50%);
}
</style>