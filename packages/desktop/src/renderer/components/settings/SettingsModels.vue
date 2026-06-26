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
  const result = await modelsStore.addProvider(config, directory.value)
  if (result.success) {
    showAddModal.value = false
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
  const result = await modelsStore.updateProvider(providerId, config, directory.value)
  if (result.success) {
    showEditModal.value = false
    editingProvider.value = null
  }
}

async function handleTest(providerId: string) {
  testingProviders.value.add(providerId)
  const result = await modelsStore.testProvider(providerId, directory.value)
  testingProviders.value.delete(providerId)

  if (result.success) {
    console.log(`Test successful: ${result.modelCount} models found`)
  } else {
    console.error(`Test failed: ${result.error}`)
  }
}

async function handleRefreshModels(providerId: string) {
  refreshingProviders.value.add(providerId)
  const result = await modelsStore.refreshModels(providerId, directory.value)
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

  const result = await modelsStore.deleteProvider(deletingProviderId.value, directory.value)
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