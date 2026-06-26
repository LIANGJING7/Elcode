<script setup lang="ts">
import { ref } from 'vue'
import type { ToolCall } from '../../../types/ipc'

const props = defineProps<{ toolCall: ToolCall }>()
const emit = defineEmits<{ inspect: [id: string] }>()

// B 规则: 默认展开(单行)
const expanded = ref(true)

function toggle() {
  expanded.value = !expanded.value
}

// 单行摘要
function summary(): string {
  const args = props.toolCall.args as Record<string, unknown>
  const path = args?.path ?? ''
  return `${props.toolCall.name} ${path}`
}
</script>

<template>
  <div class="tool-block bg-surface rounded border border-surface my-2">
    <!-- 单行摘要 + 状态点 + 切换按钮 -->
    <div class="flex items-center gap-2 px-3 py-2">
      <button
        data-testid="toggle"
        class="text-accent-muted hover:text-accent"
        @click="toggle"
      >
        {{ expanded ? '▼' : '▸' }}
      </button>
      <span
        data-testid="summary"
        class="flex-1 cursor-pointer hover:bg-surface-hover rounded px-1"
        @click="emit('inspect', toolCall.id)"
      >
        <span
          data-testid="status-dot"
          :class="['inline-block mr-1', toolCall.status || 'completed']"
        >
          ●
        </span>
        {{ summary() }}
      </span>
    </div>

    <!-- 详情 (展开时显示) -->
    <div v-if="expanded" data-testid="detail" class="px-3 pb-2 text-sm">
      <pre class="bg-surface-hover p-2 rounded overflow-x-auto">{{ JSON.stringify(toolCall.args, null, 2) }}</pre>
      <pre v-if="toolCall.result" class="bg-surface-hover p-2 rounded overflow-x-auto mt-1">{{ JSON.stringify(toolCall.result, null, 2) }}</pre>
      <div v-if="toolCall.error" class="text-error p-2 rounded mt-1">{{ toolCall.error }}</div>
    </div>
  </div>
</template>

<style scoped>
.status-dot.running {
  color: var(--color-warning);
  animation: pulse 1.5s infinite;
}
.status-dot.completed {
  color: var(--color-success);
}
.status-dot.error {
  color: var(--color-error);
}
.status-dot.pending {
  color: var(--color-accent-muted);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>