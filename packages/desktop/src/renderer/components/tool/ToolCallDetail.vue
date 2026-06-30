<script setup lang="ts">
/**
 * ToolCallDetail - Expanded tool call with full info
 *
 * Shows: args, output, error, progress, duration
 */
import { ref, computed } from 'vue'
import type { StreamingToolCall } from '../../stores/streaming/types'
import { parseToolArgs } from '../../stores/streaming/types'

const props = defineProps<{
  tool: StreamingToolCall
  duration: string | null
}>()

const emit = defineEmits<{
  collapse: []
}>()

// Parsed input args
const parsedInput = computed(() => parseToolArgs(props.tool.rawInput))

// Parsed output
const parsedOutput = computed(() => {
  if (!props.tool.rawOutput) return null
  try {
    return JSON.parse(props.tool.rawOutput)
  } catch {
    return props.tool.rawOutput
  }
})

// Show output section
const showOutput = computed(() =>
  props.tool.lifecycle === 'completed' && props.tool.rawOutput
)

// Show error section
const showError = computed(() =>
  props.tool.lifecycle === 'failed' && props.tool.error
)

// Show progress section (for streaming tools)
const showProgress = computed(() =>
  props.tool.progress.length > 0
)
</script>

<template>
  <div class="detail-view bg-bg-elevated rounded-lg border border-border mt-1">
    <!-- Header with collapse button -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border">
      <button
        class="text-text-muted hover:text-text transition-colors cursor-pointer"
        @click="emit('collapse')"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span class="text-xs font-semibold text-accent font-mono">
        {{ tool.name }}
      </span>
    </div>

    <div class="p-3 space-y-3">
      <!-- Input args -->
      <div>
        <div class="text-xs text-text-muted mb-1">Input</div>
        <pre class="bg-code-bg p-2 rounded text-xs overflow-x-auto font-mono leading-relaxed">{{ JSON.stringify(parsedInput, null, 2) }}</pre>
      </div>

      <!-- Progress (streaming tools) -->
      <div v-if="showProgress">
        <div class="text-xs text-text-muted mb-1">Progress</div>
        <div class="bg-code-bg p-2 rounded text-xs overflow-x-auto max-h-32">
          <div
            v-for="(p, idx) in tool.progress.slice(-5)"
            :key="idx"
            class="text-text-muted font-mono"
          >
            {{ p.message }}
          </div>
        </div>
      </div>

      <!-- Output -->
      <div v-if="showOutput">
        <div class="text-xs text-text-muted mb-1">Output</div>
        <pre
          class="bg-code-bg p-2 rounded text-xs overflow-x-auto font-mono leading-relaxed max-h-64"
        >{{ typeof parsedOutput === 'object' ? JSON.stringify(parsedOutput, null, 2) : parsedOutput }}</pre>
      </div>

      <!-- Error -->
      <div v-if="showError">
        <div class="text-xs text-error mb-1">Error</div>
        <div class="bg-error-muted/20 p-2 rounded text-xs text-error border border-error/30">
          {{ tool.error }}
        </div>
      </div>

      <!-- Duration (bottom) -->
      <div v-if="duration" class="text-xs text-text-muted tabular-nums">
        {{ duration }}
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(pre) {
  font-family: 'JetBrains Mono', 'Cascadia Code', Consolas, monospace;
}
</style>
