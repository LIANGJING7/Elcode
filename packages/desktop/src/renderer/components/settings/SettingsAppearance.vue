<template>
  <div class="settings-section">
    <h2 class="text-lg font-medium text-text mb-4">Appearance</h2>

    <div class="space-y-4">
      <!-- Theme selector -->
      <div>
        <label class="text-xs text-text-muted block mb-2">Theme</label>
        <div class="flex gap-2">
          <button
            v-for="opt in themeOptions"
            :key="opt.value"
            class="flex-1 px-4 py-2 rounded-lg border text-sm transition-colors duration-fast"
            :class="currentTheme === opt.value
              ? 'bg-accent text-accent-foreground border-accent'
              : 'bg-bg-surface border-border text-text hover:bg-bg-hover'"
            @click="handleThemeChange(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '../../stores/theme'

const themeStore = useThemeStore()

const currentTheme = computed(() => themeStore.theme)

const themeOptions = [
  { value: 'dark', label: '暗色' },
  { value: 'light', label: '亮色' }
]

function handleThemeChange(theme: 'dark' | 'light') {
  themeStore.setTheme(theme)
}
</script>

<style scoped>
.settings-section {
  /* Section styling */
}
</style>
