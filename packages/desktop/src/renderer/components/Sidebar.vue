<template>
  <aside class="sidebar w-sidebar bg-bg-elevated border-r border-border flex flex-col select-none">
    <!-- 设置态: 侧栏改显 SettingsNav (本阶段占位, Task 2.4 落地真组件) -->
    <div v-if="isSettingsMode" class="settings-nav-placeholder p-3 text-text-muted text-xs">
      SettingsNav (Task 2.4)
    </div>

    <!-- 常规态: Header + 工作区/会话 body (Task 2.3 拆为子组件) -->
    <template v-else>
      <SidebarHeader
        @select-nav="handleSelectNav"
        @enter-settings="ui.enterSettings()"
      />

      <div class="workspaces-section p-3">
        <div class="flex items-center justify-between mb-2 px-1">
          <span class="text-2xs font-semibold text-text-muted uppercase tracking-widest">Workspaces</span>
          <span class="text-2xs text-text-muted">{{ workspaces.length }}</span>
        </div>

        <div class="workspace-list space-y-0.5">
          <div
            v-for="ws in workspaces"
            :key="ws.id"
            class="workspace-item group flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-all duration-fast"
            :class="ws.path === currentWorkspacePath
              ? 'bg-accent-muted text-accent ring-1 ring-accent/20'
              : 'text-text-secondary hover:bg-bg-hover hover:text-text'"
            @click="handleSelectWorkspace(ws.path)"
          >
            <div
              class="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-bold transition-colors duration-fast"
              :class="ws.path === currentWorkspacePath
                ? 'bg-accent text-white'
                : 'bg-bg-active text-text-muted group-hover:text-text-secondary'"
            >
              {{ ws.name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium truncate">{{ ws.name }}</div>
              <div class="text-2xs text-text-muted truncate mt-0.5">{{ ws.path }}</div>
            </div>
            <div
              v-if="ws.path === currentWorkspacePath"
              class="w-1.5 h-1.5 rounded-full bg-accent shadow-glow shrink-0"
            />
          </div>

          <button
            class="add-workspace-button flex items-center gap-2.5 w-full px-2.5 py-2 mt-1 rounded-md border border-dashed border-border hover:border-border-light text-text-muted hover:text-text-secondary transition-all duration-fast"
            @click="handleAddWorkspace"
          >
            <PlusIcon class="w-4 h-4" />
            <span>Open Folder</span>
          </button>
        </div>
      </div>

      <div class="px-3">
        <div class="border-t border-border/60" />
      </div>

      <div class="chat-section flex-1 flex flex-col min-h-0">
        <header class="px-3 pt-3 pb-2">
          <button
            class="new-chat-button flex items-center justify-center gap-2 w-full px-3 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-all duration-fast shadow-sm hover:shadow-glow active:scale-[0.98]"
            :disabled="!hasCurrentWorkspace"
            @click="$emit('newChat')"
          >
            <PlusIcon class="w-3.5 h-3.5" />
            <span>New Chat</span>
            <span class="ml-auto text-white/60 text-2xs font-mono">Ctrl+N</span>
          </button>
        </header>

        <div class="search-container px-3 pb-2">
          <div class="relative">
            <SearchIcon class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search conversations..."
              class="w-full pl-8 pr-3 py-1.5 bg-bg-surface border border-border hover:border-border-light focus:border-accent/50 rounded-lg text-text text-xs placeholder:text-text-muted outline-none transition-all duration-fast"
            />
          </div>
        </div>

        <nav class="conversation-list flex-1 overflow-y-auto px-2">
          <div class="px-2 py-1">
            <span
              v-if="hasCurrentWorkspace && filteredConversations.length > 0"
              class="text-2xs font-semibold text-text-muted uppercase tracking-widest"
            >
              Recent
            </span>
          </div>

          <div v-if="hasCurrentWorkspace" class="space-y-0.5">
            <div
              v-for="(conv, idx) in filteredConversations"
              :key="conv.id"
              class="conversation-item group px-2.5 py-2 rounded-md cursor-pointer transition-all duration-fast animate-fade-in-left"
              :style="{ animationDelay: `${idx * 30}ms` }"
              :class="conv.id === currentSessionId
                ? 'bg-accent-muted text-accent ring-1 ring-accent/20'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text'"
              @click="$emit('selectSession', conv.id)"
            >
              <div class="flex items-start gap-2">
                <div
                  class="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 text-2xs font-bold transition-colors duration-fast"
                  :class="conv.id === currentSessionId
                    ? 'bg-accent text-white'
                    : 'bg-bg-active text-text-muted group-hover:text-text-secondary'"
                >
                  {{ conv.title.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-medium truncate">{{ conv.title }}</div>
                  <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-2xs text-text-muted">{{ formatRelative(conv.updatedAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="!hasCurrentWorkspace"
            class="text-text-muted text-xs text-center py-8 animate-fade-in"
          >
            <div class="w-10 h-10 mx-auto mb-3 rounded-xl bg-bg-surface flex items-center justify-center">
              <SearchIcon class="w-5 h-5 text-text-muted" />
            </div>
            <p class="text-text-muted leading-relaxed">Select a workspace<br>to view conversations</p>
          </div>

          <div
            v-else-if="filteredConversations.length === 0 && searchQuery"
            class="text-text-muted text-xs text-center py-8 animate-fade-in"
          >
            No conversations match "{{ searchQuery }}"
          </div>
        </nav>
      </div>
    </template>

    <SidebarFooter
      @enter-settings="ui.enterSettings()"
      @exit-settings="ui.exitSettings()"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatRelative } from '../utils/formatting'
import PlusIcon from './icons/PlusIcon.vue'
import SearchIcon from './icons/SearchIcon.vue'
import SidebarHeader from './sidebar/SidebarHeader.vue'
import SidebarFooter from './sidebar/SidebarFooter.vue'
import { useWorkspaceStore } from '../stores/workspace'
import { useUiStore, type View } from '../stores/ui'
import type { Conversation } from '../../types/ipc'

const props = defineProps<{
  conversations: Conversation[]
  currentSessionId: string | null
}>()

const emit = defineEmits<{
  newChat: []
  selectSession: [sessionId: string]
  selectWorkspace: [workspacePath: string]
  addWorkspace: []
}>()

const workspaceStore = useWorkspaceStore()
const ui = useUiStore()

const workspaces = computed(() => workspaceStore.workspaces)
const currentWorkspacePath = computed(() => workspaceStore.currentWorkspace?.path)
const hasCurrentWorkspace = computed(() => workspaceStore.hasCurrentWorkspace)
const isSettingsMode = computed(() => ui.view === 'settings')

const searchQuery = ref('')

const filteredConversations = computed(() => {
  if (!searchQuery.value.trim()) return props.conversations
  const query = searchQuery.value.toLowerCase()
  return props.conversations.filter(conv => conv.title.toLowerCase().includes(query))
})

// 导航按钮 → 切主区 view (uiStore 单一 source of truth)
function handleSelectNav(view: Exclude<View, 'welcome' | 'chat' | 'settings'>) {
  ui.setView(view)
}

function handleSelectWorkspace(path: string) {
  emit('selectWorkspace', path)
}

function handleAddWorkspace() {
  emit('addWorkspace')
}
</script>

<style scoped>
.conversation-item {
  animation-fill-mode: both;
}

.workspace-item:hover .workspace-indicator {
  opacity: 0.5;
}
</style>
