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

      <!-- Available providers and their models -->
      <div v-else-if="providers.length > 0" class="mt-4 space-y-3">
        <h3 class="text-sm font-medium text-text mb-2">Available Providers</h3>
        <div
          v-for="provider in providers"
          :key="provider.id"
          class="p-3 rounded-lg bg-bg-hover border border-border"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-text">{{ provider.name }}</span>
            <span v-if="connectedProviders.includes(provider.id)" class="text-2xs text-green-400">
              Connected
            </span>
          </div>
          <ul class="text-2xs text-text-muted space-y-1">
            <li v-for="(model, modelId) in provider.models" :key="modelId">
              {{ model.name || modelId }}
            </li>
          </ul>
        </div>
      </div>

      <div v-else class="text-text-muted text-sm">
        No providers configured
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWorkspaceStore } from '../../stores/workspace'
import ConfigSelect from './ConfigSelect.vue'

interface ProviderModel {
  id?: string
  name?: string
}

interface ProviderInfo {
  id: string
  name: string
  source: string
  models: Record<string, ProviderModel>
}

const workspaceStore = useWorkspaceStore()
const directory = workspaceStore.currentWorkspace?.path

const defaultModel = ref('')
const providers = ref<ProviderInfo[]>([])
const defaultModelIds = ref<Record<string, string>>({})
const connectedProviders = ref<string[]>([])
const loading = ref(false)

const modelOptions = computed(() => {
  // Flatten all models from all providers into select options
  const options: { value: string; label: string }[] = []
  for (const provider of providers.value) {
    for (const [modelId, model] of Object.entries(provider.models)) {
      options.push({
        value: modelId,
        label: `${provider.name} / ${model.name || modelId}`
      })
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label))
})

onMounted(async () => {
  loading.value = true
  
  try {
    // Load current default model
    const configDefaultModel = await window.desktop.config.get('defaultModel', directory)
    if (configDefaultModel) defaultModel.value = String(configDefaultModel)
    
    // Load available providers and models
    const result = await window.desktop.config.models(directory)
    providers.value = result.all as ProviderInfo[]
    defaultModelIds.value = result.default
    connectedProviders.value = result.connected
  } catch (err) {
    console.error('Failed to load models:', err)
    providers.value = []
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