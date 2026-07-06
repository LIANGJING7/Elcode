<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../../stores/ui'
import { useSubagentStore } from '../../stores/subagent'
import type { FileTab } from '../../types/presentation'
import FileTabsHeader from './FileTabsHeader.vue'

const ui = useUiStore()
const subagentStore = useSubagentStore()

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
    class="file-tabs-panel w-96 flex flex-col min-h-0 border-l border-border bg-bg-surface"
  >
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