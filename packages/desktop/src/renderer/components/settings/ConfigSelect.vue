<template>
  <div class="config-select">
    <label class="text-xs text-text-muted block mb-1">{{ label }}</label>
    <select
      :value="modelValue"
      :disabled="disabled"
      class="w-full px-3 py-2 rounded-lg bg-bg-hover border border-border hover:border-border-light text-text text-sm outline-none cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      @change="handleChange"
    >
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import type { SettingsSection } from '../../stores/ui'

interface SelectOption {
  value: string
  label: string
}

const props = withDefaults(defineProps<{
  label: string
  modelValue: string
  options: SelectOption[]
  disabled?: boolean
  configKey?: string
  directory?: string
}>(), {
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

async function handleChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('update:modelValue', value)
  
  // If configKey is provided, persist to config
  if (props.configKey) {
    await window.desktop.config.set(props.configKey, value, props.directory)
  }
}
</script>

<style scoped>
.config-select select {
  appearance: none;
  background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>');
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  padding-right: 32px;
}

.config-select select option {
  background-color: var(--color-bg-elevated);
  color: var(--color-text);
}
</style>