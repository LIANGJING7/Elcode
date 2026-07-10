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

watch(items, () => { selectedIndex.value = 0 })

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

defineExpose({ handleKeydown })

function getIcon(item: MentionItem): string {
  if (item.kind === 'agent') return 'agent'
  if (item.kind === 'file') return item.directory ? 'folder' : 'file'
  return 'resource'
}
</script>

<template>
  <div
    v-if="state.visible"
    class="mention-autocomplete"
    style="position: absolute; bottom: calc(100% + 4px); left: 0; right: 0; max-height: 360px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); z-index: 9999; overflow: hidden; box-sizing: border-box;"
  >
    <div style="max-height: 360px; overflow-y: auto;">
      <div
        v-for="(item, index) in items"
        :key="item.value + '-' + item.kind + '-' + index"
        class="flex items-center gap-3 px-3 py-2 cursor-pointer"
        :style="{
          background: index === selectedIndex ? 'var(--bg-hover)' : 'transparent',
          transition: 'background 0.1s'
        }"
        @click="emit('select', item)"
        @mouseenter="selectedIndex = index"
      >
        <svg v-if="getIcon(item) === 'agent'" class="w-4 h-4 shrink-0" :style="{ color: 'var(--accent)' }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 8V4H8"/>
          <rect width="16" height="12" x="4" y="8" rx="2"/>
          <path d="M2 14h2"/>
          <path d="M20 14h2"/>
          <path d="M15 13v2"/>
          <path d="M9 13v2"/>
        </svg>
        <svg v-else-if="getIcon(item) === 'file'" class="w-4 h-4 shrink-0" style="color: #60a5fa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <svg v-else-if="getIcon(item) === 'folder'" class="w-4 h-4 shrink-0" style="color: #fbbf24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
        </svg>
        <svg v-else class="w-4 h-4 shrink-0" style="color: #34d399" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2"/>
          <line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
        <span style="font-size: 13px; color: var(--text); font-weight: 500;" class="truncate">@{{ item.value }}</span>
        <span v-if="item.description" style="font-size: 12px; color: var(--text-muted);" class="ml-auto truncate max-w-[200px]">{{ item.description }}</span>
      </div>
      <div v-if="items.length === 0" style="padding: 20px; text-align: center; font-size: 13px; color: var(--text-muted);">
        {{ loading ? 'Searching...' : 'No matches found' }}
      </div>
    </div>
  </div>
</template>
