<template>
  <aside class="sidebar w-sidebar bg-bg-secondary border-r border-border flex flex-col">
    <header class="p-3">
      <button class="new-chat-button flex items-center gap-2 w-full px-3 py-2 bg-bg-tertiary rounded text-text text-sm hover:bg-accent-hover transition-colors duration-fast" @click="$emit('newChat')">
        <PlusIcon class="w-4 h-4" />
        <span>New Chat</span>
      </button>
    </header>

    <div class="search-container p-3">
      <div class="relative">
        <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input v-model="searchQuery" type="text" placeholder="Search..." class="w-full pl-9 pr-3 py-2 bg-bg-tertiary border border-border rounded text-text text-sm placeholder:text-text-muted focus:border-accent outline-none transition-colors duration-fast" />
      </div>
    </div>

    <nav class="conversation-list flex-1 overflow-y-auto px-3">
      <div v-for="conv in filteredConversations" :key="conv.id" class="conversation-item px-3 py-2 rounded cursor-pointer transition-colors duration-fast mb-1" :class="conv.id === currentSessionId ? 'bg-accent text-white' : 'hover:bg-bg-tertiary'" @click="$emit('selectSession', conv.id)">
        <div class="text-sm truncate">{{ conv.title }}</div>
        <div class="text-xs text-text-muted mt-1">{{ formatRelative(conv.updatedAt) }}</div>
      </div>
      
      <div v-if="filteredConversations.length === 0" class="text-text-muted text-sm text-center py-4">
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
import type { Conversation } from '../../types/ipc'

const props = defineProps<{
  conversations: Conversation[]
  currentSessionId: string | null
}>()

defineEmits<{
  newChat: []
  selectSession: [sessionId: string]
}>()

const searchQuery = ref('')

const filteredConversations = computed(() => {
  if (!searchQuery.value.trim()) return props.conversations
  const query = searchQuery.value.toLowerCase()
  return props.conversations.filter(conv => conv.title.toLowerCase().includes(query))
})
</script>