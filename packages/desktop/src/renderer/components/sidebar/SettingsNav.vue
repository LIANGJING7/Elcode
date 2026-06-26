<script setup lang="ts">
import { useUiStore, type SettingsSection } from '../../stores/ui'

// 设置态侧栏导航: 4 个设置分区 + 返回. 点分区只设 uiStore.settingsSection,
// 不动 view(仍是 settings); 主区内容由 SettingsView 按 settingsSection 渲染(phase 6).
const ui = useUiStore()
const sections: { id: SettingsSection; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'models', label: 'Models' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'about', label: 'About' },
]
</script>

<template>
  <div class="settings-nav p-3 flex flex-col gap-2">
    <button
      data-testid="back"
      class="back-button flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text-secondary hover:bg-bg-tertiary transition-colors duration-fast"
      @click="ui.exitSettings()"
    >
      <span>←</span>
      <span>返回</span>
    </button>

    <ul class="space-y-0.5">
      <li v-for="sec in sections" :key="sec.id">
        <button
          :data-settings-section="sec.id"
          class="section-button w-full text-left px-2 py-1.5 rounded text-sm transition-colors duration-fast"
          :class="ui.settingsSection === sec.id
            ? 'is-active bg-bg-tertiary text-text font-medium'
            : 'text-text-secondary hover:bg-bg-tertiary hover:text-text'"
          @click="ui.settingsSection = sec.id"
        >
          {{ sec.label }}
        </button>
      </li>
    </ul>
  </div>
</template>
