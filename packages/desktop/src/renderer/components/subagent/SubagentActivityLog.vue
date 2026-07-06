<!-- packages/desktop/src/renderer/components/subagent/SubagentActivityLog.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { TimelineItem, DisplayPart } from '../../types/subagent'
import { getRenderer } from './registry/rendererRegistry'
import InlineTool from '../part/InlineTool.vue'
import TextBlock from '../part/TextBlock.vue'

const props = defineProps<{ 
  items: TimelineItem[]
  autoScroll?: boolean
}>()

// Simple rendering without VirtualList for initial implementation
const renderItem = (item: TimelineItem) => {
  if (item.type === 'part') {
    return renderPart(item.part)
  }
  // Other item types
  return null
}

const renderPart = (part: DisplayPart) => {
  const renderer = getRenderer(part.type)
  return { component: renderer, props: part.payload }
}
</script>

<template>
  <div class="subagent-activity-log flex-1 overflow-auto p-2">
    <div v-for="(item, i) in items" :key="i" class="timeline-item">
      <template v-if="item.type === 'part'">
        <component :is="getRenderer(item.part.type)" v-bind="(item.part.payload as Record<string, unknown>)" />
      </template>
      <template v-else-if="item.type === 'divider'">
        <div class="divider text-xs text-text-muted py-1 text-center">────────────</div>
      </template>
      <template v-else-if="item.type === 'summary'">
        <div class="summary text-xs text-text-muted py-1">{{ item.text }}</div>
      </template>
    </div>
    <div v-if="items.length === 0" class="text-xs text-text-muted text-center py-4">
      No activity yet
    </div>
  </div>
</template>