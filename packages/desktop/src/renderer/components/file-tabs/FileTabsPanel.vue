<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../../stores/ui'
import FileTabsHeader from './FileTabsHeader.vue'

const ui = useUiStore()

const activeTab = computed(() =>
  ui.fileTabs.find((t) => t.id === ui.activeFileTabId),
)

function handleViewerScroll(scrollTop: number) {
  if (activeTab.value) {
    ui.updateFileTabViewerState(activeTab.value.id, { scrollTop })
  }
}
</script>

<template>
  <div
    v-if="ui.fileTabs.length > 0"
    class="file-tabs-panel w-96 flex flex-col min-h-0 border-l border-border bg-bg-surface"
  >
    <FileTabsHeader
      :tabs="ui.fileTabs"
      :active-id="ui.activeFileTabId"
      @select="ui.selectFileTab"
      @close="ui.closeFileTab"
      @close-all="ui.closeAllFileTabs"
    />

    <!-- 直接渲染 tab.component，无需 VIEWER_MAP -->
    <component
      v-if="activeTab"
      :is="activeTab.component"
      :model="activeTab.model"
      :status="activeTab.status"
      @scroll="handleViewerScroll"
    />
  </div>
</template>