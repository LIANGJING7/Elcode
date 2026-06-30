<script setup lang="ts">
/**
 * ToolCallBlock - Compact tool call display for completed messages
 *
 * Shows: status icon + tool name + summary, expandable for details
 */
import { ref, computed } from 'vue'
import type { ToolCall } from '../../../types/ipc'

const props = defineProps<{ toolCall: ToolCall }>()
const emit = defineEmits<{ inspect: [id: string] }>()

// B 规则：默认展开 (单行)
const expanded = ref(true)

function toggle() {
  expanded.value = !expanded.value
}

// Status icon based on status
const statusIcon = computed(() => {
  switch (props.toolCall.status) {
    case 'completed': return { char: '✓', class: 'text-success' }
    case 'running': return { char: '●', class: 'text-warning animate-pulse' }
    case 'error': return { char: '✗', class: 'text-error' }
    case 'pending': return { char: '○', class: 'text-text-muted' }
    default: return { char: '○', class: 'text-text-muted' }
  }
})

// Summary text
function summary(): string {
  const args = props.toolCall.args as Record<string, unknown>
  const path = args?.path ?? args?.filePath ?? args?.command ?? ''
  return String(path).slice(0, 50)
}
</script>

<template>
  <div class="tool-block rounded my-1">
    <!-- 单行摘要 + 状态点 + 切换按钮 -->
    <div class="flex items-center gap-2 px-2 py-1.5">
      <button
        data-testid="toggle"
        class="text-text-muted hover:text-accent cursor-pointer"
        @click="toggle"
      >
        {{ expanded ? '▼' : '▸' }}
      </button>
      <span
        data-testid="summary"
        class="flex-1 cursor-pointer hover:bg-bg-surface rounded px-1"
        @click="emit('inspect', toolCall.id)"
      >
        <span
          data-testid="status-dot"
          :class="['inline-block mr-2 text-sm w-5 text-center', statusIcon.class]"
        >
          {{ statusIcon.char }}
        </span>
        <span class="text-xs font-mono text-text-secondary w-20 inline-block">
          {{ toolCall.name }}
        </span>
        <span class="text-xs text-text-primary font-medium">
          {{ summary() }}
        </span>
      </span>
    </div>

    <!-- 详情 (展开时显示) -->
    <div v-if="expanded" data-testid="detail" class="px-3 pb-2 text-sm">
      <pre class="bg-surface-hover p-2 rounded overflow-x-auto text-xs font-mono">{{ JSON.stringify(toolCall.args, null, 2) }}</pre>
      <pre v-if="toolCall.result" class="bg-surface-hover p-2 rounded overflow-x-auto mt-1 text-xs font-mono">{{ JSON.stringify(toolCall.result, null, 2) }}</pre>
      <div v-if="toolCall.error" class="text-error p-2 rounded mt-1 text-xs">{{ toolCall.error }}</div>
    </div>
  </div>
</template>

<style scoped>
.animate-pulse {
  animation: icon-pulse 1.5s ease-in-out infinite;
}

@keyframes icon-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
