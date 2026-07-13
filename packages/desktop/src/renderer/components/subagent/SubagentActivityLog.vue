<!-- packages/desktop/src/renderer/components/subagent/SubagentActivityLog.vue -->
<script setup lang="ts">
import type { TimelineItem } from '../../types/subagent'
import { getRenderer } from './registry/rendererRegistry'

const props = defineProps<{ 
  items: TimelineItem[]
  autoScroll?: boolean
}>()

function getSource(item: TimelineItem): string {
  if (item.type === 'part') {
    return ((item.part.payload as any)?.source) || ''
  }
  return ''
}
</script>

<template>
  <div class="subagent-activity-log flex-1 overflow-auto p-2 pb-16">
    <div
      v-for="(item, i) in items"
      :key="i"
      class="timeline-item w-full mb-2"
      :class="getSource(item) === 'user' ? 'flex justify-end' : 'flex justify-start'"
    >
      <div
        v-if="item.type === 'part'"
        :class="[
          'max-w-[85%]',
          getSource(item) === 'user'
            ? 'bg-primary/10 rounded-lg px-3 py-2'
            : ''
        ]"
      >
        <component :is="getRenderer(item.part.type)" v-bind="(item.part.payload as Record<string, unknown>)" />
      </div>
      <template v-else-if="item.type === 'divider'">
        <div class="divider text-xs text-text-muted py-1 text-center w-full">────────────</div>
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