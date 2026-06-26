# Desktop Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light theme to the desktop application with manual toggle in settings.

**Architecture:** CSS variables switching via `data-theme` attribute on root element. Theme state managed in Pinia store, persisted via config API. Code highlighting automatically corresponds to UI theme.

**Tech Stack:** Vue 3, Pinia, Tailwind CSS v4, Shiki

---

## File Structure

- Create: `packages/desktop/src/renderer/stores/theme.ts`
- Modify: `packages/desktop/src/renderer/styles/global.css`
- Modify: `packages/desktop/src/renderer/components/settings/SettingsAppearance.vue`
- Modify: `packages/desktop/src/renderer/App.vue`
- Modify: `packages/desktop/src/renderer/components/chat/CodeBlock.vue`

---

### Task 1: Create Theme Store

**Files:**
- Create: `packages/desktop/src/renderer/stores/theme.ts`

- [ ] **Step 1: Write theme store implementation**

```ts
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
  }

  async function setTheme(newTheme: Theme) {
    theme.value = newTheme
    await window.desktop.config.set('theme', newTheme)
    await window.desktop.config.set('codeTheme', codeThemeMap[newTheme])
    applyTheme()
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  return {
    theme,
    loadTheme,
    setTheme,
    applyTheme
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/stores/theme.ts
git commit -m "feat(theme): add theme store for dark/light switching"
```

---

### Task 2: Add Light Theme CSS Variables

**Files:**
- Modify: `packages/desktop/src/renderer/styles/global.css`

- [ ] **Step 1: Add light theme variables after existing `@theme` block**

Add after line 79 (after the `@theme` block closing brace):

```css
/* Light theme overrides */
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

  --color-success: #16a34a;
  --color-success-muted: rgba(22, 163, 74, 0.08);
  --color-warning: #ca8a04;
  --color-warning-muted: rgba(202, 138, 4, 0.08);
  --color-error: #dc2626;
  --color-error-muted: rgba(220, 38, 38, 0.08);

  --color-code-bg: #f5f5f5;

  /* shadcn-vue HSL variables for light theme */
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

  /* Shadows for light theme */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.16);
}

[data-theme="light"] {
  color-scheme: light;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/styles/global.css
git commit -m "feat(theme): add light theme CSS variables"
```

---

### Task 3: Update Settings Appearance Component

**Files:**
- Modify: `packages/desktop/src/renderer/components/settings/SettingsAppearance.vue`

- [ ] **Step 1: Replace theme selector section**

Replace lines 6-17 (theme placeholder section) with:

```vue
      <!-- Theme selector -->
      <div>
        <label class="text-xs text-text-muted block mb-2">主题</label>
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
```

- [ ] **Step 2: Update script section**

Replace the script section (lines 66-134) with:

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useWorkspaceStore } from '../../stores/workspace'
import { useThemeStore } from '../../stores/theme'
import ConfigSelect from './ConfigSelect.vue'

const workspaceStore = useWorkspaceStore()
const themeStore = useThemeStore()
const directory = workspaceStore.currentWorkspace?.path

const currentTheme = computed(() => themeStore.theme)

const themeOptions = [
  { value: 'dark', label: '深色' },
  { value: 'light', label: '浅色' }
]

const fontSize = ref('14')
const fontFamily = ref('')
const monoFontFamily = ref('')
const codeTheme = ref('github-dark')

const fontSizeOptions = [
  { value: '12', label: '12px' },
  { value: '14', label: '14px' },
  { value: '16', label: '16px' },
  { value: '18', label: '18px' }
]

const codeThemeOptions = [
  { value: 'github-dark', label: 'GitHub Dark' },
  { value: 'github-light', label: 'GitHub Light' },
  { value: 'one-dark', label: 'One Dark' },
  { value: 'one-light', label: 'One Light' },
  { value: 'vitesse-dark', label: 'Vitesse Dark' },
  { value: 'vitesse-light', label: 'Vitesse Light' }
]

function handleThemeChange(theme: 'dark' | 'light') {
  themeStore.setTheme(theme)
}

onMounted(async () => {
  // Load current values from config
  try {
    const configFontSize = await window.desktop.config.get('fontSize', directory)
    if (configFontSize) fontSize.value = String(configFontSize)

    const configFontFamily = await window.desktop.config.get('fontFamily', directory)
    if (configFontFamily) fontFamily.value = String(configFontFamily)

    const configMonoFont = await window.desktop.config.get('monoFontFamily', directory)
    if (configMonoFont) monoFontFamily.value = String(configMonoFont)

    const configCodeTheme = await window.desktop.config.get('codeTheme', directory)
    if (configCodeTheme) codeTheme.value = String(configCodeTheme)
  } catch {
    // Config may not have these keys set
  }
})

async function handleFontFamilyChange(event: Event) {
  const value = (event.target as HTMLInputElement).value
  fontFamily.value = value
  await window.desktop.config.set('fontFamily', value, directory)
}

async function handleMonoFontChange(event: Event) {
  const value = (event.target as HTMLInputElement).value
  monoFontFamily.value = value
  await window.desktop.config.set('monoFontFamily', value, directory)
}
</script>
```

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/components/settings/SettingsAppearance.vue
git commit -m "feat(theme): update settings appearance with theme toggle buttons"
```

---

### Task 4: Initialize Theme in App.vue

**Files:**
- Modify: `packages/desktop/src/renderer/App.vue`

- [ ] **Step 1: Import theme store**

Add import after line 106 (after `import { useModelsStore } from './stores/models'`):

```ts
import { useThemeStore } from './stores/theme'
```

- [ ] **Step 2: Initialize theme store**

Add after line 113 (after `const modelsStore = useModelsStore()`):

```ts
const themeStore = useThemeStore()
```

- [ ] **Step 3: Load theme on mount**

Add after line 172 (inside `onMounted` async function, after `cleanupListeners = ...`):

```ts
await themeStore.loadTheme()
```

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/renderer/App.vue
git commit -m "feat(theme): initialize theme on app mount"
```

---

### Task 5: Update CodeBlock for Dynamic Theme

**Files:**
- Modify: `packages/desktop/src/renderer/components/chat/CodeBlock.vue`

- [ ] **Step 1: Update CodeBlock to support dynamic theme switching**

Replace entire file content with:

```vue
<script setup lang="ts">
import { ref, watchEffect, onMounted, computed } from 'vue'
import { createHighlighter, type Highlighter } from 'shiki'
import { useThemeStore } from '../../stores/theme'

const props = defineProps<{ code: string; lang: string }>()

const themeStore = useThemeStore()
const html = ref('')
let hl: Highlighter | null = null

const codeTheme = computed(() => themeStore.theme === 'light' ? 'github-light' : 'github-dark')

onMounted(async () => {
  try {
    hl = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [props.lang],
    })
    highlight()
  } catch {
    // 语言不支持时 fallback 到 plain
    html.value = `<pre class="shiki">${escapeHtml(props.code)}</pre>`
  }
})

watchEffect(() => {
  if (hl) highlight()
})

function highlight() {
  if (!hl) return
  try {
    html.value = hl.codeToHtml(props.code, { lang: props.lang, theme: codeTheme.value })
  } catch {
    html.value = `<pre class="shiki">${escapeHtml(props.code)}</pre>`
  }
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return s.replace(/[&<>"']/g, c => map[c])
}
</script>

<template>
  <div class="code-block relative bg-bg-surface rounded border border-border my-2">
    <!-- 语言标签 -->
    <span
      data-testid="lang-label"
      class="absolute top-2 right-2 text-xs text-text-muted px-2 py-1 rounded bg-bg-surface"
    >
      {{ lang }}
    </span>
    <!-- Shiki 渲染的 HTML -->
    <code class="block p-4 overflow-x-auto text-sm" v-html="html" />
  </div>
</template>

<style scoped>
.code-block :deep(.shiki) {
  background: transparent !important;
  padding: 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/components/chat/CodeBlock.vue
git commit -m "feat(theme): update CodeBlock to support dynamic theme switching"
```

---

### Task 6: Manual Testing

- [ ] **Step 1: Start development server**

Run: `cd packages/desktop && bun run dev`

Expected: App starts in dark theme

- [ ] **Step 2: Navigate to Settings → Appearance**

Expected: Theme toggle buttons visible (深色/浅色)

- [ ] **Step 3: Click "浅色" button**

Expected:
- UI switches to light theme (white background, dark text)
- Code blocks switch to github-light highlighting
- Setting persists after restart

- [ ] **Step 4: Click "深色" button**

Expected:
- UI switches back to dark theme
- Code blocks switch to github-dark highlighting

- [ ] **Step 5: Restart app**

Run: Close and restart `bun run dev`

Expected: App loads with last selected theme

---

### Task 7: Final Commit

- [ ] **Step 1: Squash commits if needed, create final commit message**

```bash
git log --oneline -5
# If desired, rebase/squash into single commit:
git rebase -i HEAD~5
# Final commit message: "feat(theme): add light theme with manual toggle"
```