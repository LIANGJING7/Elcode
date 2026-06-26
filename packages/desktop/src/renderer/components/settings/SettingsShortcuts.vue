<template>
  <div class="settings-section">
    <h2 class="text-lg font-medium text-text mb-4">Keyboard Shortcuts</h2>

    <div class="space-y-3">
      <div
        v-for="shortcut in shortcuts"
        :key="shortcut.key"
        class="flex items-center justify-between p-3 rounded-lg bg-bg-hover border border-border"
      >
        <span class="text-sm text-text">{{ shortcut.description }}</span>
        <kbd class="px-2 py-1 rounded bg-bg-elevated text-2xs text-text-muted font-mono">
          {{ shortcut.key }}
        </kbd>
      </div>
    </div>

    <p class="text-2xs text-text-muted mt-4">
      Shortcuts are predefined and cannot be customized in this version.
    </p>
  </div>
</template>

<script setup lang="ts">
const shortcuts = [
  { key: 'Ctrl/Cmd + B', description: 'Toggle sidebar' },
  { key: 'Ctrl/Cmd + N', description: 'New session' },
  { key: 'Enter', description: 'Send message' },
  { key: 'Shift + Enter', description: 'New line in message' },
  { key: '↑ / ↓', description: 'Navigate message history' },
  { key: 'Esc', description: 'Close panel / interrupt stream' }
]
</script>

<style scoped>
.settings-section {
  /* Section styling */
}
</style>