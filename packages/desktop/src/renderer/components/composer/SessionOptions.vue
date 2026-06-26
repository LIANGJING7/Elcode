<template>
  <div class="session-options flex items-center gap-2">
    <!-- Mode selector -->
    <select
      v-model="localMode"
      class="mode-select px-2 py-1 bg-bg-hover border border-border hover:border-border-light rounded text-text text-2xs font-medium outline-none cursor-pointer transition-all duration-fast appearance-none"
      style="background-image: url('data:image/svg+xml,...'); background-repeat: no-repeat; background-position: right 6px center; background-size: 12px; padding-right: 20px;"
      :disabled="!isRuntimeAllowed('mode') && editingSession"
      @change="emitUpdate"
    >
      <option value="build">Build</option>
      <option value="plan">Plan</option>
    </select>

    <!-- Model selector with tree-style dropdown -->
    <ModelSelector
      v-model="localModel"
      :disabled="!isRuntimeAllowed('model') && editingSession"
      @update:model-value="emitUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { sessionOptionsRegistry, type SessionOption } from '../../composer/sessionOptionsRegistry'
import ModelSelector from './ModelSelector.vue'

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
const localModel = ref<string>((props.options?.model as string) || '')

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

<style scoped>
.mode-select option {
  background-color: var(--color-bg-elevated);
  color: var(--color-text);
}
</style>