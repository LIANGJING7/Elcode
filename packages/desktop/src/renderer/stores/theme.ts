// packages/desktop/src/renderer/stores/theme.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'dark' | 'light'

const codeThemeMap: Record<Theme, string> = {
  dark: 'github-dark',
  light: 'github-light'
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('dark')

  async function loadTheme() {
    try {
      const saved = await window.desktop.config.get('theme')
      console.log('[ThemeStore] Loaded theme from config:', saved)
      if (saved === 'light' || saved === 'dark') {
        theme.value = saved
      }
    } catch (e) {
      console.log('[ThemeStore] No saved theme, using default')
    }
    applyTheme()
    updateTitleBarOverlay(theme.value)
  }

  async function setTheme(newTheme: Theme) {
    try {
      theme.value = newTheme
      await window.desktop.config.set('theme', newTheme)
      await window.desktop.config.set('codeTheme', codeThemeMap[newTheme])
      applyTheme()
      updateTitleBarOverlay(newTheme)
    } catch (e) {
      console.error('[ThemeStore] Failed to set theme:', e)
    }
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  function updateTitleBarOverlay(theme: Theme) {
    try {
      if (theme === 'light') {
        window.desktop.window.setTitleBarOverlay({
          color: '#f8f7f5',
          symbolColor: '#37352f'
        })
      } else {
        window.desktop.window.setTitleBarOverlay({
          color: '#202020',
          symbolColor: '#a8a4a0'
        })
      }
    } catch (e) {
      console.warn('[ThemeStore] Failed to update title bar overlay:', e)
    }
  }

  return {
    theme,
    loadTheme,
    setTheme,
    applyTheme
  }
})