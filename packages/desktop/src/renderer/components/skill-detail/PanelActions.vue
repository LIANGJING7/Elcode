<template>
  <div class="panel-actions flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
    <!-- View mode actions -->
    <template v-if="mode === 'view'">
      <button
        class="action-btn px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
        @click="emit('edit')"
      >
        Edit
      </button>
      
      <button
        class="action-btn px-3 py-1.5 rounded bg-bg-hover hover:bg-bg-elevated border border-border text-text text-sm font-medium transition-colors"
        @click="emit('copy')"
      >
        Copy
      </button>
    </template>
    
    <!-- Edit mode actions -->
    <template v-else>
      <button
        class="action-btn px-3 py-1.5 rounded bg-bg-hover hover:bg-bg-elevated border border-border text-text text-sm font-medium transition-colors"
        @click="emit('cancel')"
        :disabled="saving"
      >
        Cancel
      </button>
      
      <button
        class="action-btn px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
        @click="emit('save')"
        :disabled="saving"
      >
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  mode: 'view' | 'edit'
  saving?: boolean
}>()

const emit = defineEmits<{
  'edit': []
  'copy': []
  'cancel': []
  'save': []
}>()
</script>

<style scoped>
.panel-actions {
  flex-shrink: 0;
}

.action-btn {
  cursor: pointer;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>