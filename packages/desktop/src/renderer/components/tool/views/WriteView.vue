<script setup lang="ts">
/**
 * WriteView — renders a WriteViewModel (written file content).
 *
 * Layout: file title (# Wrote <path>) + syntax-highlighted code block.
 * Reuses the existing CodeBlock (Shiki) component for highlighting.
 */
import { computed } from 'vue'
import type { WriteViewModel } from '../../../tool/rules/write'
import CodeBlock from '../../chat/CodeBlock.vue'

const props = defineProps<{ vm: WriteViewModel }>()

// Infer Shiki lang from file extension
function langFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    vue: 'vue', json: 'json', md: 'markdown', py: 'python',
    go: 'go', rs: 'rust', java: 'java', c: 'c', cpp: 'cpp',
    sh: 'bash', yml: 'yaml', yaml: 'yaml', html: 'html', css: 'css',
  }
  return map[ext] ?? 'text'
}

const lang = computed(() => langFromPath(props.vm.filePath))
</script>

<template>
  <div class="write-view text-xs">
    <!-- File title -->
    <div class="text-text-muted mb-1 font-mono">
      # {{ vm.existed ? 'Wrote' : 'Created' }} {{ vm.filePath }}
    </div>

    <!-- Code content with syntax highlighting -->
    <CodeBlock v-if="vm.content" :code="vm.content" :lang="lang" />
  </div>
</template>
