<template>
  <div ref="editorContainer" class="skill-editor"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import loader from '@monaco-editor/loader'

const props = defineProps<{
  content: string
}>()

const emit = defineEmits<{
  'update:content': [value: string]
  'change': [value: string]
}>()

const editorContainer = ref<HTMLDivElement | null>(null)
let editorInstance: any = null

onMounted(async () => {
  if (!editorContainer.value) return

  // Initialize Monaco Editor
  const monaco = await loader.init()
  
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
    editorInstance.dispose()
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