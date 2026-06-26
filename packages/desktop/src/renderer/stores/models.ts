// packages/desktop/src/renderer/stores/models.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { registerSessionOption } from '../composer/sessionOptionsRegistry'

export interface ProviderModel {
  id?: string
  name?: string
}

export interface ProviderInfo {
  id: string
  name: string
  source: string
  models: Record<string, ProviderModel>
}

export const useModelsStore = defineStore('models', () => {
  const providers = ref<ProviderInfo[]>([])
  const connectedProviders = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const modelOptions = computed<{ value: string; label: string }[]>(() => {
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

async function loadModels(directory?: string) {
  loading.value = true
  error.value = null
  try {
    const result = await window.desktop.config.models(directory)
    providers.value = result.all as ProviderInfo[]
    connectedProviders.value = result.connected || []

    // Update sessionOptionsRegistry after loading
    registerSessionOption<string>({
      key: 'model',
      label: '模型',
      type: 'select',
      value: '',
      options: modelOptions.value,
      allowed: ['create', 'runtime'],
      default: ''
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load models'
    providers.value = []
    connectedProviders.value = []
  } finally {
    loading.value = false
  }
}

function clearModels() {
  providers.value = []
  connectedProviders.value = []
  error.value = null

  // Clear registry
  registerSessionOption<string>({
    key: 'model',
    label: '模型',
    type: 'select',
    value: '',
    options: [],
    allowed: ['create', 'runtime'],
    default: ''
  })
}

return {
  providers,
  connectedProviders,
  loading,
  error,
  modelOptions,
  loadModels,
  clearModels
}
})