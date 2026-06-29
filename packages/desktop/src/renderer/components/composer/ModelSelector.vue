<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        class="h-7 px-2.5 rounded-lg bg-bg-elevated hover:bg-bg-hover text-xs text-text font-medium flex items-center gap-1 transition-colors"
      >
        <span>{{ displayText }}</span>
        <svg class="w-3 h-3 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
      ref="contentRef"
      class="max-h-64"
      align="end"
      side="top"
      :side-offset="4"
    >
      <!-- Provider groups -->
      <DropdownMenuSub
        v-for="group in groupedModels"
        :key="group.provider"
        :open="openProvider === group.provider"
      >
        <DropdownMenuSubTrigger
          class="px-3 py-1.5 text-xs text-text"
          @pointerenter="onProviderEnter(group.provider)"
          @pointerleave="onProviderLeave"
        >
          <span>{{ group.provider }}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent
          class="max-h-48 overflow-y-auto"
          :side-offset="2"
          @pointerenter="isInsideSub = true"
          @pointerleave="isInsideSub = false"
        >
          <DropdownMenuItem
            v-for="model in group.models"
            :key="model.value"
            class="px-3 py-1.5 text-xs text-text"
            :class="{ 'bg-accent/10': model.value === selectedModel }"
            @click="selectModel(model.value)"
          >
            {{ model.name }}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <!-- Empty state -->
      <div v-if="groupedModels.length === 0" class="px-3 py-2 text-xs text-text-muted">
        No models available
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { useModelsStore } from '../../stores/models'

const props = defineProps<{
  modelValue?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const modelsStore = useModelsStore()

const contentRef = ref<InstanceType<typeof DropdownMenuContent> | null>(null)

// Track which provider submenu is open
const openProvider = ref<string | null>(null)
const isInsideSub = ref(false)

// Debounce close so hovering submenu content doesn't flicker
let closeTimer: ReturnType<typeof setTimeout> | null = null

function onProviderEnter(provider: string) {
  if (closeTimer) clearTimeout(closeTimer)
  openProvider.value = provider
}

function onProviderLeave() {
  // Small delay so entering the submenu content works
  closeTimer = setTimeout(() => {
    if (!isInsideSub.value) {
      openProvider.value = null
    }
  }, 100)
}

// Listen for wheel on provider list — close submenu on scroll
watch(contentRef, (el) => {
  if (!el) return
  const root = (el as any).$el as HTMLElement | undefined
  if (!root) return
  root.addEventListener('wheel', () => {
    openProvider.value = null
  }, { passive: true })
}, { immediate: true })

const selectedModel = computed({
  get: () => props.modelValue || '',
  set: (val) => emit('update:modelValue', val)
})

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

const displayText = computed(() => {
  if (!selectedModel.value) {
    return 'Select model'
  }
  const opt = modelsStore.modelOptions.find(o => o.value === selectedModel.value)
  return opt?.label || selectedModel.value
})

async function selectModel(value: string) {
  selectedModel.value = value
  await modelsStore.setSelectedModel(value)
}
</script>
