<template>
  <div class="config-select space-y-1">
    <Label class="text-xs text-muted-foreground">{{ label }}</Label>
    <Select
      :model-value="modelValue"
      :disabled="disabled"
      @update:model-value="handleChange"
    >
      <SelectTrigger class="w-full">
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

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

async function handleChange(value: string) {
  emit('update:modelValue', value)
  
  // If configKey is provided, persist to config
  if (props.configKey) {
    await window.desktop.config.set(props.configKey, value, props.directory)
  }
}
</script>