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
        <span class="ml-3 text-text text-base font-medium select-none">Model Agent Desktop</span>
      </div>

      <!-- 中间: 会话标题 + 置顶标记 + 菜单 (拖拽区域, 交互元素除外) -->
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

        <span v-if="currentConversation?.pinned" class="no-drag text-accent-muted flex-shrink-0"></span>

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
          <li><button class="w-full px-4 py-2 text-sm text-text hover:bg-bg-hover text-left" @click="handleTogglePin; closeTitleMenu()">{{ currentConversation?.pinned ? '取消置顶' : '置顶' }}</button></li>
          <li><button class="w-full px-4 py-2 text-sm text-error hover:bg-bg-hover text-left" @click="handleDeleteSession; closeTitleMenu()">删除</button></li>
          <li><button class="w-full px-4 py-2 text-sm text-text hover:bg-bg-hover text-left" @click="doExport; closeTitleMenu()">导出 Markdown</button></li>
        </ul>
      </div>
      <div v-else class="drag flex-1"></div>

      <!-- 右侧: 给 titleBarOverlay 窗口控制按钮留空间 -->
      <div class="drag flex-shrink-0" style="width: 138px"></div>
    </div>

    <!-- 主体: 侧边栏 + 内容区 -->
    <div class="flex flex-1 min-h-0">
      <Sidebar v-show="ui.sidebarOpen" />

      <main class="main-content flex-1 flex flex-col min-w-0 bg-bg overflow-hidden">
        <WelcomeView v-if="effectiveView === 'welcome'" @open-folder="handleAddWorkspace" />
        <ChatView
          v-else-if="effectiveView === 'chat'"
          :session-id="currentSessionId ?? ''"
          :messages="currentMessages"
          :streaming-message="sessionStore.streamingMessage"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
import { useThemeStore } from './stores/theme'
import { useGlobalShortcuts } from './composables/useGlobalShortcuts'

useGlobalShortcuts()

const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const ui = useUiStore()
const modelsStore = useModelsStore()
const themeStore = useThemeStore()

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

// view 由两件事驱动: ui.view 与 workspace 是否存在。
const effectiveView = computed<'welcome' | 'chat' | 'skills' | 'mcp' | 'settings'>(() => {
  if (!hasCurrentWorkspace.value) return 'welcome'
  if (ui.view === 'welcome') return 'chat'
  return ui.view
})

watch(
  () => workspaceStore.currentWorkspace,
  async (newWorkspace) => {
    if (newWorkspace) {
      await modelsStore.loadModels(newWorkspace.path)
    } else {
      modelsStore.clearModels()
    }
  }
)

let cleanupListeners: (() => void) | null = null

onMounted(async () => {
  cleanupListeners = sessionStore.setupStreamListeners()

  await themeStore.loadTheme()

  await workspaceStore.loadWorkspaces()

  if (!workspaceStore.hasWorkspaces) {
    const newWorkspace = await workspaceStore.addWorkspace()
    if (!newWorkspace) {
      return
    }
  }

  if (workspaceStore.currentWorkspace) {
    await sessionStore.loadConversations(workspaceStore.currentWorkspace.path)
    await modelsStore.loadModels(workspaceStore.currentWorkspace.path)
  }
})

onUnmounted(() => {
  cleanupListeners?.()
})

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
