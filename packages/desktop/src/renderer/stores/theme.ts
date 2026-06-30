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
      if (saved === 'light' || saved === 'dark') {
        theme.value = saved
      }
    } catch {
      // Config may not have theme key set
    }
    applyTheme()
    updateTitleBarOverlay(theme.value)
  }

  async function setTheme(newTheme: Theme) {
    theme.value = newTheme
    await window.desktop.config.set('theme', newTheme)
    await window.desktop.config.set('codeTheme', codeThemeMap[newTheme])
    applyTheme()
    updateTitleBarOverlay(newTheme)
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  function updateTitleBarOverlay(theme: Theme) {
    if (theme === 'light') {
      window.desktop.window.setTitleBarOverlay({
        color: '#f8f7f5',
        symbolColor: '#37352f'
      })
    } else {
      window.desktop.window.setTitleBarOverlay({
        color: '#191919',
        symbolColor: '#a8a4a0'
      })
    }
  }

  return {
    theme,
    loadTheme,
    setTheme,
    applyTheme
  }
})