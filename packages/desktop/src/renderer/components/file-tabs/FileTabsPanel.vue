<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useUiStore } from '../../stores/ui'
import FileTabsHeader from './FileTabsHeader.vue'
import TextViewer from './TextViewer.vue'
import DiffViewer from './DiffViewer.vue'
import ImageViewer from './ImageViewer.vue'

const ui = useUiStore()

const VIEWER_MAP: Record<string, Component> = {
  text: TextViewer,
  diff: DiffViewer,
  image: ImageViewer,
}

const activeTab = computed(() =>
  ui.fileTabs.find((t) => t.id === ui.activeFileTabId),
)

const viewerComponent = computed(() =>
  VIEWER_MAP[activeTab.value?.viewer ?? 'text'],
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

    <component
      v-if="activeTab"
      :is="viewerComponent"
      :model="activeTab.model"
      :status="activeTab.status"
      @scroll="handleViewerScroll"
    />
  </div>
</template>
