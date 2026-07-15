<template>
  <div class="panel-header flex items-center justify-between px-4 py-3 border-b border-border">
    <h3 class="text-sm font-medium text-text truncate">
      {{ skillName }}
    </h3>
    
    <button
      class="close-btn w-6 h-6 flex items-center justify-center rounded hover:bg-bg-hover text-text-muted transition-colors"
      @click="emit('close')"
      title="Close panel"
    >
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  skillName: string
  skillLocation?: string
}>()

const emit = defineEmits<{
  'close': []
}>()
</script>

<style scoped>
.panel-header {
  flex-shrink: 0;
}

.close-btn {
  font-size: 1.25rem;
  cursor: pointer;
}
</style>