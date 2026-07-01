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
      class="max-h-64 overflow-y-auto border-border/20 shadow-sm"
      align="end"
      side="top"
      :side-offset="4"
    >
      <!-- Provider groups with submenu -->
      <DropdownMenuSub
        v-for="group in groupedModels"
        :key="group.provider"
      >
        <DropdownMenuSubTrigger class="px-3 py-1.5 text-xs text-text">
          <span>{{ group.provider }}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent
          class="max-h-48 overflow-y-auto border-border/20 shadow-sm"
          :side-offset="2"
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
import { computed } from 'vue'
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

const selectedModel = computed({
  get: () => props.modelValue || '',
  set: (val) => emit('update:modelValue', val)
})

// Group models by provider
const groupedModels = computed(() => {
  const groups: { provider: string; models: { value: string; name: string }[] }[] = []
  const providerMap = new Map<string, { value: string; name: string }[]>()

  const opts = modelsStore.modelOptions || []
  console.log('[ModelSelector] modelOptions count:', opts.length, 'first 3:', opts.slice(0, 3))
  
  for (const opt of opts) {
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

  console.log('[ModelSelector] groupedModels:', groups.length, 'groups')
  return groups
})

const displayText = computed(() => {
  if (!selectedModel.value) {
    return 'Select model'
  }
  const opts = modelsStore.modelOptions || []
  const opt = opts.find(o => o.value === selectedModel.value)
  if (!opt) return selectedModel.value
  
  // 只显示模型名称，去掉 Provider 部分
  const parts = opt.label.split(' / ')
  return parts.length === 2 ? parts[1] : opt.label
})

async function selectModel(value: string) {
  selectedModel.value = value
  await modelsStore.setSelectedModel(value)
}
</script>