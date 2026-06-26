<script setup lang="ts">
import { ref, watchEffect, onMounted } from 'vue'
import { createHighlighter, type Highlighter } from 'shiki'

const props = defineProps<{ code: string; lang: string }>()

const html = ref('')
let hl: Highlighter | null = null

onMounted(async () => {
  try {
    hl = await createHighlighter({
      themes: ['github-dark'],
      langs: [props.lang],
    })
    highlight()
  } catch {
    // 语言不支持时 fallback 到 plain
    html.value = `<pre class="shiki">${escapeHtml(props.code)}</pre>`
  }
})

watchEffect(() => {
  if (hl) highlight()
})

function highlight() {
  if (!hl) return
  try {
    html.value = hl.codeToHtml(props.code, { lang: props.lang, theme: 'github-dark' })
  } catch {
    html.value = `<pre class="shiki">${escapeHtml(props.code)}</pre>`
  }
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return s.replace(/[&<>"']/g, c => map[c])
}
</script>

<template>
  <div class="code-block relative bg-surface rounded border border-surface my-2">
    <!-- 语言标签 -->
    <span
      data-testid="lang-label"
      class="absolute top-2 right-2 text-xs text-accent-muted px-2 py-1 rounded bg-surface"
    >
      {{ lang }}
    </span>
    <!-- Shiki 渲染的 HTML -->
    <code class="block p-4 overflow-x-auto text-sm" v-html="html" />
  </div>
</template>

<style scoped>
.code-block :deep(.shiki) {
  background: transparent !important;
  padding: 0;
}
</style>