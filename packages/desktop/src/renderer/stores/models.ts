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
  apiKey?: string
  baseUrl?: string
  errorMessage?: string
}

export const useModelsStore = defineStore('models', () => {
  const providers = ref<ProviderInfo[]>([])
  const connectedProviders = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const saving = ref(false)
  const deleting = ref(false)
  const refreshing = ref(new Set<string>())
  const testing = ref(new Set<string>())

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

  async function addProvider(config: { name: string; apiKey: string; baseUrl?: string }): Promise<{ success: boolean; error?: string }> {
    saving.value = true
    error.value = null
    try {
      const result = await window.desktop.provider.add(config)
      if (result.success && result.provider) {
        providers.value.push(result.provider as ProviderInfo)
        // Auto test and fetch models after adding
        await testProvider((result.provider as ProviderInfo).id)
      }
      return { success: result.success, error: result.error }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to add provider'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      saving.value = false
    }
  }

  async function updateProvider(providerId: string, config: { apiKey?: string; baseUrl?: string }): Promise<{ success: boolean; error?: string }> {
    saving.value = true
    error.value = null
    try {
      const result = await window.desktop.provider.update(providerId, config)
      if (result.success && result.provider) {
        const index = providers.value.findIndex(p => p.id === providerId)
        if (index !== -1) {
          providers.value[index] = result.provider as ProviderInfo
        }
      }
      return { success: result.success, error: result.error }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to update provider'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      saving.value = false
    }
  }

  async function deleteProvider(providerId: string): Promise<{ success: boolean; error?: string }> {
    deleting.value = true
    error.value = null
    try {
      const result = await window.desktop.provider.delete(providerId)
      if (result.success) {
        providers.value = providers.value.filter(p => p.id !== providerId)
        connectedProviders.value = connectedProviders.value.filter(id => id !== providerId)
      }
      return { success: result.success, error: result.error }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to delete provider'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      deleting.value = false
    }
  }

  async function testProvider(providerId: string): Promise<{ success: boolean; modelCount?: number; error?: string }> {
    testing.value.add(providerId)
    try {
      const result = await window.desktop.provider.test(providerId)
      if (result.success) {
        const index = providers.value.findIndex(p => p.id === providerId)
        if (index !== -1 && result.modelCount !== undefined) {
          // Update connected status
          if (!connectedProviders.value.includes(providerId)) {
            connectedProviders.value.push(providerId)
          }
        }
      }
      return result
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to test provider'
      return { success: false, error: errorMsg }
    } finally {
      testing.value.delete(providerId)
    }
  }

  async function refreshModels(providerId: string): Promise<{ success: boolean; changed?: boolean; error?: string }> {
    refreshing.value.add(providerId)
    try {
      const result = await window.desktop.provider.refreshModels(providerId)
      if (result.success && result.models) {
        const index = providers.value.findIndex(p => p.id === providerId)
        if (index !== -1) {
          providers.value[index].models = result.models as unknown as Record<string, ProviderModel>
        }
      }
      return result
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to refresh models'
      return { success: false, error: errorMsg }
    } finally {
      refreshing.value.delete(providerId)
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
    saving,
    deleting,
    refreshing,
    testing,
    modelOptions,
    loadModels,
    addProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    refreshModels,
    clearModels
  }
})