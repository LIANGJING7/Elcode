<template>
  <div ref="editorContainer" class="skill-editor"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

// Configure Monaco environment for Electron/Vite
// Markdown doesn't need a dedicated worker - it uses the base editor worker
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    return new editorWorker()
  }
}

const props = defineProps<{
  content: string
}>()

const emit = defineEmits<{
  'update:content': [value: string]
  'change': [value: string]
}>()

const editorContainer = ref<HTMLDivElement | null>(null)
let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null

onMounted(() => {
  if (!editorContainer.value) return

  // Create editor directly using monaco-editor package
  editorInstance = monaco.editor.create(editorContainer.value, {
    value: props.content,
    language: 'markdown',
    lineNumbers: 'on',
    wordWrap: 'on',
    minimap: { enabled: false },
    fontSize: 14,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    theme: 'vs',
  })

  // Listen for content changes
  editorInstance.onDidChangeModelContent(() => {
    const value = editorInstance?.getValue() || ''
    emit('update:content', value)
    emit('change', value)
  })
})

onUnmounted(() => {
  if (editorInstance) {
    // Monaco editor dispose can throw "Canceled" error from internal Delayer
    // This is a known issue - wrap in try-catch to prevent console errors
    try {
      editorInstance.dispose()
    } catch (e) {
      // Ignore "Canceled" errors from Monaco's internal operations
      if (e instanceof Error && e.message !== 'Canceled') {
        console.error('Monaco editor dispose error:', e)
      }
    }
    editorInstance = null
  }
})

// Update editor content when prop changes
watch(() => props.content, (newContent) => {
  if (editorInstance && editorInstance.getValue() !== newContent) {
    editorInstance.setValue(newContent)
  }
})

// Expose methods for parent component
function getValue(): string {
  return editorInstance?.getValue() || ''
}

function setValue(value: string): void {
  if (editorInstance) {
    editorInstance.setValue(value)
  }
}

defineExpose({ getValue, setValue })
</script>

<style scoped>
.skill-editor {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>