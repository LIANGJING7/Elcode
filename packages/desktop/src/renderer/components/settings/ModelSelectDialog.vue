<template>
  <div v-if="isOpen" class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="modal-content bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-lg p-4">
      <div class="modal-header flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-text">选择模型 - {{ providerName }}</h3>
        <button
          class="close-btn w-6 h-6 flex items-center justify-center text-text-muted hover:text-text cursor-pointer rounded hover:bg-bg-hover"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>

      <div class="modal-body">
        <!-- Search -->
        <div class="mb-4">
          <div class="flex items-center gap-2 px-3 py-2 bg-bg border border-border rounded-lg">
            <svg class="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索模型..."
              class="flex-1 bg-transparent text-sm text-text focus:outline-none"
            />
          </div>
        </div>

        <!-- Model list -->
        <div class="max-h-64 overflow-y-auto">
          <div v-if="filteredModels.length === 0" class="text-center py-8 text-xs text-text-muted">
            {{ loading ? '加载中...' : (searchQuery ? '没有找到匹配的模型' : '暂无模型') }}
          </div>
          
          <div v-else class="space-y-1">
            <button
              v-for="model in filteredModels"
              :key="model.id"
              class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors cursor-pointer"
              :class="selectedModelId === model.id ? 'bg-accent/10 text-accent' : 'text-text hover:bg-bg-hover'"
              @click="selectedModelId = model.id"
            >
              <div class="flex flex-col min-w-0">
                <span class="font-medium truncate">{{ model.name }}</span>
                <span class="text-xs text-text-muted font-mono truncate">{{ model.id }}</span>
              </div>
              <span
                v-if="model.free"
                class="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded"
              >
                免费
              </span>
              <span
                v-else-if="model.cost"
                class="text-xs text-text-muted"
              >
                {{ model.cost }}
              </span>
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 justify-end mt-4">
          <button
            class="px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer"
            @click="$emit('close')"
          >
            跳过
          </button>
          <button
            class="px-4 py-2 text-xs bg-accent hover:bg-accent-light rounded text-white cursor-pointer"
            :disabled="!selectedModelId"
            @click="handleSelect"
          >
            使用此模型
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

interface ModelInfo {
  id: string
  name: string
  free?: boolean
  cost?: string
}

const props = defineProps<{
  isOpen: boolean
  providerId: string
  providerName?: string
  directory?: string
}>()

const emit = defineEmits<{
  select: [providerId: string, modelId: string]
  close: []
}>()

const searchQuery = ref('')
const selectedModelId = ref('')
const models = ref<ModelInfo[]>([])
const loading = ref(false)

const providerName = computed(() => {
  if (props.providerName) return props.providerName
  const id = props.providerId
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ').replace(/(?:^|\s)\S/g, l => l.toUpperCase())
})

const filteredModels = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return models.value
  return models.value.filter(m =>
    m.name.toLowerCase().includes(query) ||
    m.id.toLowerCase().includes(query)
  )
})

async function loadModels() {
  if (!props.isOpen) return
  loading.value = true
  
  try {
    // 获取供应商列表，找到当前供应商的模型
    const result = await window.desktop.config.models(props.directory)
    const provider = (result.all as any[]).find(p => p.id === props.providerId)
    
    if (provider?.models) {
      models.value = Object.entries(provider.models).map(([id, model]: [string, any]) => ({
        id,
        name: model.name || id,
        free: model.cost?.input === 0 && props.providerId === 'opencode',
        cost: model.cost?.input ? `$${model.cost.input}/1K` : undefined,
      }))
      
      // 排序：免费优先，然后按名称
      models.value.sort((a, b) => {
        if (a.free && !b.free) return -1
        if (!a.free && b.free) return 1
        return a.name.localeCompare(b.name)
      })
      
      // 默认选择第一个
      if (models.value.length > 0 && !selectedModelId.value) {
        selectedModelId.value = models.value[0].id
      }
    }
  } catch (e) {
    console.error('Failed to load models:', e)
    models.value = []
  } finally {
    loading.value = false
  }
}

function handleSelect() {
  if (!selectedModelId.value) return
  emit('select', props.providerId, selectedModelId.value)
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    searchQuery.value = ''
    selectedModelId.value = ''
    loadModels()
  }
})
</script>

<style scoped>
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>