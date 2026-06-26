<template>
  <div class="settings-view flex h-full">
    <!-- Settings navigation (left side, from SettingsNav in sidebar) -->
    <!-- Note: Sidebar already shows SettingsNav when view='settings', 
         so this view just shows the content section -->
    
    <!-- Settings content (main area) -->
    <div class="settings-content flex-1 p-6 overflow-y-auto">
      <div class="max-w-xl mx-auto">
        <SettingsAppearance v-if="section === 'appearance'" />
        <SettingsModels v-else-if="section === 'models'" />
        <SettingsShortcuts v-else-if="section === 'shortcuts'" />
        <SettingsAbout v-else-if="section === 'about'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../../stores/ui'
import SettingsAppearance from './SettingsAppearance.vue'
import SettingsModels from './SettingsModels.vue'
import SettingsShortcuts from './SettingsShortcuts.vue'
import SettingsAbout from './SettingsAbout.vue'

const ui = useUiStore()

const section = computed(() => ui.settingsSection)
</script>

<style scoped>
.settings-view {
  min-height: 100%;
}
</style>