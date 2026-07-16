<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../../stores/ui'
import { useThemeStore } from '../../stores/theme'
import { Sun, Moon, Settings } from 'lucide-vue-next'

const ui = useUiStore()
const themeStore = useThemeStore()
const emit = defineEmits<{
  'enter-settings': []
  'exit-settings': []
}>()

const isSettingsMode = computed(() => ui.view === 'settings')
const isDark = computed(() => themeStore.theme === 'dark')

function toggleTheme() {
  themeStore.setTheme(isDark.value ? 'light' : 'dark').catch((e) => {
    console.error('[SidebarFooter] Failed to toggle theme:', e)
  })
}
</script>

<template>
  <div v-if="!isSettingsMode" class="sidebar-footer px-3 py-2 border-t border-border/60 flex items-center gap-2">
    <button
      class="flex-1 flex items-center justify-center py-1.5 rounded-md text-text-muted hover:bg-bg-tertiary transition-colors duration-fast"
      title="切换主题"
      @click="toggleTheme"
    >
      <Sun v-if="isDark" class="w-4 h-4" />
      <Moon v-else class="w-4 h-4" />
    </button>

    <div class="w-px h-4 bg-border/60" />

    <button
      data-sidebar-action="settings"
      class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm text-text-muted hover:bg-bg-tertiary transition-colors duration-fast"
      @click="emit('enter-settings')"
    >
      <Settings class="w-4 h-4" />
      <span>设置</span>
    </button>
  </div>
</template>