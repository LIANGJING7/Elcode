<template>
  <div class="model-selector">
    <!-- Trigger button -->
    <button
      class="model-trigger px-2 py-1 bg-bg-hover border border-border hover:border-border-light rounded text-text text-2xs font-medium cursor-pointer transition-all duration-fast flex items-center gap-1"
      @click="toggleDropdown"
      @blur="handleBlur"
    >
      <span>{{ displayText }}</span>
      <svg class="w-3 h-3 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <!-- Dropdown menu (above trigger) -->
    <div v-if="isOpen" class="model-dropdown absolute bottom-full left-0 mb-1 bg-bg-elevated border border-border rounded shadow-lg z-50 min-w-48">
      <!-- Provider list -->
      <div class="provider-list">
        <div
          v-for="group in groupedModels"
          :key="group.provider"
          class="provider-item px-2 py-1.5 hover:bg-bg-hover cursor-pointer flex items-center justify-between relative"
          @mouseenter="showSubMenu(group.provider)"
          @mouseleave="hideSubMenu"
          @click.stop="selectProvider(group.provider)"
        >
          <span class="text-2xs text-text">{{ group.provider }}</span>
          <svg class="w-3 h-3 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>

          <!-- Sub-menu (models for this provider) - also above -->
          <div
            v-if="activeSubMenu === group.provider"
            class="model-submenu absolute left-full bottom-0 ml-1 bg-bg-elevated border border-border rounded shadow-lg min-w-48"
          >
            <div
              v-for="model in group.models"
              :key="model.value"
              class="model-item px-2 py-1.5 hover:bg-bg-hover cursor-pointer"
              :class="{ 'bg-accent/10': model.value === selectedModel }"
              @click.stop="selectModel(model.value)"
              @mousedown.stop
            >
              <span class="text-2xs text-text">{{ model.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="groupedModels.length === 0" class="px-3 py-2 text-2xs text-text-muted">
        No models available
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
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const modelsStore = useModelsStore()

const isOpen = ref(false)
const activeSubMenu = ref<string | null>(null)
const selectedModel = ref(props.modelValue || '')

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

  // Convert map to array sorted by provider name
  for (const [provider, models] of Array.from(providerMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    groups.push({ provider, models })
  }

  return groups
})

// Display text for trigger button
const displayText = computed(() => {
  if (!selectedModel.value) {
    return 'Select model'
  }

  // Find the full label
  const opt = modelsStore.modelOptions.find(o => o.value === selectedModel.value)
  return opt?.label || selectedModel.value
})

function toggleDropdown() {
  if (!props.disabled && modelsStore.modelOptions.length > 0) {
    isOpen.value = !isOpen.value
    if (!isOpen.value) {
      activeSubMenu.value = null
    }
  }
}

function handleBlur() {
  // Delay to allow click events to fire first
  setTimeout(() => {
    isOpen.value = false
    activeSubMenu.value = null
  }, 200)
}

function showSubMenu(provider: string) {
  activeSubMenu.value = provider
}

function hideSubMenu() {
  // Only hide if not clicking in sub-menu
  setTimeout(() => {
    if (!isOpen.value) {
      activeSubMenu.value = null
    }
  }, 100)
}

function selectProvider(provider: string) {
  // Don't select provider itself - wait for model selection
  // But could be used to select first model in provider if needed
}

function selectModel(value: string) {
  selectedModel.value = value
  emit('update:modelValue', value)
  isOpen.value = false
  activeSubMenu.value = null
}

// Sync with prop changes
watch(() => props.modelValue, (newVal) => {
  selectedModel.value = newVal || ''
})

// Close on escape key
function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
    activeSubMenu.value = null
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
.model-selector {
  position: relative;
  display: inline-block;
}

.model-dropdown {
  animation: fadeIn 0.1s ease-out;
}

.model-submenu {
  animation: slideIn 0.1s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>