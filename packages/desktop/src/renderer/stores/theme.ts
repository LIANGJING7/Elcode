// packages/desktop/src/renderer/stores/theme.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'dark' | 'light'

const codeThemeMap: Record<Theme, string> = {
  dark: 'github-dark',
  light: 'github-light'
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('light')

  async function loadTheme() {
    try {
      const globalState = await window.desktop.globalState.get()
      const saved = globalState.theme as Theme | undefined
      console.log('[ThemeStore] Loaded theme from globalState:', saved)
      if (saved === 'light' || saved === 'dark') {
        theme.value = saved
      }
    } catch (e) {
      console.log('[ThemeStore] No saved theme, using default:', e)
    }
    applyTheme()
    updateTitleBarOverlay(theme.value)
  }

  async function setTheme(newTheme: Theme) {
    try {
      theme.value = newTheme
      const globalState = await window.desktop.globalState.get()
      await window.desktop.globalState.set({
        ...globalState,
        theme: newTheme,
        codeTheme: codeThemeMap[newTheme]
      })
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