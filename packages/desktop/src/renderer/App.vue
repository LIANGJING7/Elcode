<template>
  <div class="app-container h-screen flex flex-col bg-bg">
    <!-- 全宽标题栏: 图标切换侧边栏 + 应用名 + 会话标题 + 菜单 + 拖拽 -->
    <div class="titlebar h-12 flex items-center bg-bg-elevated border-b border-border/60 flex-shrink-0">
      <!-- 左侧: 图标 + 应用名 (拖拽区域, 图标除外) -->
      <div class="drag flex items-center pl-3 flex-shrink-0" :style="{ width: sidebarWidth }">
        <button
          class="no-drag w-8 h-8 rounded-lg bg-[#0a0a0a] flex items-center justify-center cursor-pointer hover:bg-[#1a1a1a] transition-colors duration-fast"
          @click="ui.toggleSidebar()"
          title="Toggle sidebar"
        >
          <svg class="w-5 h-5 text-white" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M65 25 C65 25 75 25 75 35 L75 65 C75 75 65 75 65 75 M65 45 C65 45 55 45 55 55 C55 65 65 65 65 65 M35 25 C35 25 25 25 25 35 L25 65 C25 75 35 75 35 75 M35 45 C35 45 45 45 45 35" stroke="currentColor" stroke-width="8" stroke-linecap="round" fill="none"/>
          </svg>
        </button>
      </div>

      <!-- 中间: 会话标题 + 菜单 (拖拽区域, 交互元素除外) -->
      <div v-if="effectiveView === 'chat'" class="drag flex-1 flex items-center gap-2 px-4 min-w-0">
        <button
          v-if="!editingTitle"
          class="no-drag text-lg font-medium truncate hover:bg-bg-hover px-2 py-1 rounded text-text"
          @click="startEditTitle"
        >
          {{ currentConversation?.title ?? 'New Chat' }}
        </button>
        <input
          v-else
          v-model="titleDraft"
          class="no-drag text-lg font-medium px-2 py-1 rounded border border-accent bg-bg-elevated text-text focus:outline-none focus:ring-1 focus:ring-accent min-w-0"
          @keyup.enter="commitEditTitle"
          @blur="commitEditTitle"
        />

      </div>
      <div v-else class="drag flex-1"></div>

      <div class="flex items-center flex-shrink-0">
        <div style="width: 142px"></div>
      </div>
    </div>

    <!-- 主体: 侧边栏 + 内容区 + FileTabsPanel -->
    <div class="flex flex-1 min-h-0">
      <Transition name="sidebar">
        <Sidebar v-show="ui.sidebarOpen" />
      </Transition>

      <main class="main-content flex-1 flex flex-col min-w-0 bg-bg">
        <WelcomeView v-if="effectiveView === 'welcome'" key="welcome" @open-folder="handleAddWorkspace" />
        <NewSessionView v-else-if="effectiveView === 'newSession'" key="newSession" />
        <ChatView
          v-else-if="effectiveView === 'chat'"
          key="chat"
          :session-id="currentSessionId ?? ''"
          :messages="currentMessages"
          :streaming-message="sessionStore.streamingMessage"
          @open-file="handleOpenFile"
        />
        <SkillView v-else-if="effectiveView === 'skills'" key="skills" />
        <McpView v-else-if="effectiveView === 'mcp'" key="mcp" />
        <SettingsView v-else-if="effectiveView === 'settings'" key="settings" />
        <div v-else class="flex-1 p-6 text-text-muted">
          Unknown view
        </div>
      </main>

      <!-- Right Panel: FileTabsPanel (文件标签页) -->
      <FileTabsPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ChatView from './components/chat/ChatView.vue'
import WelcomeView from './components/WelcomeView.vue'
import NewSessionView from './components/NewSessionView.vue'
import SkillView from './components/skills/SkillView.vue'
import McpView from './components/mcp/McpView.vue'
import SettingsView from './components/settings/SettingsView.vue'
import FileTabsPanel from './components/file-tabs/FileTabsPanel.vue'
import { toolToPresentationModel } from './services/tool-presentation'
import type { ToolCall } from '../types/ipc'
import { useSessionStore } from './stores/session'
import { useWorkspaceStore } from './stores/workspace'
import { useUiStore } from './stores/ui'
import { useModelsStore } from './stores/models'
import { useThemeStore } from './stores/theme'
import { useMcpStore } from './stores/mcp'
import { useSkillStore } from './stores/skill'
import { useSubagentStore } from './stores/subagent'
import { useGlobalShortcuts } from './composables/useGlobalShortcuts'

// Hide loading overlay with fade animation
function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay')
  if (overlay) {
    overlay.classList.add('hidden')
    setTimeout(() => overlay.remove(), 200)
  }
}

useGlobalShortcuts()

const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const ui = useUiStore()
const modelsStore = useModelsStore()
const themeStore = useThemeStore()
const mcpStore = useMcpStore()
const skillStore = useSkillStore()
const subagentStore = useSubagentStore()

const sidebarWidth = '260px'

const currentSessionId = computed(() => sessionStore.currentSessionId)
const currentConversation = computed(() => sessionStore.currentConversation)
const currentMessages = computed(() => sessionStore.currentMessages)
const hasCurrentWorkspace = computed(() => workspaceStore.hasCurrentWorkspace)

// 标题栏 rename 状态
const editingTitle = ref(false)
const titleDraft = ref('')
function startEditTitle() {
  editingTitle.value = true
  titleDraft.value = currentConversation.value?.title ?? ''
}

function commitEditTitle() {
  editingTitle.value = false
  if (titleDraft.value && titleDraft.value !== currentConversation.value?.title) {
    handleRename(titleDraft.value)
  }
}

// view 由业务状态决定默认页面，临时 UI 状态只表示用户操作。
const effectiveView = computed<'welcome' | 'newSession' | 'chat' | 'skills' | 'mcp' | 'settings'>(() => {
  // 用户显式选择的视图优先（settings/skills/mcp 可无会话访问）
  if (ui.view === 'settings' || ui.view === 'skills' || ui.view === 'mcp') {
    console.log('[DEBUG effectiveView] User selected view:', ui.view)
    return ui.view
  }

  // 临时 UI 状态：用户正在创建新会话（优先级高于工作区检查）
  if (sessionStore.isPendingNewSession) {
    console.log('[DEBUG effectiveView] isPendingNewSession → newSession')
    return 'newSession'
  }

  // 业务状态决定默认页面
  if (!hasCurrentWorkspace.value) {
    console.log('[DEBUG effectiveView] No workspace → welcome')
    return 'welcome'
  }
  if (!currentSessionId.value) {
    console.log('[DEBUG effectiveView] No sessionId → newSession')
    return 'newSession'
  }

  console.log('[DEBUG effectiveView] Has session, default → chat')
  return 'chat'
})

watch(
  () => workspaceStore.currentWorkspace?.path,
  async (newPath, oldPath) => {
    if (newPath && newPath !== oldPath) {
      await Promise.allSettled([
        modelsStore.loadModels(newPath),
        skillStore.load(newPath),
      ])
    } else if (!newPath && oldPath) {
      modelsStore.clearModels()
      skillStore.clear()
    }
  }
)

// Bind subagent watch to Session lifecycle
watch(
    () => sessionStore.currentSessionId,
    (newId, oldId) => {
      if (newId) {
        // Pass current messages for bootstrap (extract subagent tabs from history)
        subagentStore.watch(newId, sessionStore.currentMessages)
      } else {
        subagentStore.unwatch()
      }
    },
    { immediate: true }
  )

let cleanupListeners: (() => void) | null = null
let cleanupSubagentListeners: (() => void) | null = null

onMounted(async () => {
  try {
    console.log('[App] onMounted start')
    cleanupListeners = sessionStore.setupStreamListeners()
    console.log('[App] setupStreamListeners done')

    // Setup subagent IPC listeners
    const cleanupTabs = window.desktop.subagent.onTabsUpdate((data) => {
      subagentStore.updateTabs(data)
    })
    const cleanupDetail = window.desktop.subagent.onDetailUpdate((data) => {
      subagentStore.updateDetail(data)
    })
    cleanupSubagentListeners = () => {
      cleanupTabs()
      cleanupDetail()
    }
    console.log('[App] subagent listeners done')

    console.log('[App] loading theme...')
    await themeStore.loadTheme()
    console.log('[App] theme loaded')

    console.log('[App] loading workspaces...')
    await workspaceStore.loadWorkspaces()
    console.log('[App] workspaces loaded, count:', workspaceStore.workspaces.length)

    console.log('[App] workspaces check complete, hasWorkspaces:', workspaceStore.hasWorkspaces)

    window.addEventListener('keydown', (e) => {
      if (e.shiftKey && e.key === '\\') {
        e.preventDefault()
        ui.toggleSidebar()
      }
    })

    if (workspaceStore.currentWorkspace) {
      const path = workspaceStore.currentWorkspace.path
      console.log('[App] loading data for workspace:', path)
      await Promise.allSettled([
        sessionStore.reload(),
        modelsStore.loadModels(path),
      ])
      // Load MCP and skills in background, don't wait
      mcpStore.loadStatusImmediate().catch(e => console.error('[App] mcp load error:', e))
      skillStore.load(path).catch(e => console.error('[App] skill load error:', e))
      console.log('[App] data loaded')
    }

    console.log('[App] onMounted complete')
  } catch (e) {
    console.error('[App] onMounted error:', e)
  } finally {
    console.log('[App] hiding loading overlay')
    hideLoadingOverlay()
  }
})

onUnmounted(() => {
  cleanupListeners?.()
  cleanupSubagentListeners?.()
})

async function handleAddWorkspace() {
  await workspaceStore.addWorkspace()
}

async function handleRename(title: string) {
  if (currentSessionId.value) {
    await sessionStore.rename(currentSessionId.value, title)
  }
}

async function handleDeleteSession() {
  if (currentSessionId.value) {
    await sessionStore.deleteSession(currentSessionId.value)
  }
}

// 处理工具调用点击 → 打开 FileTabsPanel
function handleOpenFile(tool: ToolCall) {
  const tab = toolToPresentationModel(tool)
  if (!tab) return
  ui.openFileTab(tab)
}
</script>

<style scoped>
.app-container {
  background-image:
    radial-gradient(ellipse at top left, var(--color-accent-glow) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, var(--color-accent-muted) 0%, transparent 50%);
}

.sidebar-enter-active,
.sidebar-leave-active {
  transition: all 0.2s ease-out;
}

.sidebar-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.sidebar-enter-to,
.sidebar-leave-from {
  transform: translateX(0);
  opacity: 1;
}

.sidebar-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>