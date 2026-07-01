# Models Settings Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Models settings page to support full CRUD operations for AI providers with improved UX.

**Architecture:** Extend backend-client and IPC handlers for provider management APIs, add new store methods for CRUD operations, and create new Vue components for UI with grouped model selector, provider cards, and modal forms.

**Tech Stack:** Vue 3, Pinia, TypeScript, Electron IPC, Tailwind CSS

---

## File Structure

**Backend & IPC:**
- Modify: `packages/desktop/src/main/backend-client.ts` - Add provider CRUD methods
- Modify: `packages/desktop/src/main/ipc/channels.ts` - Add new IPC channel constants
- Modify: `packages/desktop/src/main/ipc/handlers-config.ts` - Add new IPC handlers

**State Management:**
- Modify: `packages/desktop/src/renderer/stores/models.ts` - Add CRUD methods and new state

**UI Components:**
- Create: `packages/desktop/src/renderer/components/settings/GroupedModelSelect.vue` - Grouped dropdown for model selection
- Create: `packages/desktop/src/renderer/components/settings/ProviderCard.vue` - Provider card component
- Create: `packages/desktop/src/renderer/components/settings/AddProviderModal.vue` - Add provider form modal
- Create: `packages/desktop/src/renderer/components/settings/EditProviderModal.vue` - Edit provider form modal
- Modify: `packages/desktop/src/renderer/components/settings/SettingsModels.vue` - Main container, integrate new components

**Types:**
- Modify: `packages/desktop/src/renderer/stores/models.ts` - Add new interfaces for provider config

---

## Task 1: Add Provider CRUD Methods to backend-client.ts

**Files:**
- Modify: `packages/desktop/src/main/backend-client.ts:280-310`

- [ ] **Step 1: Add provider CRUD methods to backend object**

Add the following methods to the `backend.provider` namespace in `backend-client.ts` after the existing `authCallback` method:

```typescript
  provider: {
    // ... existing methods ...

    add: async (config: { name: string; apiKey: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; provider?: unknown; error?: string }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("POST", `/provider?${params}`, config) as Promise<{ success: boolean; provider?: unknown; error?: string }>
    },

    update: async (providerId: string, config: { apiKey?: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; provider?: unknown; error?: string }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("PATCH", `/provider/${providerId}?${params}`, config) as Promise<{ success: boolean; provider?: unknown; error?: string }>
    },

    delete: async (providerId: string, directory?: string): Promise<{ success: boolean; error?: string }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("DELETE", `/provider/${providerId}?${params}`) as Promise<{ success: boolean; error?: string }>
    },

    test: async (providerIdOrConfig: string | { name: string; apiKey: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; modelCount?: number; error?: string }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      if (typeof providerIdOrConfig === 'string') {
        return request("POST", `/provider/${providerIdOrConfig}/test?${params}`) as Promise<{ success: boolean; modelCount?: number; error?: string }>
      } else {
        return request("POST", `/provider/test?${params}`, providerIdOrConfig) as Promise<{ success: boolean; modelCount?: number; error?: string }>
      }
    },

    refreshModels: async (providerId: string, directory?: string): Promise<{ success: boolean; models?: unknown[]; changed?: boolean; error?: string }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("POST", `/provider/${providerId}/refresh-models?${params}`) as Promise<{ success: boolean; models?: unknown[]; changed?: boolean; error?: string }>
    },
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd packages/desktop && bun run typecheck`
Expected: No TypeScript errors

- [ ] **Step 3: Commit backend-client changes**

```bash
git add packages/desktop/src/main/backend-client.ts
git commit -m "feat(desktop): add provider CRUD methods to backend-client"
```

---

## Task 2: Add New IPC Channels

**Files:**
- Modify: `packages/desktop/src/types/ipc.ts` (IPC_CHANNELS constants)
- Modify: `packages/desktop/src/main/ipc/channels.ts` (CHANNELS constants)

- [ ] **Step 1: Add IPC_CHANNELS constants**

Read `packages/desktop/src/types/ipc.ts` and add the following constants to the `IPC_CHANNELS` object:

```typescript
export const IPC_CHANNELS = {
  // ... existing channels ...
  PROVIDER_ADD: 'config:addProvider',
  PROVIDER_UPDATE: 'config:updateProvider',
  PROVIDER_DELETE: 'config:deleteProvider',
  PROVIDER_TEST: 'config:testProvider',
  PROVIDER_REFRESH_MODELS: 'config:refreshModels',
}
```

- [ ] **Step 2: Add CHANNELS constants (for main process)**

Read `packages/desktop/src/main/ipc/channels.ts` and add the same constants to the `CHANNELS` object:

```typescript
export const CHANNELS = {
  // ... existing channels ...
  PROVIDER_ADD: 'config:addProvider',
  PROVIDER_UPDATE: 'config:updateProvider',
  PROVIDER_DELETE: 'config:deleteProvider',
  PROVIDER_TEST: 'config:testProvider',
  PROVIDER_REFRESH_MODELS: 'config:refreshModels',
}
```

- [ ] **Step 2: Verify channel names are unique**

Run: `cd packages/desktop && grep -E "PROVIDER_ADD|PROVIDER_UPDATE|PROVIDER_DELETE|PROVIDER_TEST|PROVIDER_REFRESH" src/main/ipc/channels.ts`
Expected: Each channel appears exactly once

- [ ] **Step 3: Commit channel changes**

```bash
git add packages/desktop/src/main/ipc/channels.ts
git commit -m "feat(desktop): add provider CRUD IPC channels"
```

---

## Task 3: Add IPC Handlers for Provider CRUD

**Files:**
- Modify: `packages/desktop/src/main/ipc/handlers-config.ts:20-40`

- [ ] **Step 1: Add new IPC handlers**

Add the following handlers to the `registerConfigHandlers()` function after the existing handlers:

```typescript
  ipcMain.handle(CHANNELS.PROVIDER_ADD, async (_event, config: { name: string; apiKey: string; baseUrl?: string }, directory?: string) => {
    return await backend.provider.add(config, directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_UPDATE, async (_event, providerId: string, config: { apiKey?: string; baseUrl?: string }, directory?: string) => {
    return await backend.provider.update(providerId, config, directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_DELETE, async (_event, providerId: string, directory?: string) => {
    return await backend.provider.delete(providerId, directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_TEST, async (_event, providerIdOrConfig: string | { name: string; apiKey: string; baseUrl?: string }, directory?: string) => {
    return await backend.provider.test(providerIdOrConfig, directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_REFRESH_MODELS, async (_event, providerId: string, directory?: string) => {
    return await backend.provider.refreshModels(providerId, directory)
  })
```

- [ ] **Step 2: Import CHANNELS if not already imported**

Verify the import at the top of the file includes CHANNELS:
```typescript
import { CHANNELS } from './channels'
```

- [ ] **Step 3: Commit handler changes**

```bash
git add packages/desktop/src/main/ipc/handlers-config.ts
git commit -m "feat(desktop): add IPC handlers for provider CRUD operations"
```

---

## Task 4: Add Preload API Methods

**Files:**
- Modify: `packages/desktop/src/preload/api.ts`

- [ ] **Step 1: Add provider CRUD methods to desktopAPI.config**

Add the following methods to the `desktopAPI.provider` namespace in `api.ts` after the existing `authCallback` method:

```typescript
  provider: {
    // ... existing methods ...

    add: (config: { name: string; apiKey: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; provider?: unknown; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_ADD, config, directory),

    update: (providerId: string, config: { apiKey?: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; provider?: unknown; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_UPDATE, providerId, config, directory),

    delete: (providerId: string, directory?: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_DELETE, providerId, directory),

    test: (providerIdOrConfig: string | { name: string; apiKey: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; modelCount?: number; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_TEST, providerIdOrConfig, directory),

    refreshModels: (providerId: string, directory?: string): Promise<{ success: boolean; models?: unknown[]; changed?: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_REFRESH_MODELS, providerId, directory),
  },
```

- [ ] **Step 3: Commit preload changes**

```bash
git add packages/desktop/src/preload/
git commit -m "feat(desktop): add provider CRUD methods to preload API"
```

---

## Task 5: Extend modelsStore with CRUD Methods

**Files:**
- Modify: `packages/desktop/src/renderer/stores/models.ts`

- [ ] **Step 1: Extend ProviderInfo interface**

Modify the existing `ProviderInfo` interface to include optional API configuration fields:

```typescript
export interface ProviderInfo {
  id: string
  name: string
  source: string
  models: Record<string, ProviderModel>
  apiKey?: string      // Add this
  baseUrl?: string     // Add this
  errorMessage?: string // Add this for error states
}
```

- [ ] **Step 2: Add new state variables**

Add the following state variables after the existing ones in the `useModelsStore` function:

```typescript
  const saving = ref(false)
  const deleting = ref(false)
  const refreshing = ref(new Set<string>())
  const testing = ref(new Set<string>())
```

- [ ] **Step 3: Add addProvider method**

Add the following method before the `loadModels` function:

```typescript
async function addProvider(config: { name: string; apiKey: string; baseUrl?: string }): Promise<{ success: boolean; error?: string }> {
  saving.value = true
  error.value = null
  try {
    const result = await window.desktop.provider.add(config, directory)
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
```

- [ ] **Step 4: Add updateProvider method**

Add the following method:

```typescript
async function updateProvider(providerId: string, config: { apiKey?: string; baseUrl?: string }): Promise<{ success: boolean; error?: string }> {
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
```

- [ ] **Step 5: Add deleteProvider method**

Add the following method:

```typescript
async function deleteProvider(providerId: string): Promise<{ success: boolean; error?: string }> {
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
```

- [ ] **Step 6: Add testProvider method**

Add the following method:

```typescript
async function testProvider(providerId: string): Promise<{ success: boolean; modelCount?: number; error?: string }> {
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
```

- [ ] **Step 7: Add refreshModels method**

Add the following method:

```typescript
async function refreshModels(providerId: string): Promise<{ success: boolean; changed?: boolean; error?: string }> {
  refreshing.value.add(providerId)
  try {
    const result = await window.desktop.provider.refreshModels(providerId, directory)
    if (result.success && result.models) {
      const index = providers.value.findIndex(p => p.id === providerId)
      if (index !== -1) {
        providers.value[index].models = result.models as Record<string, ProviderModel>
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
```

- [ ] **Step 8: Export new state and methods**

Add the new exports to the return statement:

```typescript
return {
  // ... existing exports ...
  saving,
  deleting,
  refreshing,
  testing,
  addProvider,
  updateProvider,
  deleteProvider,
  testProvider,
  refreshModels,
}
```

- [ ] **Step 9: Verify TypeScript compiles**

Run: `cd packages/desktop && bun run typecheck`
Expected: No TypeScript errors

- [ ] **Step 10: Commit store changes**

```bash
git add packages/desktop/src/renderer/stores/models.ts
git commit -m "feat(desktop): add provider CRUD methods to models store"
```

---

## Task 6: Create GroupedModelSelect Component

**Files:**
- Create: `packages/desktop/src/renderer/components/settings/GroupedModelSelect.vue`

- [ ] **Step 1: Create component file**

Create `GroupedModelSelect.vue` with the following content:

```vue
<template>
  <div class="grouped-select relative">
    <button
      class="select-trigger w-full px-3 py-2 bg-bg-hover border border-border hover:border-border-light rounded text-text text-sm cursor-pointer transition-all duration-fast flex items-center justify-between"
      @click="toggleDropdown"
      @blur="handleBlur"
    >
      <span>{{ displayText }}</span>
      <svg class="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <div v-if="isOpen" class="select-dropdown absolute top-full left-0 mt-1 bg-bg-elevated border border-border rounded shadow-lg z-50 w-full max-h-64 overflow-y-auto">
      <!-- Search -->
      <div class="search-box p-2 border-b border-border">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search models..."
          class="w-full px-2 py-1 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
        />
      </div>

      <!-- Provider groups -->
      <div class="groups">
        <div
          v-for="group in filteredGroups"
          :key="group.provider"
          class="provider-group"
        >
          <div
            class="provider-header px-3 py-2 hover:bg-bg-hover cursor-pointer flex items-center justify-between"
            @click="toggleGroup(group.provider)"
          >
            <span class="text-xs font-medium text-text">{{ group.provider }} ({{ group.models.length }})</span>
            <svg class="w-3 h-3 text-text-muted transition-transform" :class="{ 'rotate-180': expandedGroups.has(group.provider) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>

          <div v-if="expandedGroups.has(group.provider)" class="models-list">
            <div
              v-for="model in group.models"
              :key="model.value"
              class="model-item px-3 py-1.5 pl-6 hover:bg-bg-hover cursor-pointer"
              :class="{ 'bg-accent/10': model.value === selectedModel }"
              @click.stop="selectModel(model.value)"
              @mousedown.stop
            >
              <span class="text-xs text-text">{{ model.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredGroups.length === 0" class="empty-state px-3 py-2 text-xs text-text-muted">
        No models match your search
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useModelsStore } from '../../stores/models'

const props = defineProps<{
  modelValue?: string
  disabled?: boolean
  directory?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const modelsStore = useModelsStore()

const isOpen = ref(false)
const searchQuery = ref('')
const selectedModel = ref(props.modelValue || '')
const expandedGroups = ref(new Set<string>())

// Group models by provider
const groupedModels = computed(() => {
  const groups: { provider: string; models: { value: string; name: string }[] }[] = []
  const providerMap = new Map<string, { value: string; name: string }[]>()

  for (const opt of modelsStore.modelOptions) {
    const parts = opt.label.split(' / ')
    if (parts.length === 2) {
      const provider = parts[0]
      const modelName = parts[1]

      if (!providerMap.has(provider)) {
        providerMap.set(provider, [])
      }
      providerMap.get(provider)!.push({
        value: opt.value,
        name: modelName
      })
    } else {
      const fallbackProvider = 'Other'
      if (!providerMap.has(fallbackProvider)) {
        providerMap.set(fallbackProvider, [])
      }
      providerMap.get(fallbackProvider)!.push({
        value: opt.value,
        name: opt.label
      })
    }
  }

  for (const [provider, models] of Array.from(providerMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    groups.push({ provider, models })
  }

  return groups
})

// Filter groups by search query
const filteredGroups = computed(() => {
  if (!searchQuery.value) return groupedModels.value

  return groupedModels.value.map(group => {
    const filteredModels = group.models.filter(model =>
      model.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      group.provider.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    return { provider: group.provider, models: filteredModels }
  }).filter(group => group.models.length > 0)
})

// Display text for trigger button
const displayText = computed(() => {
  if (!selectedModel.value) return 'Select default model'

  const opt = modelsStore.modelOptions.find(o => o.value === selectedModel.value)
  return opt?.label || selectedModel.value
})

function toggleDropdown() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
    if (isOpen.value && !searchQuery.value) {
      // Expand all groups by default when opening
      expandedGroups.value = new Set(groupedModels.value.map(g => g.provider))
    }
  }
}

function handleBlur() {
  setTimeout(() => {
    isOpen.value = false
    searchQuery.value = ''
  }, 200)
}

function toggleGroup(provider: string) {
  if (expandedGroups.value.has(provider)) {
    expandedGroups.value.delete(provider)
  } else {
    expandedGroups.value.add(provider)
  }
}

function selectModel(value: string) {
  selectedModel.value = value
  emit('update:modelValue', value)
  isOpen.value = false
  searchQuery.value = ''
}

watch(() => props.modelValue, (newVal) => {
  selectedModel.value = newVal || ''
})

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
    searchQuery.value = ''
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.grouped-select {
  position: relative;
}

.select-dropdown {
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.rotate-180 {
  transform: rotate(180deg);
}
</style>
```

- [ ] **Step 2: Commit GroupedModelSelect component**

```bash
git add packages/desktop/src/renderer/components/settings/GroupedModelSelect.vue
git commit -m "feat(desktop): create GroupedModelSelect component for settings"
```

---

## Task 7: Create ProviderCard Component

**Files:**
- Create: `packages/desktop/src/renderer/components/settings/ProviderCard.vue`

- [ ] **Step 1: Create component file**

Create `ProviderCard.vue` with the following content:

```vue
<template>
  <div class="provider-card p-4 rounded-lg bg-bg-hover border border-border">
    <!-- Header with status -->
    <div class="card-header flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <button
          class="collapse-btn text-sm font-medium text-text flex items-center gap-1 cursor-pointer"
          @click="toggleCollapse"
        >
          <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': !collapsed }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span>{{ provider.name }} ({{ modelCount }})</span>
        </button>
        <span class="status-indicator text-xs">
          <span v-if="isConnected" class="text-green-400">● Connected</span>
          <span v-else class="text-text-muted">○ Disconnected</span>
        </span>
      </div>
    </div>

    <!-- Collapsible content -->
    <div v-if="!collapsed" class="card-content">
      <!-- API Key (masked) -->
      <div class="api-key-section mb-2 flex items-center gap-2">
        <span class="text-xs text-text-muted">API Key:</span>
        <span class="text-xs text-text">{{ showApiKey ? maskedApiKey : '●●●●●●●●●●●●' }}</span>
        <button
          class="toggle-visibility-btn text-xs text-text-muted hover:text-text cursor-pointer"
          @click="toggleApiKeyVisibility"
        >
          {{ showApiKey ? '👁 Hide' : '👁 Show' }}
        </button>
        <button
          class="copy-btn text-xs text-text-muted hover:text-text cursor-pointer"
          @click="copyApiKey"
        >
          📋 Copy
        </button>
      </div>

      <!-- Base URL (if exists) -->
      <div v-if="baseUrl" class="base-url-section mb-3 flex items-center gap-2">
        <span class="text-xs text-text-muted">Base URL:</span>
        <span class="text-xs text-text">{{ baseUrl }}</span>
      </div>

      <!-- Models list (collapsible with search) -->
      <div class="models-section mb-3">
        <button
          class="view-models-btn text-xs text-text-muted hover:text-text cursor-pointer flex items-center gap-1"
          @click="toggleModelsList"
        >
          <span>Models ({{ modelCount }})</span>
          <span>{{ modelsExpanded ? '▲ Hide Models' : '▼ View Models' }}</span>
        </button>

        <div v-if="modelsExpanded" class="models-list-container mt-2">
          <input
            v-model="modelSearchQuery"
            type="text"
            placeholder="Search models..."
            class="search-input w-full px-2 py-1 bg-bg border border-border rounded text-xs text-text mb-2 focus:border-border-light focus:outline-none"
          />

          <div class="models-list max-h-48 overflow-y-auto">
            <div
              v-for="model in filteredModels"
              :key="model.id"
              class="model-item text-xs text-text-muted py-1 pl-2"
            >
              • {{ model.name || model.id }}
            </div>
            <div v-if="filteredModels.length === 0" class="no-models text-xs text-text-muted py-1">
              No models match your search
            </div>
          </div>
        </div>
      </div>

      <!-- Error message -->
      <div v-if="errorMessage" class="error-message mb-3 text-xs text-red-400">
        {{ errorMessage }}
      </div>

      <!-- Action buttons -->
      <div class="action-buttons flex gap-2">
        <button
          class="edit-btn px-3 py-1 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer transition-all duration-fast"
          @click="$emit('edit', provider.id)"
        >
          Edit
        </button>
        <button
          class="test-btn px-3 py-1 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer transition-all duration-fast"
          :disabled="testing"
          @click="$emit('test', provider.id)"
        >
          {{ testing ? 'Testing...' : 'Test' }}
        </button>
        <button
          class="refresh-btn px-3 py-1 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer transition-all duration-fast"
          :disabled="refreshing"
          @click="$emit('refresh-models', provider.id)"
        >
          {{ refreshing ? 'Refreshing...' : 'Refresh Models' }}
        </button>
        <button
          class="delete-btn px-3 py-1 text-xs bg-bg border border-red-400 hover:border-red-300 rounded text-red-400 hover:text-red-300 cursor-pointer transition-all duration-fast"
          @click="$emit('delete', provider.id)"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProviderInfo } from '../../stores/models'

const props = defineProps<{
  provider: ProviderInfo
  testing?: boolean
  refreshing?: boolean
}>()

const emit = defineEmits<{
  edit: [providerId: string]
  test: [providerId: string]
  'refresh-models': [providerId: string]
  delete: [providerId: string]
}>()

const collapsed = ref(false)
const modelsExpanded = ref(false)
const showApiKey = ref(false)
const modelSearchQuery = ref('')

const modelCount = computed(() => Object.keys(props.provider.models || {}).length)
const isConnected = computed(() => modelCount.value > 0)

const baseUrl = computed(() => props.provider.baseUrl || null)

const maskedApiKey = computed(() => {
  const key = props.provider.apiKey || ''
  if (key.length <= 8) return '●●●●●●●●'
  return key.slice(0, 4) + '***' + key.slice(-4)
})

const filteredModels = computed(() => {
  const models = Object.entries(props.provider.models || {}).map(([id, model]) => ({
    id,
    name: model.name || id
  }))

  if (!modelSearchQuery.value) return models

  return models.filter(model =>
    model.name.toLowerCase().includes(modelSearchQuery.value.toLowerCase()) ||
    model.id.toLowerCase().includes(modelSearchQuery.value.toLowerCase())
  )
})

const errorMessage = computed(() => props.provider.errorMessage || null)

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function toggleModelsList() {
  modelsExpanded.value = !modelsExpanded.value
}

function toggleApiKeyVisibility() {
  showApiKey.value = !showApiKey.value
}

function copyApiKey() {
  const key = (props.provider as any).apiKey || ''
  navigator.clipboard.writeText(key)
}
</script>

<style scoped>
.rotate-180 {
  transform: rotate(180deg);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 2: Commit ProviderCard component**

```bash
git add packages/desktop/src/renderer/components/settings/ProviderCard.vue
git commit -m "feat(desktop): create ProviderCard component"
```

---

## Task 8: Create AddProviderModal Component

**Files:**
- Create: `packages/desktop/src/renderer/components/settings/AddProviderModal.vue`

- [ ] **Step 1: Create component file**

Create `AddProviderModal.vue` with the following content:

```vue
<template>
  <div v-if="isOpen" class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="modal-content bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-md p-4">
      <div class="modal-header flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-text">Add Provider</h3>
        <button
          class="close-btn text-text-muted hover:text-text cursor-pointer"
          @click="$emit('cancel')"
        >
          ×
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <!-- Provider Name -->
        <div class="form-group mb-3">
          <label class="form-label text-xs text-text-muted mb-1 block">Provider Name *</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g., OpenAI"
            class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
            required
          />
          <div v-if="errors.name" class="error-text text-xs text-red-400 mt-1">{{ errors.name }}</div>
        </div>

        <!-- API Key -->
        <div class="form-group mb-3">
          <label class="form-label text-xs text-text-muted mb-1 block">API Key *</label>
          <div class="api-key-input flex items-center gap-2">
            <input
              v-model="form.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="Enter your API key"
              class="form-input flex-1 px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
              required
            />
            <button
              type="button"
              class="toggle-btn px-2 py-1 text-xs text-text-muted hover:text-text cursor-pointer"
              @click="showApiKey = !showApiKey"
            >
              {{ showApiKey ? '👁 Hide' : '👁 Show' }}
            </button>
          </div>
          <div v-if="errors.apiKey" class="error-text text-xs text-red-400 mt-1">{{ errors.apiKey }}</div>
        </div>

        <!-- Base URL (optional) -->
        <div class="form-group mb-4">
          <label class="form-label text-xs text-text-muted mb-1 block">Base URL (optional)</label>
          <input
            v-model="form.baseUrl"
            type="text"
            placeholder="e.g., https://api.openai.com/v1"
            class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
          />
          <div v-if="errors.baseUrl" class="error-text text-xs text-red-400 mt-1">{{ errors.baseUrl }}</div>
        </div>

        <!-- Form actions -->
        <div class="form-actions flex gap-2 justify-end">
          <button
            type="button"
            class="cancel-btn px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer transition-all duration-fast"
            @click="$emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="submit-btn px-4 py-2 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer transition-all duration-fast"
            :disabled="saving"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
  saving?: boolean
  existingProviders?: string[]
}>()

const emit = defineEmits<{
  save: [config: { name: string; apiKey: string; baseUrl?: string }]
  cancel: []
}>()

const form = ref({
  name: '',
  apiKey: '',
  baseUrl: ''
})

const errors = ref({
  name: '',
  apiKey: '',
  baseUrl: ''
})

const showApiKey = ref(false)

function resetForm() {
  form.value = { name: '', apiKey: '', baseUrl: '' }
  errors.value = { name: '', apiKey: '', baseUrl: '' }
  showApiKey.value = false
}

function validateForm(): boolean {
  errors.value = { name: '', apiKey: '', baseUrl: '' }

  if (!form.value.name.trim()) {
    errors.value.name = 'Provider name is required'
    return false
  }

  if (props.existingProviders?.includes(form.value.name.trim())) {
    errors.value.name = `Provider '${form.value.name}' already exists`
    return false
  }

  if (!form.value.apiKey.trim()) {
    errors.value.apiKey = 'API key is required'
    return false
  }

  if (form.value.baseUrl && !form.value.baseUrl.startsWith('http')) {
    errors.value.baseUrl = 'Base URL must start with http:// or https://'
    return false
  }

  return true
}

function handleSubmit() {
  if (!validateForm()) return

  emit('save', {
    name: form.value.name.trim(),
    apiKey: form.value.apiKey.trim(),
    baseUrl: form.value.baseUrl?.trim() || undefined
  })
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm()
  }
})
</script>

<style scoped>
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 2: Commit AddProviderModal component**

```bash
git add packages/desktop/src/renderer/components/settings/AddProviderModal.vue
git commit -m "feat(desktop): create AddProviderModal component"
```

---

## Task 9: Create EditProviderModal Component

**Files:**
- Create: `packages/desktop/src/renderer/components/settings/EditProviderModal.vue`

- [ ] **Step 1: Create component file**

Create `EditProviderModal.vue` with the following content:

```vue
<template>
  <div v-if="isOpen" class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="modal-content bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-md p-4">
      <div class="modal-header flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-text">Edit {{ provider?.name }}</h3>
        <button
          class="close-btn text-text-muted hover:text-text cursor-pointer"
          @click="$emit('cancel')"
        >
          ×
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <!-- API Key -->
        <div class="form-group mb-3">
          <label class="form-label text-xs text-text-muted mb-1 block">API Key *</label>
          <div class="api-key-input flex items-center gap-2">
            <input
              v-model="form.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="Enter your API key"
              class="form-input flex-1 px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
              required
            />
            <button
              type="button"
              class="toggle-btn px-2 py-1 text-xs text-text-muted hover:text-text cursor-pointer"
              @click="showApiKey = !showApiKey"
            >
              {{ showApiKey ? '👁 Hide' : '👁 Show' }}
            </button>
          </div>
          <div v-if="errors.apiKey" class="error-text text-xs text-red-400 mt-1">{{ errors.apiKey }}</div>
        </div>

        <!-- Base URL -->
        <div class="form-group mb-4">
          <label class="form-label text-xs text-text-muted mb-1 block">Base URL</label>
          <input
            v-model="form.baseUrl"
            type="text"
            placeholder="e.g., https://api.openai.com/v1"
            class="form-input w-full px-3 py-2 bg-bg border border-border rounded text-sm text-text focus:border-border-light focus:outline-none"
          />
          <div v-if="errors.baseUrl" class="error-text text-xs text-red-400 mt-1">{{ errors.baseUrl }}</div>
        </div>

        <!-- Form actions -->
        <div class="form-actions flex gap-2 justify-end">
          <button
            type="button"
            class="cancel-btn px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer transition-all duration-fast"
            @click="$emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="submit-btn px-4 py-2 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer transition-all duration-fast"
            :disabled="saving"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ProviderInfo } from '../../stores/models'

const props = defineProps<{
  isOpen: boolean
  provider?: ProviderInfo
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [providerId: string, config: { apiKey?: string; baseUrl?: string }]
  cancel: []
}>()

const form = ref({
  apiKey: '',
  baseUrl: ''
})

const errors = ref({
  apiKey: '',
  baseUrl: ''
})

const showApiKey = ref(false)

function resetForm() {
  if (props.provider) {
    form.value = {
      apiKey: props.provider.apiKey || '',
      baseUrl: props.provider.baseUrl || ''
    }
  } else {
    form.value = { apiKey: '', baseUrl: '' }
  }
  errors.value = { apiKey: '', baseUrl: '' }
  showApiKey.value = false
}

function validateForm(): boolean {
  errors.value = { apiKey: '', baseUrl: '' }

  if (!form.value.apiKey.trim()) {
    errors.value.apiKey = 'API key is required'
    return false
  }

  if (form.value.baseUrl && !form.value.baseUrl.startsWith('http')) {
    errors.value.baseUrl = 'Base URL must start with http:// or https://'
    return false
  }

  return true
}

function handleSubmit() {
  if (!validateForm() || !props.provider) return

  emit('save', props.provider.id, {
    apiKey: form.value.apiKey.trim(),
    baseUrl: form.value.baseUrl?.trim() || undefined
  })
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

watch(() => props.provider, () => {
  if (props.isOpen) {
    resetForm()
  }
})
</script>

<style scoped>
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 2: Commit EditProviderModal component**

```bash
git add packages/desktop/src/renderer/components/settings/EditProviderModal.vue
git commit -m "feat(desktop): create EditProviderModal component"
```

---

## Task 10: Redesign SettingsModels.vue

**Files:**
- Modify: `packages/desktop/src/renderer/components/settings/SettingsModels.vue`

- [ ] **Step 1: Replace SettingsModels.vue content**

Replace the entire content of `SettingsModels.vue` with:

```vue
<template>
  <div class="settings-section">
    <h2 class="text-lg font-medium text-text mb-4">Models</h2>

    <div class="space-y-4">
      <!-- Default model selector (grouped) -->
      <div class="default-model-section">
        <label class="text-xs text-text-muted mb-1 block">Default Model</label>
        <GroupedModelSelect
          v-model="defaultModel"
          :directory="directory"
          @update:model-value="handleDefaultModelChange"
        />
      </div>

      <hr class="border-border my-4" />

      <!-- Provider management -->
      <div class="providers-section">
        <div class="providers-header flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-text">Providers</h3>
          <button
            class="add-provider-btn px-3 py-1 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer transition-all duration-fast"
            @click="showAddModal = true"
          >
            + Add Provider
          </button>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="loading-state text-sm text-text-muted py-4">
          Loading providers...
        </div>

        <!-- Empty state -->
        <div v-else-if="providers.length === 0" class="empty-state text-sm text-text-muted py-4">
          No providers configured yet.
          <span class="text-text">Click "Add Provider" to get started.</span>
        </div>

        <!-- Provider cards -->
        <div v-else class="provider-cards space-y-3">
          <ProviderCard
            v-for="provider in providers"
            :key="provider.id"
            :provider="provider"
            :testing="testingProviders.has(provider.id)"
            :refreshing="refreshingProviders.has(provider.id)"
            @edit="handleEdit"
            @test="handleTest"
            @refresh-models="handleRefreshModels"
            @delete="handleDelete"
          />
        </div>

        <!-- Error state -->
        <div v-if="error" class="error-state text-sm text-red-400 py-2">
          {{ error }}
        </div>
      </div>
    </div>

    <!-- Add Provider Modal -->
    <AddProviderModal
      :is-open="showAddModal"
      :saving="saving"
      :existing-providers="existingProviderNames"
      @save="handleAddProvider"
      @cancel="showAddModal = false"
    />

    <!-- Edit Provider Modal -->
    <EditProviderModal
      :is-open="showEditModal"
      :provider="editingProvider"
      :saving="saving"
      @save="handleUpdateProvider"
      @cancel="showEditModal = false"
    />

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="confirm-dialog bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-sm p-4">
        <h3 class="text-sm font-medium text-text mb-3">Delete Provider?</h3>
        <p class="text-xs text-text-muted mb-4">
          Are you sure you want to delete {{ deletingProviderName }}?
        </p>
        <div class="dialog-actions flex gap-2 justify-end">
          <button
            class="cancel-btn px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer transition-all duration-fast"
            @click="showDeleteConfirm = false"
          >
            Cancel
          </button>
          <button
            class="delete-btn px-4 py-2 text-xs bg-red-500 hover:bg-red-400 rounded text-white cursor-pointer transition-all duration-fast"
            :disabled="deleting"
            @click="confirmDelete"
          >
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWorkspaceStore } from '../../stores/workspace'
import { useModelsStore, type ProviderInfo } from '../../stores/models'
import GroupedModelSelect from './GroupedModelSelect.vue'
import ProviderCard from './ProviderCard.vue'
import AddProviderModal from './AddProviderModal.vue'
import EditProviderModal from './EditProviderModal.vue'

const workspaceStore = useWorkspaceStore()
const modelsStore = useModelsStore()

const directory = computed(() => workspaceStore.currentWorkspace?.path)

// Store state
const providers = computed(() => modelsStore.providers)
const loading = computed(() => modelsStore.loading)
const error = computed(() => modelsStore.error)
const saving = computed(() => modelsStore.saving)
const deleting = computed(() => modelsStore.deleting)

// Local state for tracking operations
const testingProviders = ref(new Set<string>())
const refreshingProviders = ref(new Set<string>())

// Modal state
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const editingProvider = ref<ProviderInfo | null>(null)
const deletingProviderId = ref<string | null>(null)
const deletingProviderName = ref<string>('')

// Default model
const defaultModel = ref('')

// Computed
const existingProviderNames = computed(() =>
  providers.value.map(p => p.name)
)

// Load data on mount
onMounted(async () => {
  try {
    const configDefaultModel = await window.desktop.config.get('defaultModel', directory.value)
    if (configDefaultModel) defaultModel.value = String(configDefaultModel)

    await modelsStore.loadModels(directory.value)
  } catch (err) {
    console.error('Failed to load config:', err)
  }
})

// Handlers
async function handleDefaultModelChange(value: string) {
  try {
    await window.desktop.config.set('defaultModel', value, directory.value)
    defaultModel.value = value
  } catch (err) {
    console.error('Failed to save default model:', err)
  }
}

async function handleAddProvider(config: { name: string; apiKey: string; baseUrl?: string }) {
  const result = await modelsStore.addProvider(config)
  if (result.success) {
    showAddModal.value = false
  } else {
    // Error is handled by store, but we could show a toast notification here
  }
}

function handleEdit(providerId: string) {
  const provider = providers.value.find(p => p.id === providerId)
  if (provider) {
    editingProvider.value = provider
    showEditModal.value = true
  }
}

async function handleUpdateProvider(providerId: string, config: { apiKey?: string; baseUrl?: string }) {
  const result = await modelsStore.updateProvider(providerId, config)
  if (result.success) {
    showEditModal.value = false
    editingProvider.value = null
  }
}

async function handleTest(providerId: string) {
  testingProviders.value.add(providerId)
  const result = await modelsStore.testProvider(providerId)
  testingProviders.value.delete(providerId)

  // Could show a toast notification here based on result
  if (result.success) {
    console.log(`Test successful: ${result.modelCount} models found`)
  } else {
    console.error(`Test failed: ${result.error}`)
  }
}

async function handleRefreshModels(providerId: string) {
  refreshingProviders.value.add(providerId)
  const result = await modelsStore.refreshModels(providerId)
  refreshingProviders.value.delete(providerId)

  if (result.success && result.changed) {
    console.log('Models updated')
  }
}

function handleDelete(providerId: string) {
  const provider = providers.value.find(p => p.id === providerId)
  if (provider) {
    deletingProviderId.value = providerId
    deletingProviderName.value = provider.name
    showDeleteConfirm.value = true
  }
}

async function confirmDelete() {
  if (!deletingProviderId.value) return

  const result = await modelsStore.deleteProvider(deletingProviderId.value)
  if (result.success) {
    showDeleteConfirm.value = false
    deletingProviderId.value = null
    deletingProviderName.value = ''
  }
}
</script>

<style scoped>
.settings-section {
  /* Section styling */
}
</style>
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd packages/desktop && bun run typecheck`
Expected: No TypeScript errors

- [ ] **Step 3: Commit SettingsModels redesign**

```bash
git add packages/desktop/src/renderer/components/settings/SettingsModels.vue
git commit -m "feat(desktop): redesign SettingsModels page with provider management"
```

---

## Task 11: Update Type Declarations

**Files:**
- No changes needed - types are inferred from `DesktopAPI` type in `packages/desktop/src/preload/api.ts`

- [ ] **Step 1: Verify types are correct**

The `window.desktop` interface is automatically typed via `DesktopAPI` type exported from `preload/api.ts`. When we add new methods to `desktopAPI.provider` in Task 4, the types will automatically propagate.

Run: `cd packages/desktop && bun run typecheck`
Expected: No TypeScript errors

---

## Task 12: Test the Complete Implementation

**Files:**
- Test: All new components and functionality

- [ ] **Step 1: Build the preload bundle**

Run: `cd packages/desktop && bun run build:preload`
Expected: Successful build

- [ ] **Step 2: Start the dev server**

Run: `cd packages/desktop && bun run dev`
Expected: App starts without errors

- [ ] **Step 3: Test provider management UI**

Manual testing checklist:
- [ ] Add Provider modal opens and closes correctly
- [ ] Form validation works (empty fields, duplicate names, invalid URLs)
- [ ] API key show/hide and copy functionality works
- [ ] Provider card displays correctly with model count
- [ ] Models list expands/collapses with search
- [ ] Edit modal opens with pre-filled values
- [ ] Test connection button works
- [ ] Refresh models button works
- [ ] Delete confirmation dialog works
- [ ] Default model grouped selector works

- [ ] **Step 4: Commit final integration**

```bash
git add -A
git commit -m "feat(desktop): complete models settings redesign with provider management"
```

---

## Success Criteria

After all tasks are complete, verify:
- [ ] User can add a new provider via UI form
- [ ] User can edit existing provider configuration
- [ ] User can delete a provider with confirmation
- [ ] User can test provider connection
- [ ] User can refresh model list for a provider
- [ ] Default model selector shows grouped models by provider
- [ ] API keys are properly masked in the UI
- [ ] All error states are handled gracefully
- [ ] Loading states provide clear feedback
- [ ] No TypeScript compilation errors
- [ ] App builds and runs successfully