<script setup lang="ts">
/**
 * ToolRenderer — the single entry point for tool call display.
 *
 * Used everywhere a tool call is shown: streaming timeline, history messages,
 * search results, artifact panel. It looks up the ToolMeta from the registry,
 * builds the ViewModel, and renders either the compact row (collapsed) or the
 * expanded detail panel.
 *
 * Click behavior follows the tool's `defaultInteraction`:
 *   - 'inline' : clicking the row expands the detail inline (edit/write/bash/...)
 *   - 'panel'  : clicking the row opens the right-side ArtifactPanel (grep/glob/read/...)
 *   - 'none'   : no click response
 *
 * ToolCall is the single business model; StreamingToolCall extends it, so this
 * component accepts ToolCall and transparently handles live + historical data.
 */
import { ref, computed } from 'vue'
import type { ToolCall } from '../../../types/ipc'
import { getTool, type ToolViewModel } from '../../tool/registry'
// Activating built-in rules on import (idempotent).
import '../../tool/rules'
import ToolCallRow from './ToolCallRow.vue'
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

// Resolve interaction mode: meta.defaultInteraction, or 'inline' fallback.
const interaction = computed(() => meta.value?.defaultInteraction ?? 'inline')

function toggleExpanded() {
  expanded.value = !expanded.value
}

// Row click: 'inline' → toggle expand; 'panel' → emit openFile; 'none' → no action.
function handleRowActivate() {
  if (interaction.value === 'panel') {
    emit('openFile', props.tool)
  } else if (interaction.value === 'inline') {
    toggleExpanded()
  }
  // 'none' - no response
}
</script>

<template>
  <div class="tool-renderer" :data-tool-name="tool.name">
    <!-- Compact row (collapsed) -->
    <ToolCallRow
      v-if="!expanded"
      :tool="tool"
      :meta="meta"
      @activate="handleRowActivate"
      @expand="toggleExpanded"
    />

    <!-- Expanded detail -->
    <ToolCallExpanded
      v-else
      :tool="tool"
      :meta="meta"
      :vm="viewModel"
      @collapse="toggleExpanded"
    />
  </div>
</template>
