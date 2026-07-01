<script setup lang="ts">
import { ref, watchEffect, onMounted, computed, shallowRef } from 'vue'
import { createHighlighter, type Highlighter } from 'shiki'
import { useThemeStore } from '../../stores/theme'

const props = withDefaults(defineProps<{
  code: string
  lang: string
  messageId?: string
  codeIndex?: number
  previewLines?: number
  autoFoldThreshold?: number
}>(), {
  messageId: '',
  codeIndex: 0,
  previewLines: 8,
  autoFoldThreshold: 15,
})

const themeStore = useThemeStore()
const html = ref('')
let hl: Highlighter | null = null

const codeTheme = computed(() => themeStore.theme === 'light' ? 'github-light' : 'github-dark')

// 一次性 split，避免重复
const lines = shallowRef<string[]>([])
onMounted(() => {
  lines.value = props.code.split('\n')
})

// 自动决定初始折叠状态: 超过阈值才折叠
const folded = ref(false)
watchEffect(() => {
  if (lines.value.length > props.autoFoldThreshold) {
    folded.value = true
  }
})

const hasMore = computed(() => lines.value.length > props.autoFoldThreshold)

// 超过 300 行用 slice，否则用 CSS 隐藏
const useVirtual = computed(() => lines.value.length > 300)

const visibleCode = computed(() => {
  if (folded.value && useVirtual.value) {
    return lines.value.slice(0, props.previewLines).join('\n')
  }
  return props.code
})

const blockKey = computed(() => `${props.messageId}-code-${props.codeIndex}`)

onMounted(async () => {
  try {
    hl = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [props.lang],
    })
    highlight()
  } catch {
    html.value = `<pre class="shiki">${escapeHtml(props.code)}</pre>`
  }
})

watchEffect(() => {
  if (hl) highlight()
})

function highlight() {
  if (!hl) return
  try {
    html.value = hl.codeToHtml(visibleCode.value, { lang: props.lang, theme: codeTheme.value })
  } catch {
    html.value = `<pre class="shiki">${escapeHtml(visibleCode.value)}</pre>`
  }
}

function toggleFold() {
  folded.value = !folded.value
}

function copyCode() {
  navigator.clipboard?.writeText(props.code)
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }
  return s.replace(/[&<>"']/g, (c) => map[c])
}
</script>

<template>
  <div class="code-block relative bg-bg-surface rounded border border-border my-2" :data-block-key="blockKey">
    <!-- Header: Language + Fold + Copy -->
    <div class="code-header flex items-center justify-between px-3 py-1.5 border-b border-border">
      <span data-testid="lang-label" class="text-xs text-text-muted">{{ lang }}</span>
      <div class="actions flex gap-2">
        <button
          v-if="hasMore"
          data-testid="fold-btn"
          class="text-xs text-text-muted hover:text-text"
          @click="toggleFold"
        >
          {{ folded ? '展开' : '折叠' }}
        </button>
        <button class="text-xs text-text-muted hover:text-text" @click="copyCode">复制</button>
      </div>
    </div>

    <!-- Code content: CSS 隐藏 (<300行) 或 slice (>300行) -->
    <div
      class="code-content overflow-x-auto"
      :style="!useVirtual && folded ? { maxHeight: `${previewLines * 1.5}em`, overflow: 'hidden' } : {}"
    >
      <code class="block p-4 text-sm" v-html="html" />
    </div>

    <!-- 折叠指示 -->
    <div v-if="folded && hasMore && !useVirtual" class="fold-indicator text-center text-xs text-text-muted py-1 border-t border-border">
      ... {{ lines.length - previewLines }} 行已折叠
    </div>
  </div>
</template>

<style scoped>
.code-block :deep(.shiki) {
  background: transparent !important;
  padding: 0;
}
</style>
