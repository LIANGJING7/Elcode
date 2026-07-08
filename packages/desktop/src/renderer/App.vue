<template>
  <div class="app-container h-screen flex flex-col bg-bg overflow-hidden">
    <!-- 全宽标题栏: 图标切换侧边栏 + 应用名 + 会话标题 + 菜单 + 拖拽 -->
    <div class="titlebar h-12 flex items-center bg-bg-elevated border-b border-border/60 flex-shrink-0">
      <!-- 左侧: 图标 + 应用名 (拖拽区域, 图标除外) -->
      <div class="drag flex items-center pl-3 flex-shrink-0" :style="{ width: sidebarWidth }">
        <button
          class="no-drag w-8 h-8 rounded-lg bg-accent flex items-center justify-center cursor-pointer hover:bg-accent-hover transition-colors duration-fast"
          @click="ui.toggleSidebar()"
          title="Toggle sidebar"
        >
          <svg class="w-5 h-5 text-bg" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="sidebarIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#1A1A1A"/>
                <stop offset="100%" stop-color="#F5F5F5"/>
              </linearGradient>
            </defs>
            <!-- L 竖线碎片 -->
            <polygon points="5,4 7,4 6.5,7 4.5,7" fill="url(#sidebarIconGradient)"/>
            <polygon points="7.5,4.5 9.5,4 9,7.5 7,8" fill="url(#sidebarIconGradient)" opacity="0.9"/>
            <polygon points="4,7.5 6.5,7 6,10.5 3.5,11" fill="url(#sidebarIconGradient)" opacity="0.85"/>
            <polygon points="7,8 9,7.5 8.5,11 6.5,11.5" fill="url(#sidebarIconGradient)" opacity="0.8"/>
            <polygon points="3.5,11.5 6,11 5.5,14.5 3,15" fill="url(#sidebarIconGradient)" opacity="0.9"/>
            <polygon points="6.5,12 8.5,11.5 8,15 6,15.5" fill="url(#sidebarIconGradient)" opacity="0.85"/>
            <!-- L 横线碎片 -->
            <polygon points="6,15.5 8,15 8.5,17.5 6.5,18" fill="url(#sidebarIconGradient)"/>
            <polygon points="8.5,15.5 11,16 12,18.5 9.5,18" fill="url(#sidebarIconGradient)" opacity="0.9"/>
            <polygon points="11.5,16.5 14.5,17 15.5,19.5 12.5,19" fill="url(#sidebarIconGradient)" opacity="0.85"/>
            <polygon points="15,17.5 17.5,16.5 18,19 15.5,20" fill="url(#sidebarIconGradient)" opacity="0.8"/>
            <polygon points="18,17 20,16 19.5,19 17.5,20" fill="url(#sidebarIconGradient)" opacity="0.9"/>
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

        <button
          class="no-drag px-2 py-1 rounded hover:bg-bg-hover text-text-muted flex-shrink-0"
          @click.stop="titleMenuOpen = !titleMenuOpen"
        >
          ⋯
        </button>

        <ul
          v-if="titleMenuOpen"
          class="no-drag absolute left-[calc(var(--spacing-sidebar)+1rem)] top-11 bg-bg-surface border border-border rounded shadow-lg py-1 z-50 min-w-[160px]"
        >
          <li><button class="w-full px-4 py-2 text-sm text-text hover:bg-bg-hover text-left" @click="doCopy; closeTitleMenu()">复制</button></li>
          <li><button class="w-full px-4 py-2 text-sm text-text hover:bg-bg-hover text-left" @click="startEditTitle; closeTitleMenu()">重命名</button></li>
          <li><button class="w-full px-4 py-2 text-sm text-error hover:bg-bg-hover text-left" @click="handleDeleteSession; closeTitleMenu()">删除</button></li>
          <li><button class="w-full px-4 py-2 text-sm text-text hover:bg-bg-hover text-left" @click="doExport; closeTitleMenu()">导出 Markdown</button></li>
        </ul>
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

      <main class="main-content flex-1 flex flex-col min-w-0 bg-bg overflow-hidden">
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
const titleMenuOpen = ref(false)

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

function closeTitleMenu() {
  titleMenuOpen.value = false
}

function doCopy() {
  // 复制会话 — 占位
}

function doExport() {
  // 导出 Markdown — 占位
}

// view 由业务状态决定默认页面，临时 UI 状态只表示用户操作。
const effectiveView = computed<'welcome' | 'newSession' | 'chat' | 'skills' | 'mcp' | 'settings'>(() => {
  // 用户显式选择的视图优先（settings/skills/mcp 可无会话访问）
  if (ui.view === 'settings' || ui.view === 'skills' || ui.view === 'mcp') {
    console.log('[DEBUG effectiveView] User selected view:', ui.view)
    return ui.view
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

  // 临时 UI 状态：用户正在创建新会话
  if (sessionStore.isPendingNewSession) {
    console.log('[DEBUG effectiveView] isPendingNewSession → newSession')
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
  cleanupListeners = sessionStore.setupStreamListeners()

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

  await themeStore.loadTheme()

  await workspaceStore.loadWorkspaces()

  if (!workspaceStore.hasWorkspaces) {
    const newWorkspace = await workspaceStore.addWorkspace()
    if (!newWorkspace) {
      return
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === '\\') {
      e.preventDefault()
      ui.toggleSidebar()
    }
  })

  if (workspaceStore.currentWorkspace) {
    const path = workspaceStore.currentWorkspace.path
    await Promise.allSettled([
      sessionStore.reload(),
      modelsStore.loadModels(path),
      mcpStore.loadStatusImmediate(),
      skillStore.load(path),
    ])
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