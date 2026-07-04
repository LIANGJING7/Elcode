<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  spinner?: boolean
  defaultCollapsed?: boolean
}>(), { defaultCollapsed: true })

const emit = defineEmits<{ toggle: [expanded: boolean] }>()
const expanded = ref(!props.defaultCollapsed)

const toggleExpand = () => {
  expanded.value = !expanded.value
  emit('toggle', expanded.value)
}
</script>

<template>
  <div class="collapsible-panel border-l-2 border-border ml-2 pl-4">
    <div class="panel-header flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-bg-surface" @click="toggleExpand">
      <svg class="w-3 h-3 text-text-muted transition-transform" :class="{ 'rotate-90': expanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <span v-if="spinner" class="animate-pulse text-warning">●</span>
      <span v-else class="text-sm font-semibold">{{ title }}</span>
      <slot name="header-extra" />
    </div>
    <div v-if="expanded" class="panel-body mt-2 mb-2">
      <slot name="body" />
    </div>
  </div>
</template>

<style scoped>
.animate-pulse { animation: icon-pulse 1.5s ease-in-out infinite; }
@keyframes icon-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>