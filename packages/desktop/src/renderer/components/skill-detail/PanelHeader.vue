<template>
  <div class="panel-header flex items-center justify-between px-4 py-3 border-b border-border">
    <h3 class="text-sm font-medium text-text truncate">
      {{ title }}
    </h3>
    
    <div class="flex items-center gap-2">
      <button
        class="mode-btn px-2 py-1 rounded text-xs transition-colors"
        :class="mode === 'view' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-hover'"
        @click="emit('switch-mode', 'view')"
      >
        View
      </button>
      
      <button
        class="mode-btn px-2 py-1 rounded text-xs transition-colors"
        :class="mode === 'edit' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-hover'"
        @click="emit('switch-mode', 'edit')"
      >
        Edit
      </button>
      
      <button
        class="close-btn w-6 h-6 flex items-center justify-center rounded hover:bg-bg-hover text-text-muted transition-colors"
        @click="emit('close')"
        title="Close panel"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  skillName: string
  skillLocation?: string
  mode: 'view' | 'edit'
}>()

const emit = defineEmits<{
  'switch-mode': [mode: 'view' | 'edit']
  'close': []
}>()

const title = computed(() => {
  if (props.mode === 'edit' && props.skillLocation) {
    // Show filename in edit mode
    const parts = props.skillLocation.split('/')
    return parts[parts.length - 1] || props.skillName
  }
  return props.skillName
})
</script>

<style scoped>
.panel-header {
  flex-shrink: 0;
}

.mode-btn {
  cursor: pointer;
}

.close-btn {
  font-size: 1.25rem;
  cursor: pointer;
}
</style>