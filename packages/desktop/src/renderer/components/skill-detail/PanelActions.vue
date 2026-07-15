<template>
  <div class="panel-actions flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
    <button
      class="action-btn px-3 py-1.5 rounded bg-bg-hover hover:bg-bg-elevated border border-border text-text text-sm font-medium transition-colors"
      @click="emit('copy')"
    >
      Copy
    </button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  'copy': []
}>()
</script>

<style scoped>
.panel-actions {
  flex-shrink: 0;
}

.action-btn {
  cursor: pointer;
}
</style>