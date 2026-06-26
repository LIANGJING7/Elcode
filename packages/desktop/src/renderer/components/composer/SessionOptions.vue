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

    <!-- Model selector with provider grouping -->
    <select
      v-if="hasModels"
      v-model="localModel"
      class="model-select px-2 py-1 bg-bg-hover border border-border hover:border-border-light rounded text-text text-2xs font-medium outline-none cursor-pointer transition-all duration-fast appearance-none"
      :disabled="!isRuntimeAllowed('model') && editingSession"
      @change="emitUpdate"
    >
      <optgroup v-for="group in groupedModels" :key="group.provider" :label="group.provider">
        <option v-for="m in group.models" :key="m.value" :value="m.value">
          {{ m.name }}
        </option>
      </optgroup>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { sessionOptionsRegistry, type SessionOption } from '../../composer/sessionOptionsRegistry'

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

const modelOptions = computed(() => {
  const modelOpt = sessionOptionsRegistry.model as SessionOption<string>
  return modelOpt?.options || []
})

// Group models by provider (parse from label format "Provider / Model")
const groupedModels = computed(() => {
  const groups: { provider: string; models: { value: string; name: string }[] }[] = []
  const providerMap = new Map<string, { value: string; name: string }[]>()

  for (const opt of modelOptions.value) {
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
      // Handle ungrouped models (no provider prefix)
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
.mode-select option,
.model-select option,
.model-select optgroup {
  background-color: var(--color-bg-elevated);
  color: var(--color-text);
}

.model-select optgroup {
  font-weight: 600;
  color: var(--color-text-muted);
}
</style>