<script setup lang="ts">
/**
 * EditBlockTool — compact card display for edit/write operations.
 */
import { computed, ref } from 'vue'

const props = defineProps<{
  title: string
  body: string
  filePath?: string
  diff?: string
  status: 'pending' | 'running' | 'completed' | 'error'
  error?: string
}>()

const emit = defineEmits<{
  click: []
  openOriginalFile: [{ filePath: string; diff: string }]
  openDiffFile: [string]
}>()

const isExpanded = ref(true)

const fileName = computed(() => {
  if (!props.filePath) return ''
  const parts = props.filePath.split(/[\\/]/)
  return parts[parts.length - 1] || props.filePath
})

const diffStats = computed(() => {
  if (!props.diff) return { additions: 0, deletions: 0 }
  const lines = props.diff.split('\n')
  return {
    additions: lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length,
    deletions: lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length,
  }
})

// Parse diff lines for display
const displayLines = computed(() => {
  if (!props.diff) return []
  return props.diff.split('\n').map(line => {
    if (line.startsWith('@@')) return { text: line, type: 'hunk', skip: true }
    if (line.startsWith('+++') || line.startsWith('---')) return { text: line, type: 'meta', skip: true }
    if (line.startsWith('+')) return { text: line.slice(1), type: 'add', skip: false }
    if (line.startsWith('-')) return { text: line.slice(1), type: 'remove', skip: false }
    return { text: line, type: 'context', skip: false }
  }).filter(l => !l.skip)
})

const bodyLines = computed(() => {
  if (!props.body) return []
  return props.body.split('\n')
})

const hasDiff = computed(() => props.diff && props.diff.length > 0)

function handleOpenOriginal() {
  if (props.filePath && props.diff) {
    emit('openOriginalFile', { filePath: props.filePath, diff: props.diff })
  }
}

function handleOpenDiffFile() {
  if (props.filePath) {
    emit('openDiffFile', props.filePath)
  }
}
</script>

<template>
  <div class="edit-block-tool border border-border/50 rounded-lg overflow-hidden bg-bg-surface">
    <!-- Header -->
    <div 
      class="header flex items-center justify-between px-3 py-2 border-b border-border/50 bg-bg cursor-pointer hover:bg-bg-hover/50 transition-colors"
      @click="isExpanded = !isExpanded"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-sm font-medium truncate" :title="filePath">{{ title }}</span>
        <span v-if="hasDiff && (diffStats.additions > 0 || diffStats.deletions > 0)" class="text-xs flex items-center gap-1.5 font-mono">
          <span class="text-success">+{{ diffStats.additions }}</span>
          <span class="text-error">-{{ diffStats.deletions }}</span>
        </span>
      </div>
      
      <button
        class="w-6 h-6 flex items-center justify-center hover:bg-bg-hover rounded transition-colors"
        @click.stop="isExpanded = !isExpanded"
        :title="isExpanded ? '收起' : '展开'"
      >
        <svg 
          class="w-4 h-4 text-text-muted transition-transform" 
          :class="{ 'rotate-180': isExpanded }"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
    
    <!-- Collapsible code section -->
    <div v-if="isExpanded" class="code-section border-t border-border/50">
      <!-- Diff view -->
      <div v-if="displayLines.length > 0" class="diff-view text-xs font-mono overflow-auto max-h-[600px]">
        <div v-for="(line, i) in displayLines" :key="i"
          class="diff-line flex items-stretch"
          :class="{ 'bg-success/10': line.type === 'add', 'bg-error/10': line.type === 'remove' }"
        >
          <span v-if="line.type === 'add'" class="change-bar w-1 bg-success flex-shrink-0" />
          <span v-else-if="line.type === 'remove'" class="change-bar w-1 bg-error flex-shrink-0" />
          <span v-else class="change-bar w-1 bg-transparent flex-shrink-0" />
          <pre class="line-content flex-1 px-3 py-1">{{ line.text }}</pre>
        </div>
      </div>
      
      <!-- Write body -->
      <pre v-else-if="body" class="text-xs font-mono text-text overflow-auto bg-bg-code p-3 max-h-[600px]">{{ body }}</pre>
      
      <!-- Empty state -->
      <div v-if="!body && displayLines.length === 0" class="text-xs text-text-muted p-3">（无输出）</div>
    </div>
    
    <!-- Error -->
    <div v-if="error" class="error text-xs text-error bg-error/10 p-2">{{ error }}</div>
  </div>
</template>

<style scoped>
.edit-block-tool {
  scrollbar-width: thin;
}

.diff-view::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.diff-view::-webkit-scrollbar-track {
  background: transparent;
}

.diff-view::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.change-bar {
  min-height: 20px;
}

.line-content {
  line-height: 1.5;
  white-space: pre;
}
</style>