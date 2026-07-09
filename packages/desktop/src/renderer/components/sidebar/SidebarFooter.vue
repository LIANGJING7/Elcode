<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../../stores/ui'
import { useThemeStore } from '../../stores/theme'

const ui = useUiStore()
const themeStore = useThemeStore()
const emit = defineEmits<{
  'enter-settings': []
  'exit-settings': []
}>()

const isSettingsMode = computed(() => ui.view === 'settings')
const isDark = computed(() => themeStore.theme === 'dark')

function toggleTheme() {
  themeStore.setTheme(isDark.value ? 'light' : 'dark')
}
</script>

<template>
  <div class="sidebar-footer px-3 py-2 border-t border-border/60 flex items-center gap-1">
    <button
      class="flex-1 flex items-center justify-center py-1.5 rounded-md text-sm text-text-muted hover:bg-bg-tertiary transition-colors duration-fast"
      title="切换主题"
      @click="toggleTheme"
    >
      <span class="text-base">{{ isDark ? '☀' : '☾' }}</span>
    </button>

    <button
      v-if="!isSettingsMode"
      data-sidebar-action="settings"
      class="flex-1 flex items-center justify-center py-1.5 rounded-md text-sm text-text-muted hover:bg-bg-tertiary transition-colors duration-fast"
      title="设置"
      @click="emit('enter-settings')"
    >
      <span>⚙</span>
    </button>
  </div>
</template>
