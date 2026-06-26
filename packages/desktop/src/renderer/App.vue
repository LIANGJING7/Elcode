<template>
  <div class="app-container h-screen flex bg-bg overflow-hidden">
    <Sidebar v-show="ui.sidebarOpen" />

    <!-- 侧边栏收起时的浮动按钮 -->
    <button
      v-show="!ui.sidebarOpen"
      class="sidebar-toggle fixed top-3 left-3 z-50 w-8 h-8 rounded-lg bg-accent flex items-center justify-center cursor-pointer hover:bg-accent-hover transition-colors duration-fast no-drag"
      @click="ui.toggleSidebar()"
      title="Toggle sidebar"
    >
      <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="2.5"/>
        <circle cx="4" cy="6" r="1.5"/>
        <circle cx="20" cy="6" r="1.5"/>
        <circle cx="4" cy="18" r="1.5"/>
        <circle cx="20" cy="18" r="1.5"/>
        <line x1="5.5" y1="6.5" x2="9.7" y2="11"/>
        <line x1="18.5" y1="6.5" x2="14.3" y2="11"/>
        <line x1="12" y1="14.5" x2="5.5" y2="17.2"/>
        <line x1="12" y1="14.5" x2="18.5" y2="17.2"/>
      </svg>
    </button>

    <main class="main-content flex-1 flex flex-col min-w-0 bg-bg overflow-hidden">
      <!-- 顶部拖拽区域: 侧边栏收起时整个顶部可拖, 展开时仅主区顶部可拖 -->
      <div class="drag-region h-12 flex-shrink-0 drag"></div>

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
      <SkillView v-else-if="effectiveView === 'skills'" />
      <McpView v-else-if="effectiveView === 'mcp'" />
      <SettingsView v-else-if="effectiveView === 'settings'" />
      <div v-else class="flex-1 p-6 text-text-muted">
        Unknown view
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ChatView from './components/chat/ChatView.vue'
import WelcomeView from './components/WelcomeView.vue'
import SkillView from './components/skills/SkillView.vue'
import McpView from './components/mcp/McpView.vue'
import SettingsView from './components/settings/SettingsView.vue'
import { useSessionStore } from './stores/session'
import { useWorkspaceStore } from './stores/workspace'
import { useUiStore } from './stores/ui'
import { useModelsStore } from './stores/models'
import { useGlobalShortcuts } from './composables/useGlobalShortcuts'

useGlobalShortcuts()

const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const ui = useUiStore()
const modelsStore = useModelsStore()

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

// Watch workspace changes to load models
watch(
  () => workspaceStore.currentWorkspace,
  async (newWorkspace) => {
    if (newWorkspace) {
      await modelsStore.loadModels(newWorkspace.path)
    } else {
      modelsStore.clearModels()
    }
  },
  { immediate: true }
)

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