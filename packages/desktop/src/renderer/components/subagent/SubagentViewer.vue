<!-- packages/desktop/src/renderer/components/subagent/SubagentViewer.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { FooterSubagentDetail, FooterSubagentTab } from '../../types/subagent'
import { useSubagentViewer } from './composables/useSubagentViewer'
import SubagentActivityLog from './SubagentActivityLog.vue'

const props = defineProps<{
  detail: FooterSubagentDetail
  tab: FooterSubagentTab
}>()

const vm = useSubagentViewer(computed(() => props.detail), computed(() => props.tab))
</script>

<template>
  <div class="subagent-viewer flex flex-col h-full bg-bg-surface">
    <SubagentActivityLog 
      :items="vm.timeline.value" 
      :auto-scroll="vm.autoScroll.value"
    />
  </div>
</template>