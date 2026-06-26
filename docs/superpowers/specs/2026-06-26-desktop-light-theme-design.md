# Desktop Light Theme Design

## Overview

Add a light theme to the desktop application alongside the existing dark theme. The light theme uses a pure white, minimalist black-white-gray style without colored accent.

## Requirements

- Add light theme option alongside existing dark theme
- Light theme style: pure white background, black-white-gray color scheme
- Theme switching: manual toggle in settings
- Code highlighting: automatically corresponds to UI theme (dark → github-dark, light → github-light)

## Design

### 1. CSS Variables

Add light theme variables in `global.css` using `[data-theme="light"]` selector:

```css
[data-theme="light"] {
  --color-bg: #ffffff;
  --color-bg-elevated: #fafafa;
  --color-bg-surface: #f5f5f5;
  --color-bg-hover: #e5e5e5;
  --color-bg-active: #d4d4d4;
  
  --color-text: #171717;
  --color-text-secondary: #525252;
  --color-text-muted: #737373;
  
  --color-border: #e5e5e5;
  --color-border-light: #d4d4d4;
  
  --color-accent: #171717;
  --color-accent-hover: #404040;
  --color-accent-muted: rgba(0, 0, 0, 0.06);
  --color-accent-glow: rgba(0, 0, 0, 0.08);
  
  --color-code-bg: #f5f5f5;
  
  /* shadcn-vue HSL variables */
  --background: 0 0% 100%;
  --foreground: 0 0% 9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 45%;
  --accent: 0 0% 9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 98%;
  --input: 0 0% 90%;
  --ring: 0 0% 9%;
}
```

### 2. Theme Store

Create `src/renderer/stores/theme.ts`:

```ts
import { defineStore } from 'pinia'

export type Theme = 'dark' | 'light'

const codeThemeMap: Record<Theme, string> = {
  dark: 'github-dark',
  light: 'github-light'
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: 'dark' as Theme
  }),
  
  actions: {
    async loadTheme() {
      const saved = await window.desktop.config.get('theme')
      if (saved === 'light' || saved === 'dark') {
        this.theme = saved
      }
      this.applyTheme()
    },
    
    async setTheme(theme: Theme) {
      this.theme = theme
      await window.desktop.config.set('theme', theme)
      await window.desktop.config.set('codeTheme', codeThemeMap[theme])
      this.applyTheme()
    },
    
    applyTheme() {
      document.documentElement.setAttribute('data-theme', this.theme)
    }
  }
})
```

### 3. Settings UI Update

Update `SettingsAppearance.vue` to use button-style theme toggle:

- Remove `ConfigSelect` for theme
- Add two-button toggle (深色/浅色)
- Use `useThemeStore()` for state management

### 4. Code Highlighting

- When theme changes, automatically update `codeTheme` config
- `CodeBlock.vue` watches for `codeTheme` changes and re-highlights

### 5. Other Style Adaptations

**color-scheme for native controls**:

```css
:root {
  color-scheme: dark;
}

[data-theme="light"] {
  color-scheme: light;
}
```

**Scrollbar styles**: Use CSS variables for scrollbar colors, which automatically adapt.

## Files to Modify

1. `src/renderer/styles/global.css` - Add light theme variables
2. `src/renderer/stores/theme.ts` - New file for theme state management
3. `src/renderer/components/settings/SettingsAppearance.vue` - Update theme selector
4. `src/renderer/App.vue` - Initialize theme on mount
5. `src/renderer/components/chat/CodeBlock.vue` - Watch for code theme changes

## Migration Notes

- Default theme remains `dark` for existing users
- Theme preference is persisted in config
- No changes to Tailwind config needed (uses CSS variables)