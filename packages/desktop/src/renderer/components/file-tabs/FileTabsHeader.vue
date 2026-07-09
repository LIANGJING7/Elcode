<script setup lang="ts">
import type { PanelTab } from '../../types/presentation'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  tabs: PanelTab[]
  activeId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  close: [id: string]
  closeAll: []
}>()

// Tab icon based on type
function getTabIcon(tab: PanelTab): string {
  if (tab.type === 'subagent') return ''
  return '📄'
}

// Tab status class
function getTabStatusClass(tab: PanelTab): string {
  if (tab.type !== 'subagent') return ''
  return ''
}
</script>

<template>
  <div class="file-tabs-header flex items-center gap-1 px-2 py-1 bg-bg-elevated border-b border-border">
    <div 
      v-for="tab in tabs" 
      :key="tab.id"
      class="tab group flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-bg-surface text-xs"
      :class="{ 'bg-bg-surface': tab.id === activeId }"
      @click="emit('select', tab.id)"
    >
      <!-- Icon -->
      <span v-if="getTabIcon(tab)" :class="['shrink-0', getTabStatusClass(tab)]">{{ getTabIcon(tab) }}</span>
      
      <!-- Title -->
      <span class="truncate flex-1">{{ tab.title }}</span>
      
      <!-- Subtitle (for subagent) -->
      <span v-if="tab.subtitle" class="text-text-muted truncate max-w-[100px]">{{ tab.subtitle }}</span>
      
      <!-- Close button -->
      <button 
        class="close-btn opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-bg-active shrink-0"
        @click.stop="emit('close', tab.id)"
      >
        <X class="w-3 h-3" />
      </button>
    </div>
    
    <!-- Close all -->
    <button 
      v-if="tabs.length > 1"
      class="text-xs text-text-muted px-2 hover:text-text"
      @click="emit('closeAll')"
    >
      Close all
    </button>
  </div>
</template>