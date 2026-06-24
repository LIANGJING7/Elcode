<template>
  <aside class="sidebar w-sidebar bg-bg-secondary border-r border-border flex flex-col">
    <!-- Workspaces Section -->
    <div class="workspaces-section p-3">
      <div class="text-xs text-text-muted uppercase tracking-wide mb-2">Workspaces</div>
      
      <div class="workspace-list">
        <div 
          v-for="ws in workspaces" 
          :key="ws.id" 
          class="workspace-item px-3 py-2 rounded cursor-pointer transition-colors duration-fast mb-1"
          :class="ws.path === currentWorkspacePath ? 'bg-accent text-white' : 'hover:bg-bg-tertiary'"
          @click="handleSelectWorkspace(ws.path)"
        >
          <div class="text-sm font-medium truncate">{{ ws.name }}</div>
          <div class="text-xs text-text-muted mt-0.5 truncate opacity-70">{{ ws.path }}</div>
        </div>
        
        <button 
          class="add-workspace-button flex items-center gap-2 w-full px-3 py-2 mt-2 bg-bg-tertiary rounded text-text text-sm hover:bg-accent-hover transition-colors duration-fast"
          @click="handleAddWorkspace"
        >
          <PlusIcon class="w-4 h-4" />
          <span>Open Folder</span>
        </button>
      </div>
    </div>
    
    <div class="border-t border-border my-2"></div>
    
    <!-- Conversations Section -->
    <header class="p-3">
      <button 
        class="new-chat-button flex items-center gap-2 w-full px-3 py-2 bg-bg-tertiary rounded text-text text-sm hover:bg-accent-hover transition-colors duration-fast"
        :disabled="!hasCurrentWorkspace"
        @click="$emit('newChat')"
      >
        <PlusIcon class="w-4 h-4" />
        <span>New Chat</span>
      </button>
    </header>

    <div class="search-container p-3">
      <div class="relative">
        <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search..." 
          class="w-full pl-9 pr-3 py-2 bg-bg-tertiary border border-border rounded text-text text-sm placeholder:text-text-muted focus:border-accent outline-none transition-colors duration-fast" 
        />
      </div>
    </div>

    <nav class="conversation-list flex-1 overflow-y-auto px-3">
      <div 
        v-if="hasCurrentWorkspace"
        v-for="conv in filteredConversations" 
        :key="conv.id" 
        class="conversation-item px-3 py-2 rounded cursor-pointer transition-colors duration-fast mb-1"
        :class="conv.id === currentSessionId ? 'bg-accent text-white' : 'hover:bg-bg-tertiary'"
        @click="$emit('selectSession', conv.id)"
      >
        <div class="text-sm truncate">{{ conv.title }}</div>
        <div class="text-xs text-text-muted mt-1">{{ formatRelative(conv.updatedAt) }}</div>
      </div>
      
      <div v-if="!hasCurrentWorkspace" class="text-text-muted text-sm text-center py-4">
        Select a workspace to view conversations
      </div>
      
      <div v-else-if="filteredConversations.length === 0" class="text-text-muted text-sm text-center py-4">
        No conversations
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatRelative } from '../utils/formatting'
import PlusIcon from './icons/PlusIcon.vue'
import SearchIcon from './icons/SearchIcon.vue'
import { useWorkspaceStore } from '../stores/workspace'
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

const workspaces = computed(() => workspaceStore.workspaces)
const currentWorkspacePath = computed(() => workspaceStore.currentWorkspace?.path)
const hasCurrentWorkspace = computed(() => workspaceStore.hasCurrentWorkspace)

const searchQuery = ref('')

const filteredConversations = computed(() => {
  if (!searchQuery.value.trim()) return props.conversations
  const query = searchQuery.value.toLowerCase()
  return props.conversations.filter(conv => conv.title.toLowerCase().includes(query))
})

function handleSelectWorkspace(path: string) {
  emit('selectWorkspace', path)
}

function handleAddWorkspace() {
  emit('addWorkspace')
}
</script>