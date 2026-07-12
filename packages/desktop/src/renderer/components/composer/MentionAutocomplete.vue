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
  const idx = selectedIndex.value
  return idx >= 0 && idx < items.value.length ? items.value[idx] : null
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
    class="mention-autocomplete bg-bg-elevated border border-border rounded-lg shadow-lg max-h-80 w-full max-w-lg overflow-hidden absolute bottom-full left-0 mb-1.5 z-[9999]"
  >
    <div class="overflow-y-auto max-h-80">
      <div
        v-for="(item, index) in items"
        :key="item.value + '-' + item.kind + '-' + index"
        class="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
        :class="index === selectedIndex ? 'bg-bg-hover' : ''"
        @click="emit('select', item)"
        @mouseenter="selectedIndex = index"
      >
        <svg v-if="getIcon(item) === 'agent'" class="w-5 h-5 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
          <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
          <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
          <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
          <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
          <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
          <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
          <path d="M6 18a4 4 0 0 1-1.967-.516"/>
          <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
        </svg>
        <svg v-else-if="getIcon(item) === 'file'" class="w-5 h-5 shrink-0 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <svg v-else-if="getIcon(item) === 'folder'" class="w-5 h-5 shrink-0 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
        </svg>
        <svg v-else class="w-5 h-5 shrink-0 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2"/>
          <line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
        <span class="text-sm text-text font-medium truncate">@{{ item.value }}</span>
      </div>
      <div v-if="items.length === 0" class="px-4 py-6 text-center text-sm text-text-muted">
        {{ loading ? 'Searching...' : 'No matches found' }}
      </div>
    </div>
  </div>
</template>
