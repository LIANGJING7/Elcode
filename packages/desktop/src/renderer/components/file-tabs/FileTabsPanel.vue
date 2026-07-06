<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../../stores/ui'
import type { FileTab } from '../../types/presentation'
import FileTabsHeader from './FileTabsHeader.vue'

const ui = useUiStore()

const activeTab = computed(() =>
  ui.panelTabs.find((t) => t.id === ui.activePanelTabId),
)

const activeFileTab = computed(() =>
  activeTab.value?.type === 'file' ? (activeTab.value as FileTab) : null,
)

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

    <!-- SubagentTab: pass only status -->
    <component
      v-else-if="activeTab"
      :is="activeTab.component"
      :status="activeTab.status"
    />
  </div>
</template>