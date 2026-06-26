<template>
  <div class="settings-section">
    <h2 class="text-lg font-medium text-text mb-4">Models</h2>

    <div class="space-y-4">
      <!-- Default model -->
      <ConfigSelect
        label="Default Model"
        :model-value="defaultModel"
        :options="modelOptions"
        config-key="defaultModel"
        :directory="directory"
        @update:model-value="defaultModel = $event"
      />

      <!-- Model list loading state -->
      <div v-if="loading" class="text-text-muted text-sm">
        Loading available models...
      </div>

      <!-- Available models info -->
      <div v-else-if="availableModels.length > 0" class="mt-4">
        <h3 class="text-sm font-medium text-text mb-2">Available Models</h3>
        <ul class="text-2xs text-text-muted space-y-1">
          <li v-for="model in availableModels" :key="model.id">
            {{ model.name || model.id }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWorkspaceStore } from '../../stores/workspace'
import ConfigSelect from './ConfigSelect.vue'

interface ModelInfo {
  id: string
  name?: string
  provider?: string
}

const workspaceStore = useWorkspaceStore()
const directory = workspaceStore.currentWorkspace?.path

const defaultModel = ref('')
const availableModels = ref<ModelInfo[]>([])
const loading = ref(false)

const modelOptions = computed(() => {
  return availableModels.value.map(m => ({
    value: m.id,
    label: m.name || m.id
  }))
})

onMounted(async () => {
  loading.value = true
  
  try {
    // Load current default model
    const configDefaultModel = await window.desktop.config.get('defaultModel', directory)
    if (configDefaultModel) defaultModel.value = String(configDefaultModel)
    
    // Load available models
    const models = await window.desktop.config.models(directory)
    availableModels.value = (models || []) as ModelInfo[]
  } catch {
    availableModels.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.settings-section {
  /* Section styling */
}
</style>