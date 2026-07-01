<template>
  <div class="session-options flex items-center gap-1.5">
    <!-- Mode selector -->
    <Select
      v-model="localMode"
      :disabled="!isRuntimeAllowed('mode') && editingSession"
      @update:model-value="emitUpdate"
    >
      <SelectTrigger class="h-7 px-2.5 text-xs rounded-lg bg-bg-elevated hover:bg-bg-hover">
        <SelectValue />
      </SelectTrigger>
      <SelectContent class="border-border/20 shadow-sm">
        <SelectItem class="text-xs text-text focus:bg-accent/10 focus:text-text data-[state=checked]:bg-accent/10" value="build">Build</SelectItem>
        <SelectItem class="text-xs text-text focus:bg-accent/10 focus:text-text data-[state=checked]:bg-accent/10" value="plan">Plan</SelectItem>
      </SelectContent>
    </Select>

    <!-- Model selector with tree-style dropdown -->
    <ModelSelector
      v-model="localModel"
      :disabled="!isRuntimeAllowed('model') && editingSession"
      @update:model-value="emitUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { sessionOptionsRegistry, type SessionOption } from '../../composer/sessionOptionsRegistry'
import ModelSelector from './ModelSelector.vue'
import { useModelsStore } from '../../stores/models'

const modelsStore = useModelsStore()

const props = withDefaults(defineProps<{
  options?: Record<string, unknown>
  editingSession?: boolean // false = creating new session
}>(), {
  options: () => ({ mode: 'build', model: '' }),
  editingSession: true
})

const emit = defineEmits<{
  'update:options': [options: Record<string, unknown>]
}>()

const localMode = ref<string>((props.options?.mode as string) || 'build')
const localModel = ref<string>((props.options?.model as string) || modelsStore.selectedModel || '')

// 初始化时从 modelsStore.selectedModel 获取默认值
onMounted(() => {
  if (!props.options?.model && modelsStore.selectedModel) {
    localModel.value = modelsStore.selectedModel
  }
})

// 监听 modelsStore.selectedModel 变化
watch(() => modelsStore.selectedModel, (newModel) => {
  if (newModel && !props.options?.model) {
    localModel.value = newModel
  }
})

// Check if registry has model options
const hasModels = computed(() => {
  const modelOpt = sessionOptionsRegistry.model as SessionOption<string>
  return modelOpt && modelOpt.options && modelOpt.options.length > 0
})

// Check if option is allowed at runtime
function isRuntimeAllowed(key: string): boolean {
  const opt = sessionOptionsRegistry[key] as SessionOption
  return opt?.allowed?.includes('runtime') ?? false
}

// Sync local values with props
watch(() => props.options, (newOpts) => {
  if (newOpts?.mode) localMode.value = newOpts.mode as string
  if (newOpts?.model) localModel.value = newOpts.model as string
}, { deep: true })

function emitUpdate() {
  emit('update:options', {
    mode: localMode.value,
    model: localModel.value
  })
}
</script>