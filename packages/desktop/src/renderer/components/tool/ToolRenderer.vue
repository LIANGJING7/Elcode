<script setup lang="ts">
/**
 * ToolRenderer — collapsible tool call display (VS Code search panel style).
 *
 * Layout:
 *   [arrow] [icon] [tool name] [summary] [count/status]
 *   ├── [expanded content with left border]
 *
 * Click behavior:
 *   - Click header → toggle expand/collapse
 *   - 'panel' mode tools → also emit openFile for right panel
 */
import { ref, computed } from 'vue'
import type { ToolCall } from '../../../types/ipc'
import { getTool, type ToolViewModel } from '../../tool/registry'
// Activating built-in rules on import (idempotent).
import '../../tool/rules'
import ToolCallExpanded from './ToolCallExpanded.vue'

const props = withDefaults(defineProps<{
  tool: ToolCall
  /** Initial expanded state (default: collapsed). */
  defaultExpanded?: boolean
}>(), {
  defaultExpanded: false,
})

const emit = defineEmits<{ openFile: [tool: ToolCall] }>()

const expanded = ref(props.defaultExpanded)

const meta = computed(() => getTool(props.tool.name))
const viewModel = computed(() => meta.value?.createViewModel(props.tool) as ToolViewModel | undefined)

// Status icon
const statusIcon = computed(() => {
  switch (props.tool.status) {
    case 'completed': return { char: '✓', class: 'text-success' }
    case 'running': return { char: '●', class: 'text-warning' }
    case 'error': return { char: '✗', class: 'text-error' }
    case 'pending':
    default: return { char: '○', class: 'text-text-muted' }
  }
})

// Summary text
const summaryText = computed(() => {
  if (meta.value) return meta.value.summary(props.tool)
  // Fallback: first string arg
  for (const val of Object.values(props.tool.args)) {
    if (typeof val === 'string' && val.length > 0) return val
  }
  return ''
})

// Display name
const displayName = computed(() => {
  const name = props.tool.name
  const parts = name.split('_')
  if (parts.length >= 2 && parts[0] === parts[1]) {
    return parts.slice(1).join('_')
  }
  return name
})

// Duration
const durationText = computed(() => {
  if (props.tool.duration != null) {
    const ms = props.tool.duration
    if (ms < 1000) return `${ms}ms`
    return `${Math.floor(ms / 1000)}s`
  }
  return null
})

// Interaction mode
const interaction = computed(() => meta.value?.defaultInteraction ?? 'inline')

// Toggle expand
function toggleExpand() {
  if (interaction.value === 'panel') {
    emit('openFile', props.tool)
  }
  expanded.value = !expanded.value
}

// Open in panel
function openInPanel() {
  emit('openFile', props.tool)
  expanded.value = false
}
</script>

<template>
  <div class="tool-renderer" :data-tool-name="tool.name">
    <!-- Header row (collapsible) -->
    <div
      class="tool-header flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group hover:bg-bg-surface transition-colors"
      @click="toggleExpand"
    >
      <!-- Chevron arrow (right when collapsed, down when expanded) -->
      <svg
        class="w-3 h-3 text-text-muted transition-transform duration-150"
        :class="{ 'rotate-90': expanded }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>

      <!-- Status icon -->
      <span :class="['text-sm shrink-0 w-4 text-center', statusIcon.class]">
        {{ statusIcon.char }}
      </span>

      <!-- Tool icon -->
      <span v-if="meta" class="text-xs text-accent shrink-0 w-4 text-center">
        {{ meta.icon }}
      </span>

      <!-- Tool name (mono) -->
      <span class="text-xs font-mono text-text-secondary shrink-0">
        {{ displayName }}
      </span>

      <!-- Summary (bold) -->
      <span class="text-xs text-text-primary font-medium flex-1 truncate">
        {{ summaryText }}
      </span>

      <!-- Duration / count -->
      <span v-if="durationText" class="text-xs text-text-muted tabular-nums shrink-0">
        {{ durationText }}
      </span>

      <!-- Panel button (for panel-mode tools) -->
      <button
        v-if="interaction === 'panel'"
        class="text-xs text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        @click.stop="openInPanel"
        title="Open in side panel"
      >
        
      </button>
    </div>

    <!-- Expanded content (with left border) -->
    <div v-if="expanded" class="expanded-content ml-6 mt-1 mb-1 pl-4 border-l-2 border-border">
      <ToolCallExpanded
        :tool="tool"
        :meta="meta"
        :vm="viewModel"
        @collapse="expanded = false"
      />
    </div>
  </div>
</template>

<style scoped>
.tool-renderer {
  font-family: system-ui, -apple-system, sans-serif;
}

.expanded-content {
  /* Indent content with left border (VS Code style) */
}
</style>