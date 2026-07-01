<template>
  <div class="settings-view flex h-full">
    <!-- Settings content (main area) -->
    <div class="settings-content flex-1 overflow-hidden" :class="section === 'models' || section === 'skills' ? '' : 'p-6 overflow-y-auto'">
      <div :class="containerClass">
        <SettingsAppearance v-if="section === 'appearance'" />
        <SettingsModels v-else-if="section === 'models'" />
        <SettingsMcp v-else-if="section === 'mcp'" />
        <SettingsSkills v-else-if="section === 'skills'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../../stores/ui'
import SettingsAppearance from './SettingsAppearance.vue'
import SettingsModels from './SettingsModels.vue'
import SettingsMcp from './SettingsMcp.vue'
import SettingsSkills from './SettingsSkills.vue'

const ui = useUiStore()

const section = computed(() => ui.settingsSection)

const containerClass = computed(() => {
  if (section.value === 'models' || section.value === 'skills') {
    return 'h-full'
  }
  return 'max-w-xl mx-auto'
})
</script>

<style scoped>
.settings-view {
  min-height: 100%;
}
</style>
