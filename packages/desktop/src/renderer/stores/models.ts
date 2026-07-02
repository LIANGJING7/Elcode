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

export interface AuthMethodPrompt {
  type: 'text' | 'select'
  key: string
  message: string
  placeholder?: string
  options?: { label: string; value: string; hint?: string }[]
}

export interface AuthMethod {
  type: 'oauth' | 'api'
  label: string
  prompts?: AuthMethodPrompt[]
}

export interface ConsoleState {
  consoleManagedProviders: string[]
  activeOrgName?: string
  switchableOrgCount: number
}

// 添加模型的参数类型
export interface AddModelPayload {
  modelId: string
  name?: string
  limitContext?: number
  limitOutput?: number
}

// 模型操作结果类型
export interface ModelMutationResult {
  success: boolean
  model?: ProviderModel
  error?: string
}

// Helper: deduplicate and limit recent models (same as TUI)
function updateRecentModels(
  model: { providerID: string; modelID: string },
  recent: { providerID: string; modelID: string }[]
): { providerID: string; modelID: string }[] {
  const seen = new Set<string>()
  const key = `${model.providerID}/${model.modelID}`
  return [model, ...recent]
    .filter((item) => {
      const itemKey = `${item.providerID}/${item.modelID}`
      if (seen.has(itemKey)) return false
      seen.add(itemKey)
      return true
    })
    .slice(0, 10)
    .map((item) => ({ providerID: item.providerID, modelID: item.modelID }))
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
  const selectedModel = ref<string>('')
  
  // 新增：最近使用的模型列表
  const recentModels = ref<{ providerID: string; modelID: string }[]>([])
  
  // 新增：认证方法和 Console 状态
  const authMethods = ref<Record<string, AuthMethod[]>>({})
  const consoleState = ref<ConsoleState>({
    consoleManagedProviders: [],
    switchableOrgCount: 0
  })

  const modelOptions = computed<{ value: string; label: string }[]>(() => {
    const options: { value: string; label: string }[] = []
    for (const provider of providers.value) {
      for (const [modelId, model] of Object.entries(provider.models)) {
        // value 格式: providerId/modelId (如 openai/gpt-4)，与后端期望的格式一致
        options.push({
          value: `${provider.id}/${modelId}`,
          label: `${provider.name} / ${model.name || modelId}`
        })
      }
    }
    return options.sort((a, b) => a.label.localeCompare(b.label))
  })

async function loadModels(directory?: string) {
    loading.value = true
    error.value = null
    console.log('[loadModels] 开始加载, directory:', directory)
    try {
      const result = await window.desktop.config.models(directory)
      console.log('[loadModels] API返回结果:', result)
      console.log('[loadModels] result.all:', result.all)
      console.log('[loadModels] result.connected:', result.connected)
      
      // 如果有 connected providers，只显示 connected；否则显示所有
      const connectedSet = new Set(result.connected || [])
      console.log('[loadModels] connectedSet:', connectedSet)
      
      // 从后端返回的 key 和 options 中提取 apiKey 和 baseUrl
      const mappedProviders = (result.all as any[]).map((p: any) => ({
        ...p,
        apiKey: p.key || undefined,
        baseUrl: p.options?.baseURL || p.options?.baseUrl || undefined,
      }))
      
      providers.value = connectedSet.size > 0 
        ? mappedProviders.filter(p => connectedSet.has(p.id))
        : mappedProviders
      connectedProviders.value = result.connected || []
      console.log('[loadModels] 最终 providers.value:', providers.value)
      
      // 调试：检查每个 provider 的 models
      for (const p of providers.value) {
        console.log('[loadModels] provider:', p.id, 'name:', p.name, 'models count:', Object.keys(p.models || {}).length)
        console.log('[loadModels] provider.models keys:', Object.keys(p.models || {}))
      }
      console.log('[loadModels] modelOptions value:', modelOptions.value.map(o => o.value))
      console.log('[loadModels] modelOptions label:', modelOptions.value.map(o => o.label))

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

      // 加载 recent 列表（从全局状态文件 lcode.json）
      console.log('[loadModels] 开始加载 recentModels...')
      try {
        const globalState = await window.desktop.globalState.get()
        console.log('[loadModels] globalState 返回:', globalState)
        const savedRecent = globalState.recent
        if (savedRecent && Array.isArray(savedRecent)) {
          recentModels.value = savedRecent as { providerID: string; modelID: string }[]
        }
      } catch (e) {
        console.error('[loadModels] 获取 recentModels 失败:', e)
      }

      // 恢复模型选择（优先级：config.model > recentModels[0] > 第一个provider的默认模型）
      console.log('[loadModels] 开始加载 model...')
      let savedModel: string | undefined
      try {
        const result = await window.desktop.config.get('model')
        console.log('[loadModels] model 返回:', result)
        savedModel = typeof result === 'string' ? result : undefined
      } catch (e) {
        console.error('[loadModels] 获取 model 失败:', e)
      }
      
      // 检查模型是否有效（存在于当前 providers 中）
      const isValidModel = (modelId: string): boolean => {
        return modelOptions.value.some(o => o.value === modelId)
      }
      
      if (savedModel && typeof savedModel === 'string' && isValidModel(savedModel)) {
        selectedModel.value = savedModel
      } else if (recentModels.value.length > 0) {
        // 从 recent 列表中找第一个有效的模型
        for (const recent of recentModels.value) {
          const modelId = `${recent.providerID}/${recent.modelID}`
          if (isValidModel(modelId)) {
            selectedModel.value = modelId
            break
          }
        }
      }
      
      // 如果还是没有选择，使用第一个 provider 的第一个模型
      if (!selectedModel.value && modelOptions.value.length > 0) {
        selectedModel.value = modelOptions.value[0].value
      }
      
      console.log('[loadModels] 最终选择的模型:', selectedModel.value)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load models'
      providers.value = []
      connectedProviders.value = []
    } finally {
      loading.value = false
    }

    // 单独加载认证方法和 Console 状态（失败不影响主流程）
    loadAuthMethods(directory).catch(e => console.error('loadAuthMethods failed:', e))
    loadConsoleState(directory).catch(e => console.error('loadConsoleState failed:', e))
  }

  async function loadAuthMethods(directory?: string) {
    console.log('[loadAuthMethods] 开始加载, directory:', directory)
    try {
      const result = await window.desktop.provider.authMethods(directory)
      console.log('[loadAuthMethods] 成功:', result)
      authMethods.value = result
    } catch (e) {
      console.error('[loadAuthMethods] 失败:', e)
      authMethods.value = {}
    }
  }

  async function loadConsoleState(directory?: string) {
    console.log('[loadConsoleState] 开始加载, directory:', directory)
    try {
      const result = await window.desktop.console.get(directory)
      console.log('[loadConsoleState] 成功:', result)
      consoleState.value = result
    } catch (e) {
      console.error('[loadConsoleState] 失败:', e)
      consoleState.value = { consoleManagedProviders: [], switchableOrgCount: 0 }
    }
  }

  async function setSelectedModel(modelId: string) {
    selectedModel.value = modelId
    
    // 解析 modelId (格式: provider/modelID)
    const parts = modelId.split('/')
    if (parts.length >= 2) {
      const providerID = parts[0]
      const modelID = parts.slice(1).join('/')
      
      // 更新 recent 列表
      recentModels.value = updateRecentModels(
        { providerID, modelID },
        recentModels.value
      )
      
      // 保存 recent 列表到全局状态文件 lcode.json
      try {
        const globalState = await window.desktop.globalState.get()
        await window.desktop.globalState.set({
          ...globalState,
          recent: recentModels.value
        })
      } catch (e) {
        console.error('[setSelectedModel] 保存 recentModels 失败:', e)
      }
    }
    
    // 保存当前选择的模型到项目配置 config.json
    await window.desktop.config.set('model', modelId)
  }

  async function addProvider(config: { name: string; apiKey: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; error?: string }> {
    saving.value = true
    error.value = null
    try {
      const result = await window.desktop.provider.add(config, directory)
      if (result.success && result.provider) {
        providers.value.push(result.provider as ProviderInfo)
        // Auto test and fetch models after adding
        await testProvider((result.provider as ProviderInfo).id, directory)
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

  async function updateProvider(providerId: string, config: { apiKey?: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; error?: string }> {
    saving.value = true
    error.value = null
    try {
      const result = await window.desktop.provider.update(providerId, config, directory)
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

  async function deleteProvider(providerId: string, directory?: string): Promise<{ success: boolean; error?: string }> {
    deleting.value = true
    error.value = null
    try {
      const result = await window.desktop.provider.delete(providerId, directory)
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

  async function testProvider(providerId: string, directory?: string): Promise<{ success: boolean; modelCount?: number; error?: string }> {
    testing.value.add(providerId)
    try {
      const result = await window.desktop.provider.test(providerId, directory)
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

  async function refreshModels(providerId: string, directory?: string): Promise<{ success: boolean; changed?: boolean; error?: string }> {
    refreshing.value.add(providerId)
    try {
      const result = await window.desktop.provider.refreshModels(providerId, directory)
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

  async function addModel(
    providerId: string,
    payload: AddModelPayload,
    directory?: string
  ): Promise<ModelMutationResult> {
    saving.value = true
    error.value = null
    try {
      // 验证模型ID格式
      const validPattern = /^[a-zA-Z0-9\-_\/]+$/
      if (!validPattern.test(payload.modelId)) {
        return { success: false, error: '模型ID只能包含字母、数字、-、_ 和 /' }
      }

      // 检查供应商是否存在
      const provider = providers.value.find(p => p.id === providerId)
      if (!provider) {
        return { success: false, error: `供应商 '${providerId}' 不存在` }
      }

      // 检查模型是否已存在
      if (provider.models?.[payload.modelId]) {
        return { success: false, error: `模型 '${payload.modelId}' 已存在` }
      }

      // 读取 lcode.jsonc 配置文件
      const configPath = 'lcode.jsonc'
      let configText = ''
      try {
        configText = await window.desktop.file.read(configPath, directory)
      } catch (e) {
        // 文件不存在，创建新配置
        configText = '{}'
      }

      // 解析 JSONC（去除注释和尾部逗号）
      // 简单处理：移除 // 和 /**/ 注释，以及尾部逗号
      let cleanText = configText
        .replace(/\/\/.*$/gm, '') // 移除单行注释
        .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
        .replace(/,\s*}/g, '}') // 移除对象尾部逗号
        .replace(/,\s*]/g, ']') // 移除数组尾部逗号
      
      const config = JSON.parse(cleanText)

      // 构建新模型配置
      const newModelConfig: Record<string, any> = {}
      if (payload.name) newModelConfig.name = payload.name
      if (payload.limitContext || payload.limitOutput) {
        newModelConfig.limit = {}
        if (payload.limitContext) newModelConfig.limit.context = payload.limitContext
        if (payload.limitOutput) newModelConfig.limit.output = payload.limitOutput
      }

      // 更新配置
      config.provider = config.provider || {}
      config.provider[providerId] = config.provider[providerId] || {}
      config.provider[providerId].models = config.provider[providerId].models || {}
      config.provider[providerId].models[payload.modelId] = newModelConfig

      // 写入配置文件
      const updatedText = JSON.stringify(config, null, 2)
      await window.desktop.file.write(configPath, updatedText, directory)

      // 更新本地状态
      const providerIndex = providers.value.findIndex(p => p.id === providerId)
      if (providerIndex !== -1) {
        const newModel: ProviderModel = {
          id: payload.modelId,
          name: payload.name || payload.modelId
        }
        providers.value[providerIndex].models[payload.modelId] = newModel
      }

      return { 
        success: true, 
        model: { id: payload.modelId, name: payload.name || payload.modelId }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : '添加模型失败'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      saving.value = false
    }
  }

  async function deleteModel(
    providerId: string,
    modelId: string,
    directory?: string
  ): Promise<{ success: boolean; error?: string }> {
    saving.value = true
    error.value = null
    try {
      // 检查供应商是否存在
      const provider = providers.value.find(p => p.id === providerId)
      if (!provider) {
        return { success: false, error: `供应商 '${providerId}' 不存在` }
      }

      // 检查模型是否存在
      if (!provider.models?.[modelId]) {
        return { success: false, error: `模型 '${modelId}' 不存在` }
      }

      // 读取 lcode.jsonc 配置文件
      const configPath = 'lcode.jsonc'
      let configText = ''
      try {
        configText = await window.desktop.file.read(configPath, directory)
      } catch (e) {
        return { success: false, error: '配置文件不存在' }
      }

      // 解析 JSONC
      let cleanText = configText
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
      
      const config = JSON.parse(cleanText)

      // 删除模型
      if (config.provider?.[providerId]?.models?.[modelId]) {
        delete config.provider[providerId].models[modelId]
      }

      // 写入配置文件
      const updatedText = JSON.stringify(config, null, 2)
      await window.desktop.file.write(configPath, updatedText, directory)

      // 更新本地状态
      const providerIndex = providers.value.findIndex(p => p.id === providerId)
      if (providerIndex !== -1) {
        delete providers.value[providerIndex].models[modelId]
      }

      return { success: true }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : '删除模型失败'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      saving.value = false
    }
  }

  function clearModels() {
    providers.value = []
    connectedProviders.value = []
    error.value = null
    selectedModel.value = ''
    // 保留 recentModels（跨 session 持久化）
    authMethods.value = {}
    consoleState.value = { consoleManagedProviders: [], switchableOrgCount: 0 }

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
    selectedModel,
    recentModels,
    modelOptions,
    authMethods,
    consoleState,
    loadModels,
    loadAuthMethods,
    loadConsoleState,
    setSelectedModel,
    addProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    refreshModels,
    addModel,
    deleteModel,
    clearModels
  }
})