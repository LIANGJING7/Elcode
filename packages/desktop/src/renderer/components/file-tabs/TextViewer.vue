<script setup lang="ts">
/**
 * TextViewer — displays file content with syntax highlighting.
 *
 * Receives FileRenderModel and renders using CodeLines.
 * If model.lines don't have tokens, it calls code-renderer
 * to highlight them asynchronously.
 *
 * Theme switching is handled by code-renderer service.
 */
import { ref, computed, watch, onMounted } from 'vue'
import type { FileRenderModel, RenderLine } from '../../types/render'
import { highlightFile, textToLines } from '../../services/code-renderer'
import { useThemeStore } from '../../stores/theme'
import CodeLines from './CodeLines.vue'

const props = defineProps<{
  model: FileRenderModel
  status: 'loading' | 'ready' | 'error'
}>()

const emit = defineEmits<{
  scroll: [scrollTop: number]
  selectLine: [lineId: string]
}>()

const themeStore = useThemeStore()

// Local state for rendered lines
const lines = ref<RenderLine[]>(props.model.lines)

// Loading state for async highlighting
const isHighlighting = ref(false)

// Line number width: dynamic based on max line number digits
const lineNoWidth = computed(() => {
  const maxLine = props.model.totalLines + props.model.lineStart
  const digits = String(maxLine).length
  return `${digits + 1}ch`
})

// Check if lines already have tokens
const hasTokens = computed(() => {
  return props.model.lines.some((line) => line.tokens && line.tokens.length > 0)
})

// Async highlighting on mount (if needed)
onMounted(async () => {
  // If already has tokens, no need to re-highlight
  if (hasTokens.value) {
    lines.value = props.model.lines
    return
  }

  // If no language detected, use plain text
  if (!props.model.lang) {
    lines.value = props.model.lines
    return
  }

  // Perform async highlighting
  isHighlighting.value = true
  try {
    const content = props.model.lines.map((l) => l.text).join('\n')
    const lineStart = props.model.lines[0]?.number ?? 1
    lines.value = await highlightFile(props.model.filePath, content, lineStart)
  } catch (error) {
    // Fallback to plain text on error
    console.warn('[TextViewer] Highlighting failed:', error)
    lines.value = props.model.lines
  }
  isHighlighting.value = false
})

// Re-highlight when theme changes (if language detected)
watch(
  () => themeStore.theme,
  async (newTheme) => {
    if (!props.model.lang || !hasTokens.value) return

    // Re-highlight with new theme
    isHighlighting.value = true
    try {
      const content = lines.value.map((l) => l.text).join('\n')
      const lineStart = lines.value[0]?.number ?? 1
      lines.value = await highlightFile(props.model.filePath, content, lineStart)
    } catch (error) {
      console.warn('[TextViewer] Re-highlighting failed:', error)
    }
    isHighlighting.value = false
  }
)

function handleScroll(scrollTop: number) {
  emit('scroll', scrollTop)
}

function handleSelectLine(lineId: string) {
  emit('selectLine', lineId)
}
</script>

<template>
  <div class="text-viewer h-full flex flex-col">
    <!-- Header -->
    <div class="viewer-header px-3 py-2 text-xs text-text-muted border-b border-border bg-bg-surface shrink-0">
      <slot name="toolbar">
        <span class="font-mono">
          <span class="text-text-primary">{{ model.fileName }}</span>
          <span v-if="model.directory" class="text-text-muted ml-1">{{ model.directory }}</span>
        </span>
        <span v-if="model.lang" class="ml-2 text-accent">{{ model.lang }}</span>
        <span v-if="model.totalLines" class="ml-2">· {{ model.totalLines }} 行</span>
        <span v-if="model.truncated" class="ml-2 text-warning">· 截断</span>
        <span v-if="status === 'loading'" class="ml-2 animate-pulse text-accent">加载中...</span>
        <span v-if="isHighlighting" class="ml-2 animate-pulse text-accent">高亮中...</span>
      </slot>
    </div>

    <!-- Code Lines -->
    <CodeLines
      :lines="lines"
      :line-no-width="lineNoWidth"
      :wrap="model.options.wrap"
      :show-line-numbers="model.options.showLineNumbers"
      class="flex-1 overflow-auto bg-code-bg"
      @scroll="handleScroll"
      @select-line="handleSelectLine"
    >
      <template #line-extra="{ line }">
        <slot name="line-extra" :line="line" />
      </template>
    </CodeLines>
  </div>
</template>

<style scoped>
.text-viewer {
  /* Prevent layout overflow */
  min-height: 0;
}
</style>