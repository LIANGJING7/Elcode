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