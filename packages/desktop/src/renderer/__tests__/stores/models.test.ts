// packages/desktop/src/renderer/__tests__/stores/models.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModelsStore } from '../../stores/models'
import { sessionOptionsRegistry } from '../../composer/sessionOptionsRegistry'

// Mock window.desktop - use globalThis for cross-platform compatibility
const mockConfig = {
  models: vi.fn()
}

// Set mock on globalThis (works in both Node and jsdom)
;(globalThis as unknown as { window: { desktop: unknown } }).window = {
  desktop: { config: mockConfig }
}

describe('modelsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with empty providers', () => {
    const store = useModelsStore()
    expect(store.providers).toEqual([])
    expect(store.modelOptions).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('loadModels fetches models and updates providers', async () => {
    const store = useModelsStore()
    const mockResult = {
      all: [
        {
          id: 'openai',
          name: 'OpenAI',
          source: 'env',
          models: {
            'gpt-4': { id: 'gpt-4', name: 'GPT-4' },
            'gpt-3.5-turbo': { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
          }
        }
      ],
      connected: ['openai'],
      default: {}
    }

    mockConfig.models.mockResolvedValue(mockResult)

    await store.loadModels('/test/workspace')

    expect(store.providers).toHaveLength(1)
    expect(store.providers[0].id).toBe('openai')
    expect(store.connectedProviders).toEqual(['openai'])
    expect(store.loading).toBe(false)
  })

  it('modelOptions formats provider models correctly', async () => {
    const store = useModelsStore()
    const mockResult = {
      all: [
        {
          id: 'openai',
          name: 'OpenAI',
          source: 'env',
          models: {
            'gpt-4': { name: 'GPT-4' },
            'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo' }
          }
        },
        {
          id: 'anthropic',
          name: 'Anthropic',
          source: 'env',
          models: {
            'claude-3': { name: 'Claude 3' }
          }
        }
      ],
      connected: [],
      default: {}
    }

    mockConfig.models.mockResolvedValue(mockResult)

    await store.loadModels()

    const options = store.modelOptions
    expect(options).toHaveLength(3)
    expect(options[0].label).toBe('Anthropic / Claude 3') // sorted
    expect(options[0].value).toBe('claude-3')
    expect(options[1].label).toBe('OpenAI / GPT-3.5 Turbo')
    expect(options[2].label).toBe('OpenAI / GPT-4')
  })

  it('loadModels updates sessionOptionsRegistry', async () => {
    const store = useModelsStore()
    const mockResult = {
      all: [
        {
          id: 'test',
          name: 'Test Provider',
          source: 'env',
          models: { 'model-1': { name: 'Model 1' } }
        }
      ],
      connected: [],
      default: {}
    }

    mockConfig.models.mockResolvedValue(mockResult)

    await store.loadModels()

    const modelOption = sessionOptionsRegistry.model as any
    expect(modelOption.options).toHaveLength(1)
    expect(modelOption.options[0].value).toBe('model-1')
    expect(modelOption.options[0].label).toBe('Test Provider / Model 1')
  })

  it('loadModels handles errors gracefully', async () => {
    const store = useModelsStore()
    mockConfig.models.mockRejectedValue(new Error('API failed'))

    await store.loadModels()

    expect(store.error).toBe('API failed')
    expect(store.providers).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('clearModels resets state and registry', () => {
    const store = useModelsStore()
    store.providers = [{ id: 'test', name: 'Test', source: 'env', models: {} }]
    store.connectedProviders = ['test']

    store.clearModels()

    expect(store.providers).toEqual([])
    expect(store.connectedProviders).toEqual([])
    expect(store.error).toBeNull()

    const modelOption = sessionOptionsRegistry.model as any
    expect(modelOption.options).toEqual([])
  })
})