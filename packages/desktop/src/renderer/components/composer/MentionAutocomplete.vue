<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MentionItem, MentionState } from '../../../types/mention'

const props = defineProps<{
  state: MentionState
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [item: MentionItem]
  hide: []
}>()

const selectedIndex = ref(0)

const items = computed(() => props.state.items)

watch(items, () => {
  selectedIndex.value = 0
})

const selectedItem = computed(() => {
  if (selectedIndex.value >= 0 && selectedIndex.value < items.value.length) {
    return items.value[selectedIndex.value]
  }
  return null
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, items.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
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

defineExpose({
  handleKeydown
})

function getIcon(item: MentionItem) {
  if (item.kind === 'agent') {
    return 'agent'
  }
  if (item.kind === 'file') {
    return item.directory ? 'folder' : 'file'
  }
  return 'resource'
}
</script>

<template>
  <div
    v-if="state.visible"
    class="mention-autocomplete"
    style="position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); min-width: 360px; max-width: 500px; background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); z-index: 9999; overflow: hidden;"
  >
    <div style="max-height: 400px; overflow-y: auto;">
      <div
        v-for="(item, index) in items"
        :key="item.value + '-' + item.kind + '-' + index"
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
        @click="emit('select', item)"
        @mouseenter="selectedIndex = index"
      >
        <!-- Agent icon -->
        <svg v-if="getIcon(item) === 'agent'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 8V4H8"/>
          <rect width="16" height="12" x="4" y="8" rx="2"/>
          <path d="M2 14h2"/>
          <path d="M20 14h2"/>
          <path d="M15 13v2"/>
          <path d="M9 13v2"/>
        </svg>
        <!-- File icon -->
        <svg v-else-if="getIcon(item) === 'file'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <!-- Folder icon -->
        <svg v-else-if="getIcon(item) === 'folder'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
        </svg>
        <!-- Resource icon -->
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2"/>
          <line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
        <span style="color: #e2e8f0; font-size: 14px; font-weight: 500;">@{{ item.value }}</span>
        <span v-if="item.description" style="color: #64748b; font-size: 12px; margin-left: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">{{ item.description }}</span>
      </div>

      <div v-if="items.length === 0" style="padding: 24px; text-align: center; color: #64748b; font-size: 14px;">
        {{ loading ? 'Searching...' : 'No matches found' }}
      </div>
    </div>
    <div v-if="items.length > 0" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; border-top: 1px solid #2a2a3e; font-size: 12px; color: #64748b;">
      <span>↑↓ Navigate · Enter Select · Esc Close</span>
    </div>
  </div>
</template>
