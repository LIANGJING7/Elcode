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
import { useModelsStore, type ProviderInfo } from '../../stores/models'
import ConfigSelect from './ConfigSelect.vue'

const workspaceStore = useWorkspaceStore()
const modelsStore = useModelsStore()
const directory = workspaceStore.currentWorkspace?.path

// Use store state via computed
const providers = computed(() => modelsStore.providers)
const connectedProviders = computed(() => modelsStore.connectedProviders)
const loading = computed(() => modelsStore.loading)
const modelOptions = computed(() => modelsStore.modelOptions)

// Keep defaultModel local (not in modelsStore)
const defaultModel = ref('')
const defaultModelIds = ref<string[]>([])

// Load default model config on mount
onMounted(async () => {
  try {
    const configDefaultModel = await window.desktop.config.get('defaultModel', directory)
    if (configDefaultModel) defaultModel.value = String(configDefaultModel)

    const result = await window.desktop.config.models(directory)
    defaultModelIds.value = result.default || []
  } catch (err) {
    console.error('Failed to load config:', err)
  }
})
</script>

<style scoped>
.settings-section {
  /* Section styling */
}
</style>