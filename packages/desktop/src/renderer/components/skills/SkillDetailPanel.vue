<template>
  <div v-if="skill" class="skill-detail-panel flex flex-col h-full bg-bg-elevated border-l border-border">
    <PanelHeader
      :skill-name="skill.name"
      :skill-location="skill.location"
      :mode="mode"
      @switch-mode="handleSwitchMode"
      @close="handleClose"
    />
    
    <!-- View mode content -->
    <div v-if="mode === 'view'" class="panel-content flex-1 overflow-y-auto p-4">
      <MarkdownRenderer :content="skill.content" />
    </div>
    
    <!-- Edit mode content -->
    <div v-else class="panel-content flex-1 overflow-hidden">
      <SkillEditor
        ref="editorRef"
        :content="editContent"
        @change="handleChange"
      />
    </div>
    
    <PanelActions
      :mode="mode"
      :saving="saving"
      @copy="handleCopy"
      @cancel="handleCancel"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { SkillInfo } from '../../../types/ipc'
import PanelHeader from '../skill-detail/PanelHeader.vue'
import PanelActions from '../skill-detail/PanelActions.vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import SkillEditor from './SkillEditor.vue'

const props = defineProps<{
  skill: SkillInfo | null
}>()

const emit = defineEmits<{
  'close': []
  'save': [skill: SkillInfo, content: string]
  'refresh': []
}>()

const mode = ref<'view' | 'edit'>('view')
const editContent = ref('')
const hasUnsavedChanges = ref(false)
const saving = ref(false)
const editorRef = ref<{ getValue: () => string; setValue: (v: string) => void } | null>(null)

// Initialize editContent when skill changes
watch(() => props.skill, (newSkill) => {
  if (newSkill) {
    editContent.value = newSkill.content
    hasUnsavedChanges.value = false
  }
})

function handleSwitchMode(newMode: 'view' | 'edit') {
  if (newMode === 'edit' && props.skill) {
    editContent.value = props.skill.content
    mode.value = 'edit'
  } else if (newMode === 'view') {
    if (hasUnsavedChanges.value) {
      // TODO: Show confirmation dialog
      const confirmed = confirm('You have unsaved changes. Switch to View mode anyway?')
      if (!confirmed) return
    }
    mode.value = 'view'
    hasUnsavedChanges.value = false
  }
}

async function handleCopy() {
  if (!props.skill?.content) return
  
  try {
    await navigator.clipboard.writeText(props.skill.content)
    // TODO: Show toast notification
    console.log('Content copied to clipboard')
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

function handleChange(newContent: string) {
  editContent.value = newContent
  hasUnsavedChanges.value = newContent !== props.skill?.content
}

function handleCancel() {
  if (hasUnsavedChanges.value) {
    const confirmed = confirm('Discard unsaved changes?')
    if (!confirmed) return
  }
  
  editContent.value = props.skill?.content || ''
  mode.value = 'view'
  hasUnsavedChanges.value = false
}

async function handleSave() {
  if (!props.skill?.location) {
    console.error('Skill location not available')
    return
  }
  
  saving.value = true
  
  try {
    // Emit save event to parent (SkillView will handle file write)
    emit('save', props.skill, editContent.value)
    
    // Reset state
    hasUnsavedChanges.value = false
    mode.value = 'view'
    
    // Request refresh
    emit('refresh')
  } catch (err) {
    console.error('Failed to save:', err)
  } finally {
    saving.value = false
  }
}

function handleClose() {
  if (mode.value === 'edit' && hasUnsavedChanges.value) {
    const confirmed = confirm('You have unsaved changes. Close anyway?')
    if (!confirmed) return
  }
  
  mode.value = 'view'
  hasUnsavedChanges.value = false
  emit('close')
}

// Expose for parent component
function reset() {
  mode.value = 'view'
  editContent.value = props.skill?.content || ''
  hasUnsavedChanges.value = false
}

defineExpose({ reset })
</script>

<style scoped>
.skill-detail-panel {
  flex: 1;
  min-width: 0;
}

.panel-content {
  min-height: 0;
}
</style>