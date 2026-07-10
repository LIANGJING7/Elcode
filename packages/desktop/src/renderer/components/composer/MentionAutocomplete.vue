<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
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

const selectedIndex = ref(0)
const PAGE_SIZE = 10

const allItems = computed(() => {
  return [...props.agents, ...props.resources, ...props.state.items]
})

const filteredItems = computed(() => {
  const query = props.state.query.toLowerCase()
  if (!query) return allItems.value
  return allItems.value.filter(item =>
    item.value.toLowerCase().includes(query) ||
    item.description?.toLowerCase().includes(query)
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / PAGE_SIZE)))

const currentPage = ref(0)

watch(() => props.state.query, () => {
  currentPage.value = 0
  selectedIndex.value = 0
})

const pagedItems = computed(() => {
  const start = currentPage.value * PAGE_SIZE
  return filteredItems.value.slice(start, start + PAGE_SIZE)
})

const globalIndex = computed(() => {
  const start = currentPage.value * PAGE_SIZE
  return start + selectedIndex.value
})

const selectedItem = computed(() => {
  const idx = globalIndex.value
  if (idx >= 0 && idx < filteredItems.value.length) {
    return filteredItems.value[idx]
  }
  return null
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (selectedIndex.value < pagedItems.value.length - 1) {
      selectedIndex.value++
    } else if (currentPage.value < totalPages.value - 1) {
      currentPage.value++
      selectedIndex.value = 0
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (selectedIndex.value > 0) {
      selectedIndex.value--
    } else if (currentPage.value > 0) {
      currentPage.value--
      selectedIndex.value = PAGE_SIZE - 1
    }
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    if (selectedItem.value) {
      emit('select', selectedItem.value)
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('hide')
  }
}

function selectItem(item: MentionItem) {
  emit('select', item)
}

function handleExternalKeydown(e: KeyboardEvent) {
  handleKeydown(e)
}

defineExpose({
  handleKeydown: handleExternalKeydown
})
</script>

<template>
  <div
    v-if="state.visible"
    class="mention-autocomplete"
    style="position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); min-width: 360px; max-width: 500px; max-height: 440px; background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); z-index: 9999; overflow: hidden;"
  >
    <div style="max-height: 400px; overflow-y: auto;">
      <div
        v-for="(item, index) in pagedItems"
        :key="item.value + '-' + item.kind"
        class="mention-item"
        :style="{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          cursor: 'pointer',
          background: index === selectedIndex ? '#2a2a3e' : 'transparent',
          transition: 'background 0.15s',
          borderRadius: '8px',
          margin: '2px 4px',
        }"
        @click="selectItem(item)"
        @mouseenter="selectedIndex = index"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
        </svg>
        <span style="color: #e2e8f0; font-size: 14px; font-weight: 500;">@{{ item.value }}</span>
        <span v-if="item.description" style="color: #64748b; font-size: 12px; margin-left: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;">{{ item.description }}</span>
      </div>

      <div v-if="pagedItems.length === 0" style="padding: 24px; text-align: center; color: #64748b; font-size: 14px;">
        {{ loading ? 'Searching...' : 'No matches found' }}
      </div>
    </div>

    <div v-if="filteredItems.length > PAGE_SIZE" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; border-top: 1px solid #2a2a3e; font-size: 12px; color: #64748b;">
      <span>{{ globalIndex + 1 }} / {{ filteredItems.length }}</span>
      <span>Page {{ currentPage + 1 }} / {{ totalPages }}</span>
      <span>↑↓ Navigate · Enter Select · Esc Close</span>
    </div>
  </div>
</template>

<style scoped>
.mention-item:hover {
  background: #2a2a3e !important;
}
</style>
