<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import type { MentionItem, MentionState, MentionKind } from '../../../types/mention'

const props = defineProps<{
  state: MentionState
  agents: MentionItem[]
  resources: MentionItem[]
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [item: MentionItem]
  hide: []
}>()

const searchInputRef = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const activeTab = ref<MentionKind | 'all'>('all')
const selectedIndex = ref(0)

const tabs = [
  { kind: 'all' as const, label: 'All' },
  { kind: 'agent' as const, label: 'Agents' },
  { kind: 'file' as const, label: 'Files' },
  { kind: 'resource' as const, label: 'Resources' }
]

const query = computed(() => searchQuery.value.toLowerCase())

const filteredAgents = computed(() => {
  const items = props.agents
  if (!query.value) return items
  return items.filter(item =>
    item.value.toLowerCase().includes(query.value) ||
    item.description?.toLowerCase().includes(query.value)
  )
})

const filteredFiles = computed(() => {
  const items = props.state.items.filter(i => i.kind === 'file')
  if (!query.value) return items
  return items.filter(item =>
    item.value.toLowerCase().includes(query.value)
  )
})

const filteredResources = computed(() => {
  const items = props.resources
  if (!query.value) return items
  return items.filter(item =>
    item.value.toLowerCase().includes(query.value) ||
    item.description?.toLowerCase().includes(query.value)
  )
})

const allItems = computed(() => {
  console.log('[MentionAutocomplete] computing allItems', {
    agents: props.agents.length,
    files: props.state.items.length,
    resources: props.resources.length,
    filteredAgents: filteredAgents.value.length,
    filteredFiles: filteredFiles.value.length,
    filteredResources: filteredResources.value.length,
  })
  if (activeTab.value === 'all') {
    return [...filteredAgents.value, ...filteredFiles.value, ...filteredResources.value]
  }
  if (activeTab.value === 'agent') return filteredAgents.value
  if (activeTab.value === 'file') return filteredFiles.value
  if (activeTab.value === 'resource') return filteredResources.value
  return []
})

function shouldShow(kind: MentionKind): boolean {
  if (activeTab.value !== 'all' && activeTab.value !== kind) return false
  if (kind === 'agent') return filteredAgents.value.length > 0
  if (kind === 'file') return filteredFiles.value.length > 0
  if (kind === 'resource') return filteredResources.value.length > 0
  return false
}

function isSelected(kind: MentionKind, index: number): boolean {
  return selectedIndex.value === getGlobalIndex(kind, index)
}

function getGlobalIndex(kind: MentionKind, localIndex: number): number {
  if (activeTab.value !== 'all') return localIndex
  let offset = 0
  if (kind === 'agent') return localIndex
  offset += filteredAgents.value.length
  if (kind === 'file') return offset + localIndex
  offset += filteredFiles.value.length
  if (kind === 'resource') return offset + localIndex
  return localIndex
}

function selectItem(item: MentionItem) {
  emit('select', item)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, allItems.value.length - 1)
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  }
  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    const item = allItems.value[selectedIndex.value]
    if (item) selectItem(item)
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('hide')
  }
}

watch(allItems, () => {
  console.log('[MentionAutocomplete] allItems changed:', allItems.value.length)
  selectedIndex.value = 0
})

onMounted(() => {
  console.log('[MentionAutocomplete] mounted', {
    stateVisible: props.state.visible,
    agents: props.agents.length,
    resources: props.resources.length
  })
  nextTick(() => {
    searchInputRef.value?.focus()
  })
})
</script>

<template>
  <div
    v-if="state.visible"
    class="mention-autocomplete"
    style="position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); min-width: 320px; max-width: 500px; max-height: 400px; background: #1e1e1e; border: 1px solid #333; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 9999; color: #fff;"
  >
    <div class="p-2 border-b border-border">
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        placeholder="Search files, agents, or resources..."
        class="w-full bg-bg-hover border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
        @keydown="handleKeydown"
      />
    </div>

    <div class="flex border-b border-border">
      <button
        v-for="tab in tabs"
        :key="tab.kind"
        class="px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg-hover"
        :class="activeTab === tab.kind
          ? 'text-accent border-b-2 border-accent'
          : 'text-text-muted'"
        @click="activeTab = tab.kind"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="max-h-48 overflow-y-auto">
      <div v-if="shouldShow('agent')" class="mention-group">
        <div class="px-3 py-1 text-xs text-text-muted bg-bg-hover sticky top-0">
          Agents
        </div>
        <button
          v-for="(item, index) in filteredAgents"
          :key="'agent-' + item.value"
          class="mention-item w-full px-3 py-2 text-left text-sm hover:bg-accent-muted transition-colors flex items-center gap-2"
          :class="{ 'bg-accent-muted': isSelected('agent', index) }"
          @click="selectItem(item)"
          @mouseenter="selectedIndex = getGlobalIndex('agent', index)"
        >
          <span class="text-accent font-mono">@</span>
          <span class="flex-1 truncate">{{ item.value }}</span>
          <span v-if="item.description" class="text-text-muted text-xs truncate">
            {{ item.description }}
          </span>
        </button>
      </div>

      <div v-if="shouldShow('file')" class="mention-group">
        <div class="px-3 py-1 text-xs text-text-muted bg-bg-hover sticky top-0">
          Files
        </div>
        <button
          v-for="(item, index) in filteredFiles"
          :key="'file-' + item.value"
          class="mention-item w-full px-3 py-2 text-left text-sm hover:bg-accent-muted transition-colors flex items-center gap-2"
          :class="{ 'bg-accent-muted': isSelected('file', index) }"
          @click="selectItem(item)"
          @mouseenter="selectedIndex = getGlobalIndex('file', index)"
        >
          <span class="text-accent font-mono">@</span>
          <span class="flex-1 truncate">{{ item.value }}</span>
          <span v-if="item.directory" class="text-text-muted">/</span>
        </button>
      </div>

      <div v-if="shouldShow('resource')" class="mention-group">
        <div class="px-3 py-1 text-xs text-text-muted bg-bg-hover sticky top-0">
          Resources
        </div>
        <button
          v-for="(item, index) in filteredResources"
          :key="'resource-' + item.value"
          class="mention-item w-full px-3 py-2 text-left text-sm hover:bg-accent-muted transition-colors flex items-center gap-2"
          :class="{ 'bg-accent-muted': isSelected('resource', index) }"
          @click="selectItem(item)"
          @mouseenter="selectedIndex = getGlobalIndex('resource', index)"
        >
          <span class="text-accent font-mono">@</span>
          <span class="flex-1 truncate">{{ item.value }}</span>
          <span v-if="item.description" class="text-text-muted text-xs truncate">
            {{ item.description }}
          </span>
        </button>
      </div>

      <div v-if="allItems.length === 0" class="px-3 py-4 text-center">
        <p class="text-sm text-text-muted">
          {{ loading ? 'Searching...' : 'No matches found' }}
        </p>
      </div>
    </div>

    <div class="sticky bottom-0 bg-bg-elevated border-t border-border px-3 py-1.5 flex items-center gap-2 text-xs text-text-muted">
      <kbd>↑↓</kbd> Navigate
      <span class="mx-1">·</span>
      <kbd>Enter</kbd> Select
      <span class="mx-1">·</span>
      <kbd>Esc</kbd> Close
    </div>
  </div>
</template>

<style scoped>
.mention-autocomplete {
  max-height: 400px;
}

.mention-group {
  border-bottom: 1px solid var(--border);
}

.mention-group:last-child {
  border-bottom: none;
}
</style>
