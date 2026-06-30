<script setup lang="ts">
/**
 * StreamingTools - Tool calls list
 *
 * Compact list layout. Shows optional "Tool Calls (N)" header when:
 * - Tool count >= 8, or
 * - Region is collapsed
 */
import { ref, computed } from 'vue'
import type { StreamingToolCall } from '../../stores/streaming/types'
import ToolCallContainer from '../tool/ToolCallContainer.vue'

const props = defineProps<{
  tools: StreamingToolCall[]
  isStreaming: boolean
}>()

const collapsed = ref(false)

// Show header when many tools or collapsed
const showHeader = computed(() =>
  props.tools.length >= 8 || collapsed.value
)

function toggleCollapsed() {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <div class="streaming-tools my-3">
    <!-- Optional header -->
    <button
      v-if="showHeader"
      class="flex items-center gap-2 text-xs text-text-secondary font-medium px-1 py-1 hover:bg-bg-surface rounded cursor-pointer w-full"
      @click="toggleCollapsed"
    >
      <svg
        class="w-3 h-3 transition-transform"
        :class="collapsed ? '' : 'rotate-90'"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      Tool Calls ({{ tools.length }})
    </button>

    <!-- Tool list -->
    <div v-if="!collapsed" class="space-y-0.5">
      <ToolCallContainer
        v-for="tool in tools"
        :key="tool.id"
        :tool="tool"
        :is-streaming="isStreaming"
      />
    </div>
  </div>
</template>
