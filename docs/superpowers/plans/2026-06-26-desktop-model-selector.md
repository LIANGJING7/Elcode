# Desktop Model Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add model selector to desktop composer by creating centralized modelsStore and integrating with sessionOptionsRegistry.

**Architecture:** Create Pinia store for model state management, refactor SettingsModels to use store, add model loading on workspace change in App.vue.

**Tech Stack:** Vue 3, Pinia, TypeScript, IPC (window.desktop.config.models)

---

## File Structure

**Files to create:**
- `packages/desktop/src/renderer/stores/models.ts` - Centralized model state management
- `packages/desktop/src/renderer/__tests__/stores/models.test.ts` - Unit tests for modelsStore

**Files to modify:**
- `packages/desktop/src/renderer/components/settings/SettingsModels.vue` - Refactor to use modelsStore
- `packages/desktop/src/renderer/App.vue` - Add model loading on workspace change

**Files unchanged:**
- `packages/desktop/src/renderer/composer/sessionOptionsRegistry.ts` - Already supports dynamic registration
- `packages/desktop/src/renderer/components/composer/SessionOptions.vue` - Already has reactive logic

---

## Task 1: Create modelsStore

**Files:**
- Create: `packages/desktop/src/renderer/stores/models.ts`
- Test: `packages/desktop/src/renderer/__tests__/stores/models.test.ts`

### Step 1: Write type definitions and basic store structure

```typescript
// packages/desktop/src/renderer/stores/models.ts
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { registerSessionOption, type SessionOption } from '../composer/sessionOptionsRegistry'

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

  // Placeholder for actions
  async function loadModels(directory?: string) {}
  function clearModels() {}

  return {
    providers,
    connectedProviders,
    loading,
    error,
    loadModels,
    clearModels
  }
})
```

- [ ] **Step 1: Create models.ts with basic structure**

Run: `cat > packages/desktop/src/renderer/stores/models.ts << 'EOF'` (paste code above)

---

### Step 2: Implement modelOptions computed property

```typescript
// packages/desktop/src/renderer/stores/models.ts (add inside store definition)

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
```

- [ ] **Step 2: Add modelOptions computed to models.ts**

Edit: `packages/desktop/src/renderer/stores/models.ts`
Add the computed property after the refs and include it in the return statement.

---

### Step 3: Implement loadModels action

```typescript
// packages/desktop/src/renderer/stores/models.ts (replace placeholder loadModels)

async function loadModels(directory?: string) {
  loading.value = true
  error.value = null
  try {
    const result = await window.desktop.config.models(directory)
    providers.value = result.all as ProviderInfo[]
    connectedProviders.value = result.connected || []
    
    // Update sessionOptionsRegistry
    if (modelOptions.value.length > 0) {
      registerSessionOption<string>({
        key: 'model',
        label: '模型',
        type: 'select',
        value: '',
        options: modelOptions.value,
        allowed: ['create', 'runtime'],
        default: ''
      })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load models'
    providers.value = []
    connectedProviders.value = []
  } finally {
    loading.value = false
  }
}
```

- [ ] **Step 3: Implement loadModels action in models.ts**

Edit: `packages/desktop/src/renderer/stores/models.ts`
Replace the placeholder `loadModels` function with the implementation above.

---

### Step 4: Implement clearModels action

```typescript
// packages/desktop/src/renderer/stores/models.ts (replace placeholder clearModels)

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
```

- [ ] **Step 4: Implement clearModels action in models.ts**

Edit: `packages/desktop/src/renderer/stores/models.ts`
Replace the placeholder `clearModels` function with the implementation above.

---

### Step 5: Add watch for reactive registry updates

```typescript
// packages/desktop/src/renderer/stores/models.ts (add after loadModels/clearModels)

// Auto-update registry when modelOptions changes
watch(modelOptions, (newOptions) => {
  if (!loading.value) { // Only update after initial load completes
    registerSessionOption<string>({
      key: 'model',
      label: '模型',
      type: 'select',
      value: '',
      options: newOptions,
      allowed: ['create', 'runtime'],
      default: ''
    })
  }
})
```

- [ ] **Step 5: Add watch for reactive registry updates**

Edit: `packages/desktop/src/renderer/stores/models.ts`
Add the watch statement after the action definitions.

---

### Step 6: Update return statement to include modelOptions

```typescript
// packages/desktop/src/renderer/stores/models.ts (update return)

return {
  providers,
  connectedProviders,
  loading,
  error,
  modelOptions,
  loadModels,
  clearModels
}
```

- [ ] **Step 6: Add modelOptions to return statement**

Edit: `packages/desktop/src/renderer/stores/models.ts`
Ensure `modelOptions` is included in the return object.

---

### Step 7: Write unit tests for modelsStore

```typescript
// packages/desktop/src/renderer/__tests__/stores/models.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModelsStore } from '../../stores/models'
import { sessionOptionsRegistry } from '../../composer/sessionOptionsRegistry'

// Mock window.desktop
vi.stubGlobal('window', {
  desktop: {
    config: {
      models: vi.fn()
    }
  }
})

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
    
    vi.mocked(window.desktop.config.models).mockResolvedValue(mockResult)
    
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
    
    vi.mocked(window.desktop.config.models).mockResolvedValue(mockResult)
    
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
    
    vi.mocked(window.desktop.config.models).mockResolvedValue(mockResult)
    
    await store.loadModels()
    
    const modelOption = sessionOptionsRegistry.model as any
    expect(modelOption.options).toHaveLength(1)
    expect(modelOption.options[0].value).toBe('model-1')
    expect(modelOption.options[0].label).toBe('Test Provider / Model 1')
  })

  it('loadModels handles errors gracefully', async () => {
    const store = useModelsStore()
    vi.mocked(window.desktop.config.models).mockRejectedValue(new Error('API failed'))
    
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
```

- [ ] **Step 7: Create test file for modelsStore**

Run: `cat > packages/desktop/src/renderer/__tests__/stores/models.test.ts << 'EOF'` (paste code above)

---

### Step 8: Run tests and verify they pass

Run: `bun test packages/desktop/src/renderer/__tests__/stores/models.test.ts`
Expected: All tests pass

- [ ] **Step 8: Run tests to verify modelsStore works**

Run: `cd packages/desktop && bun test src/renderer/__tests__/stores/models.test.ts`
Expected: 6 passing tests

---

### Step 9: Commit modelsStore creation

```bash
git add packages/desktop/src/renderer/stores/models.ts
git add packages/desktop/src/renderer/__tests__/stores/models.test.ts
git commit -m "feat(desktop): add modelsStore for centralized model management"
```

- [ ] **Step 9: Commit modelsStore**

Run: `git add packages/desktop/src/renderer/stores/models.ts packages/desktop/src/renderer/__tests__/stores/models.test.ts && git commit -m "feat(desktop): add modelsStore for centralized model management"`

---

## Task 2: Refactor SettingsModels.vue

**Files:**
- Modify: `packages/desktop/src/renderer/components/settings/SettingsModels.vue`

### Step 1: Import modelsStore

```typescript
// packages/desktop/src/renderer/components/settings/SettingsModels.vue (add import)

import { useModelsStore } from '../../stores/models'
```

- [ ] **Step 1: Add modelsStore import to SettingsModels.vue**

Edit: `packages/desktop/src/renderer/components/settings/SettingsModels.vue:52`
Add import after existing imports.

---

### Step 2: Remove local state management

```typescript
// packages/desktop/src/renderer/components/settings/SettingsModels.vue (remove these lines)

// REMOVE:
const defaultModel = ref('')
const providers = ref<ProviderInfo[]>([])
const defaultModelIds = ref<Record<string, string>>({})
const connectedProviders = ref<string[]>([])
const loading = ref(false)

// REMOVE:
const modelOptions = computed(() => { ... })

// REMOVE:
onMounted(async () => {
  loading.value = true
  try {
    const configDefaultModel = await window.desktop.config.get('defaultModel', directory)
    if (configDefaultModel) defaultModel.value = String(configDefaultModel)
    
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
```

- [ ] **Step 2: Remove local state from SettingsModels.vue**

Edit: `packages/desktop/src/renderer/components/settings/SettingsModels.vue:70-109`
Delete the local state declarations and onMounted logic.

---

### Step 3: Use modelsStore for state

```typescript
// packages/desktop/src/renderer/components/settings/SettingsModels.vue (replace removed state)

const modelsStore = useModelsStore()
const workspaceStore = useWorkspaceStore()
const directory = workspaceStore.currentWorkspace?.path

// Use store state via computed
const providers = computed(() => modelsStore.providers)
const connectedProviders = computed(() => modelsStore.connectedProviders)
const loading = computed(() => modelsStore.loading)
const modelOptions = computed(() => modelsStore.modelOptions)

// Keep defaultModel local (not in modelsStore)
const defaultModel = ref('')
const defaultModelIds = ref<Record<string, string>>({})

// Load default model config on mount
onMounted(async () => {
  try {
    const configDefaultModel = await window.desktop.config.get('defaultModel', directory)
    if (configDefaultModel) defaultModel.value = String(configDefaultModel)
    
    const result = await window.desktop.config.models(directory)
    defaultModelIds.value = result.default || {}
  } catch (err) {
    console.error('Failed to load config:', err)
  }
})
```

- [ ] **Step 3: Add modelsStore usage to SettingsModels.vue**

Edit: `packages/desktop/src/renderer/components/settings/SettingsModels.vue:67-78`
Replace the removed state management with modelsStore integration.

---

### Step 4: Remove duplicate interface definitions

```typescript
// packages/desktop/src/renderer/components/settings/SettingsModels.vue (remove interfaces)

// REMOVE these interfaces (they're now in modelsStore):
interface ProviderModel { ... }
interface ProviderInfo { ... }
```

- [ ] **Step 4: Remove duplicate interface definitions**

Edit: `packages/desktop/src/renderer/components/settings/SettingsModels.vue:55-65`
Delete the ProviderModel and ProviderInfo interfaces.

---

### Step 5: Import interfaces from modelsStore

```typescript
// packages/desktop/src/renderer/components/settings/SettingsModels.vue (update import)

import { useModelsStore, type ProviderInfo } from '../../stores/models'
```

- [ ] **Step 5: Import ProviderInfo from modelsStore**

Edit: `packages/desktop/src/renderer/components/settings/SettingsModels.vue:53`
Update the import to include ProviderInfo type.

---

### Step 6: Verify SettingsModels still works

Run: `bun run dev` from `packages/desktop`
Expected: SettingsModels page loads without errors, shows provider list

- [ ] **Step 6: Test SettingsModels refactor**

Run: `cd packages/desktop && bun run dev`
Open Settings → Models in the app
Expected: No TypeScript errors, providers display correctly

---

### Step 7: Commit SettingsModels refactor

```bash
git add packages/desktop/src/renderer/components/settings/SettingsModels.vue
git commit -m "refactor(desktop): use modelsStore in SettingsModels"
```

- [ ] **Step 7: Commit SettingsModels changes**

Run: `git add packages/desktop/src/renderer/components/settings/SettingsModels.vue && git commit -m "refactor(desktop): use modelsStore in SettingsModels"`

---

## Task 3: Add model loading to App.vue

**Files:**
- Modify: `packages/desktop/src/renderer/App.vue`

### Step 1: Import modelsStore

```typescript
// packages/desktop/src/renderer/App.vue (add import after line 41)

import { useModelsStore } from './stores/models'
```

- [ ] **Step 1: Add modelsStore import to App.vue**

Edit: `packages/desktop/src/renderer/App.vue:42`
Add import after useUiStore import.

---

### Step 2: Instantiate modelsStore

```typescript
// packages/desktop/src/renderer/App.vue (add after line 48)

const modelsStore = useModelsStore()
```

- [ ] **Step 2: Add modelsStore instantiation**

Edit: `packages/desktop/src/renderer/App.vue:49`
Add store instantiation after existing store references.

---

### Step 3: Add watch for workspace changes

```typescript
// packages/desktop/src/renderer/App.vue (add after line 61)

// Watch workspace changes to load models
watch(
  () => workspaceStore.currentWorkspace,
  async (newWorkspace) => {
    if (newWorkspace) {
      await modelsStore.loadModels(newWorkspace.path)
    } else {
      modelsStore.clearModels()
    }
  },
  { immediate: true }
)
```

- [ ] **Step 3: Add watch for workspace changes**

Edit: `packages/desktop/src/renderer/App.vue:62`
Add the watch statement to load models when workspace changes.

---

### Step 4: Verify model selector appears in composer

Run: `bun run dev` from `packages/desktop`
Expected: 
1. App loads workspace
2. Models are loaded (check console for no errors)
3. Model selector appears in SessionOptions in composer

- [ ] **Step 4: Test model loading integration**

Run: `cd packages/desktop && bun run dev`
Open the app, create or select a workspace
Expected: Model selector visible in bottom input area

---

### Step 5: Test workspace switching

Run: Keep dev server running
Action: Add another workspace folder
Expected: Model list updates (may change if different providers)

- [ ] **Step 5: Verify workspace switching updates models**

In running app: Add another workspace
Expected: Models reload for new workspace

---

### Step 6: Commit App.vue integration

```bash
git add packages/desktop/src/renderer/App.vue
git commit -m "feat(desktop): load models on workspace change in App.vue"
```

- [ ] **Step 6: Commit App.vue changes**

Run: `git add packages/desktop/src/renderer/App.vue && git commit -m "feat(desktop): load models on workspace change in App.vue"`

---

## Task 4: Integration verification

### Step 1: Run full test suite

Run: `cd packages/desktop && bun test`
Expected: All tests pass (including new modelsStore tests)

- [ ] **Step 1: Run full test suite**

Run: `cd packages/desktop && bun test`
Expected: All tests pass

---

### Step 2: Verify no TypeScript errors

Run: `cd packages/desktop && bun run typecheck` (or check build)
Expected: No type errors

- [ ] **Step 2: Check TypeScript compilation**

Run: `cd packages/desktop && bun run build`
Expected: Build succeeds without type errors

---

### Step 3: Manual end-to-end test

Run: `cd packages/desktop && bun run dev`
Test sequence:
1. Open app → verify model selector appears
2. Create new session → model selector available
3. Change model in selector → persists in session options
4. Open Settings → Models page → same providers shown
5. Switch workspace → models update

Expected: All scenarios work correctly

- [ ] **Step 3: Manual E2E verification**

Run dev server and test:
1. Model selector visible in composer ✓
2. Model selection works in new session ✓
3. SettingsModels shows same models ✓
4. Workspace switch updates models ✓

---

### Step 4: Final commit with integration tag

```bash
git tag desktop-model-selector-v1
git push origin feature/desktop-ui-redesign --tags
```

- [ ] **Step 4: Create integration tag**

Run: `git tag desktop-model-selector-v1 && git push origin feature/desktop-ui-redesign --tags`
Expected: Tag created and pushed

---

## Self-Review Checklist

After writing this plan, I verified:

1. **Spec coverage**: ✓ All requirements from spec mapped to tasks
   - modelsStore creation → Task 1
   - SettingsModels refactor → Task 2
   - App.vue integration → Task 3
   - Integration testing → Task 4

2. **Placeholder scan**: ✓ No TBD, TODO, or vague steps
   - All code blocks contain complete implementations
   - All test code is complete
   - All commands are specific

3. **Type consistency**: ✓ Types match across tasks
   - ProviderInfo interface defined in Task 1, imported in Task 2
   - modelOptions computed type consistent across all usages
   - registerSessionOption signature matches existing registry

---

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-06-26-desktop-model-selector.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach would you like?**