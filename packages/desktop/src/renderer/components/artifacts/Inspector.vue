<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiStore } from '../../stores/ui'

const props = defineProps<{
  messages: Array<{ toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown>; status?: string; result?: unknown; error?: string }> }>
}>()

const ui = useUiStore()
const { activeToolCallId, inspectorOpen } = storeToRefs(ui)

// 从 messages 找 activeToolCallId 对应的 toolCall
const activeToolCall = computed(() => {
  if (!activeToolCallId.value) return null
  for (const msg of props.messages) {
    const tc = msg.toolCalls?.find((t) => t.id === activeToolCallId.value)
    if (tc) return tc
  }
  return null
})

function closeInspector() {
  ui.inspectorOpen = false
  ui.activeToolCallId = null
}
</script>

<template>
  <div v-if="inspectorOpen && activeToolCall" class="inspector bg-surface border-t border-surface p-3">
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium">Inspector: {{ activeToolCall.name }}</span>
      <button data-testid="close-inspector" class="text-accent-muted hover:text-accent" @click="closeInspector">
        ✕
      </button>
    </div>

    <!-- 状态 -->
    <div class="text-xs mb-2">
      Status:
      <span :class="activeToolCall.status === 'completed' ? 'text-success' : 'text-warning'">
        {{ activeToolCall.status || 'unknown' }}
      </span>
    </div>

    <!-- 入参 -->
    <div class="text-xs mb-2">
      <div class="font-medium mb-1">Args:</div>
      <pre class="bg-surface-hover p-2 rounded overflow-x-auto">{{ JSON.stringify(activeToolCall.args, null, 2) }}</pre>
    </div>

    <!-- 返回 -->
    <div v-if="activeToolCall.result" class="text-xs mb-2">
      <div class="font-medium mb-1">Result:</div>
      <pre class="bg-surface-hover p-2 rounded overflow-x-auto">{{ JSON.stringify(activeToolCall.result, null, 2) }}</pre>
    </div>

    <!-- 错误 -->
    <div v-if="activeToolCall.error" class="text-xs text-error">
      Error: {{ activeToolCall.error }}
    </div>
  </div>
</template>