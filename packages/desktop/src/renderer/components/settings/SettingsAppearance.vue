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

      <!-- Font size -->
      <ConfigSelect
        label="Font Size"
        :model-value="fontSize"
        :options="fontSizeOptions"
        config-key="fontSize"
        :directory="directory"
        @update:model-value="fontSize = $event"
      />

      <!-- Font family -->
      <div>
        <label class="text-xs text-text-muted block mb-1">Font Family</label>
        <input
          type="text"
          :value="fontFamily"
          class="w-full px-3 py-2 rounded-lg bg-bg-hover border border-border text-text text-sm outline-none focus:border-accent"
          placeholder="system-ui, sans-serif"
          @change="handleFontFamilyChange"
        />
      </div>

      <!-- Mono font family -->
      <div>
        <label class="text-xs text-text-muted block mb-1">Monospace Font</label>
        <input
          type="text"
          :value="monoFontFamily"
          class="w-full px-3 py-2 rounded-lg bg-bg-hover border border-border text-text text-sm outline-none focus:border-accent"
          placeholder="ui-monospace, monospace"
          @change="handleMonoFontChange"
        />
      </div>

      <!-- Code theme -->
      <ConfigSelect
        label="Code Theme"
        :model-value="codeTheme"
        :options="codeThemeOptions"
        config-key="codeTheme"
        :directory="directory"
        @update:model-value="codeTheme = $event"
      />
    </div>
  </div>
</template>

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
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' }
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

<style scoped>
.settings-section {
  /* Section styling */
}
</style>