<template>
  <div v-if="skill" class="skill-detail-panel flex flex-col h-full bg-bg-elevated border-l border-border">
    <PanelHeader
      :skill-name="skill.name"
      :skill-location="skill.location"
      @close="handleClose"
    />
    
    <div class="panel-content flex-1 overflow-y-auto p-4">
      <MarkdownRenderer :content="skill.content" />
    </div>
    
    <PanelActions :content="skill.content" />
  </div>
</template>

<script setup lang="ts">
import type { SkillInfo } from '../../../types/ipc'
import PanelHeader from '../skill-detail/PanelHeader.vue'
import PanelActions from '../skill-detail/PanelActions.vue'
import MarkdownRenderer from './MarkdownRenderer.vue'

const props = defineProps<{
  skill: SkillInfo | null
}>()

const emit = defineEmits<{
  'close': []
}>()

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.skill-detail-panel {
  flex: 1;
  min-width: 0;
}

.panel-content {
  min-height: 0;
}
</style>