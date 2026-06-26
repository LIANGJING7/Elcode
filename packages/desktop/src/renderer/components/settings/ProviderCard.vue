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
  const key = props.provider.apiKey || ''
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