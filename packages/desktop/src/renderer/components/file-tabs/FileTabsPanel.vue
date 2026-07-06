<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { useUiStore } from '../../stores/ui'
import { useSubagentStore } from '../../stores/subagent'
import type { FileTab } from '../../types/presentation'
import FileTabsHeader from './FileTabsHeader.vue'

const ui = useUiStore()
const subagentStore = useSubagentStore()

const panelWidth = ref(420)
const MIN_WIDTH = 280
const MAX_WIDTH = 800
const isResizing = ref(false)
let startX = 0
let startWidth = 0

function onResizeStart(e: MouseEvent) {
  isResizing.value = true
  startX = e.clientX
  startWidth = panelWidth.value
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onResizeMove(e: MouseEvent) {
  if (!isResizing.value) return
  const delta = startX - e.clientX
  panelWidth.value = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta))
}

function onResizeEnd() {
  isResizing.value = false
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
})

const activeTab = computed(() =>
  ui.panelTabs.find((t) => t.id === ui.activePanelTabId),
)

const activeFileTab = computed(() =>
  activeTab.value?.type === 'file' ? (activeTab.value as FileTab) : null,
)

const activeSubagentTab = computed(() =>
  activeTab.value?.type === 'subagent' ? activeTab.value : null,
)

const subagentData = computed(() => {
  if (!activeSubagentTab.value) return null
  const tab = subagentStore.tabs.get(activeSubagentTab.value.id)
  const detail = subagentStore.details.get(activeSubagentTab.value.id)
  return tab && detail ? { tab, detail } : null
})

function handleViewerScroll(scrollTop: number) {
  if (activeFileTab.value) {
    ui.updateFileTabViewerState(activeFileTab.value.id, { scrollTop })
  }
}
</script>

<template>
  <div
    v-if="ui.panelTabs.length > 0"
    class="file-tabs-panel flex flex-col min-h-0 border-l border-border bg-bg-surface relative"
    :style="{ width: panelWidth + 'px', minWidth: panelWidth + 'px' }"
  >
    <!-- Resize drag handle on left edge -->
    <div
      class="absolute top-0 left-0 w-1 h-full cursor-col-resize z-10 hover:bg-primary/30 transition-colors"
      :class="{ 'bg-primary/30': isResizing }"
      @mousedown.prevent="onResizeStart"
    />
    
    <FileTabsHeader
      :tabs="ui.panelTabs"
      :active-id="ui.activePanelTabId"
      @select="ui.selectPanelTab"
      @close="ui.closePanel"
      @close-all="() => ui.panelTabs.forEach(t => ui.closePanel(t.id))"
    />

    <!-- FileTab: pass model and status -->
    <component
      v-if="activeFileTab"
      :is="activeFileTab.component"
      :model="activeFileTab.model"
      :status="activeFileTab.status"
      @scroll="handleViewerScroll"
    />

    <!-- SubagentTab: pass tab and detail from SubagentStore -->
    <component
      v-else-if="activeSubagentTab && subagentData"
      :is="activeSubagentTab.component"
      :tab="subagentData.tab"
      :detail="subagentData.detail"
    />

    <!-- Fallback: SubagentTab without data (loading state) -->
    <div
      v-else-if="activeSubagentTab && !subagentData"
      class="flex-1 flex items-center justify-center text-text-muted text-xs"
    >
      Loading subagent data...
    </div>
  </div>
</template>