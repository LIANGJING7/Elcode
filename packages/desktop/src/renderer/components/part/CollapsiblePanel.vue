<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  spinner?: boolean
  defaultCollapsed?: boolean
  expanded?: boolean  // Controlled mode
}>(), { defaultCollapsed: true })

const emit = defineEmits<{ toggle: [expanded: boolean] }>()

// Internal state for uncontrolled mode
const internalExpanded = ref(!props.defaultCollapsed)

// Use controlled mode if expanded prop is provided
const isControlled = () => props.expanded !== undefined

const expandedState = isControlled() ? props.expanded : internalExpanded.value

// Watch for changes in controlled mode
watch(() => props.expanded, (newVal) => {
  if (newVal !== undefined && newVal !== internalExpanded.value) {
    internalExpanded.value = newVal
  }
})

const toggleExpand = () => {
  const newState = !expandedState
  if (isControlled()) {
    emit('toggle', newState)
  } else {
    internalExpanded.value = newState
    emit('toggle', newState)
  }
}
</script>

<template>
  <div class="collapsible-panel border-l-2 border-border ml-2 pl-4">
    <div class="panel-header flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-bg-surface" @click="toggleExpand">
      <svg class="w-4 h-4 shrink-0 text-text-muted transition-transform" :class="{ 'rotate-90': expandedState }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <span v-if="spinner" class="animate-pulse text-warning">●</span>
      <!-- Custom header slot or default title -->
      <slot v-if="$slots.header" name="header" />
      <span v-else class="text-sm font-semibold">{{ title }}</span>
      <!-- Extra actions (don't trigger toggle) -->
      <slot v-if="$slots['header-extra']" name="header-extra" @click.stop />
    </div>
    <div v-if="expandedState" class="panel-body mt-2 mb-2">
      <slot name="body" />
    </div>
  </div>
</template>

<style scoped>
.animate-pulse { animation: icon-pulse 1.5s ease-in-out infinite; }
@keyframes icon-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>