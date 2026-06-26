# Desktop Model Selector Design

**Date**: 2026-06-26  
**Status**: Draft  
**Author**: AI Agent

## Problem Statement

The desktop app's bottom input area (composer) currently does not display a model selector, even though the SessionOptions component has conditional logic to show one. The root cause is that `sessionOptionsRegistry.model.options` is an empty array, and no code initializes it with the available models from the backend.

Users cannot select which model to use when creating or editing sessions, limiting their ability to control the AI behavior.

## Goals

1. Display a model selector in the composer when models are available
2. Share model data between SettingsModels and SessionOptions components (single source of truth)
3. Initialize model list when workspace loads
4. Update model selector reactively when providers change

## Non-Goals

- Model management UI (create/delete models) - already exists in SettingsModels
- Advanced model filtering or search
- Model-specific configuration UI

## Solution Overview

Create a centralized `modelsStore` using Pinia to manage model state. The store will:
- Load models from the backend via IPC
- Format model options for the sessionOptionsRegistry
- Register options to the registry reactively
- Serve both SessionOptions and SettingsModels components

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     modelsStore                          │
│  - providers: ProviderInfo[]                             │
│  - modelOptions: { value, label }[]                      │
│  - loadModels(directory)                                 │
└───────────────┬─────────────────┬─────────────────────────┘
                │                 │
        读取     │                 │  读取
                ▼                 ▼
    ┌───────────────┐   ┌──────────────────┐
    │ SessionOptions │   │  SettingsModels  │
    │  (通过 registry)│   │   (直接读取)      │
    └───────────────┘   └──────────────────┘
```

## Technical Design

### 1. modelsStore

**File**: `packages/desktop/src/renderer/stores/models.ts`

**State**:
```typescript
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

// Reactive state
const providers = ref<ProviderInfo[]>([])
const connectedProviders = ref<string[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
```

**Computed**:
```typescript
const modelOptions = computed(() => {
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

**Actions**:
```typescript
async function loadModels(directory?: string) {
  loading.value = true
  error.value = null
  try {
    const result = await window.desktop.config.models(directory)
    providers.value = result.all as ProviderInfo[]
    connectedProviders.value = result.connected
    
    // Update sessionOptionsRegistry
    registerSessionOption({
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
  } finally {
    loading.value = false
  }
}
```

**Watch for reactive updates**:
```typescript
// Auto-update registry when modelOptions changes
watch(modelOptions, (newOptions) => {
  registerSessionOption({
    key: 'model',
    label: '模型',
    type: 'select',
    value: '',
    options: newOptions,
    allowed: ['create', 'runtime'],
    default: ''
  })
})
```

### 2. SettingsModels.vue Refactor

**Changes**:
- Remove local state: `providers`, `loading`, `connectedProviders`, `modelOptions`
- Import and use `modelsStore`
- Simplify to a presentation component

**Before**:
```typescript
const providers = ref<ProviderInfo[]>([])
const loading = ref(false)
const connectedProviders = ref<string[]>([])

onMounted(async () => {
  loading.value = true
  try {
    const result = await window.desktop.config.models(directory)
    providers.value = result.all as ProviderInfo[]
    // ...
  }
})
```

**After**:
```typescript
import { useModelsStore } from '../../stores/models'

const modelsStore = useModelsStore()
const workspaceStore = useWorkspaceStore()
const directory = workspaceStore.currentWorkspace?.path

// Use computed from store
const providers = computed(() => modelsStore.providers)
const loading = computed(() => modelsStore.loading)
const connectedProviders = computed(() => modelsStore.connectedProviders)
const modelOptions = computed(() => modelsStore.modelOptions)
```

### 3. App.vue Integration

**Location**: `App.vue` `onMounted` hook

**Logic**:
```typescript
import { useModelsStore } from './stores/models'

const modelsStore = useModelsStore()

// Watch workspace changes and reload models
watch(
  () => workspaceStore.currentWorkspace,
  async (newWorkspace) => {
    if (newWorkspace) {
      await modelsStore.loadModels(newWorkspace.path)
    } else {
      // Clear models when no workspace
      modelsStore.clearModels()
    }
  },
  { immediate: true }
)
```

**Alternative**: Add model loading to `workspaceStore.selectWorkspace()` method instead of App.vue.

### 4. sessionOptionsRegistry (No Changes Needed)

The `sessionOptionsRegistry` already supports dynamic updates via `registerSessionOption`. The modelsStore will call this function whenever models are loaded or changed.

The `SessionOptions.vue` component already has reactive logic:
```vue
<select
  v-if="hasModels"
  v-model="localModel"
  ...
>
```

Where `hasModels` checks `sessionOptionsRegistry.model.options.length > 0`.

## Data Flow

1. **Initial Load**:
   - App.vue mounts → workspaceStore.loadWorkspaces()
   - Workspace selected → modelsStore.loadModels(directory)
   - loadModels() → fetch from backend → registerSessionOption()
   - SessionOptions.vue reacts to registry change → displays model selector

2. **Workspace Switch**:
   - User selects different workspace
   - watch triggers → modelsStore.loadModels(newDirectory)
   - Models update in registry
   - UI updates automatically

3. **Error Scenario**:
   - API call fails → modelsStore.error set
   - providers remains empty array
   - registry.model.options stays empty
   - SessionOptions.vue hides model selector (v-if="hasModels")
   - SettingsModels.vue shows error message

## Error Handling

- **API Failure**: Set `error` state, keep `providers` empty, registry remains empty → model selector hidden
- **Empty Providers**: Valid state, show "No providers configured" message in SettingsModels
- **Invalid Directory**: Pass undefined to API (backend handles gracefully)

## Testing Strategy

### Unit Tests
- Test `modelsStore.loadModels()` with mocked IPC
- Test `modelOptions` computed formatting
- Test registry update on load
- Test reactive watch behavior

### Integration Tests
- Test model loading on workspace selection
- Test SettingsModels displays models from store
- Test SessionOptions shows/hides based on registry

### E2E Tests
- Open app → verify model selector appears
- Change workspace → verify models update
- Configure new provider → verify model list updates

## Migration Path

1. Create `modelsStore` with all functionality
2. Update `App.vue` to load models on workspace change
3. Refactor `SettingsModels.vue` to use store
4. Test all three components work together
5. No breaking changes to existing APIs

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `packages/desktop/src/renderer/stores/models.ts` | Create | New Pinia store for model management |
| `packages/desktop/src/renderer/components/settings/SettingsModels.vue` | Modify | Refactor to use modelsStore |
| `packages/desktop/src/renderer/App.vue` | Modify | Add model loading on workspace change |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Model loading blocks UI | loadModels is async, UI shows loading state |
| Registry not reactive | Use watch on modelOptions to auto-update registry |
| Multiple components load models | Centralized store ensures single API call |
| Workspace switch race condition | Debounce or cancel previous load request |

## Open Questions

- Should we cache models per workspace? (Currently re-fetches on every switch)
- Should we show a loading indicator in the model selector? (Currently hidden during load)
- Default model selection logic? (Not addressed - future work)

## Success Criteria

1. ✅ Model selector appears in composer when models are available
2. ✅ Model list matches what's shown in SettingsModels page
3. ✅ Switching workspaces updates model list
4. ✅ No duplicate API calls for same workspace
5. ✅ Graceful handling when no providers configured