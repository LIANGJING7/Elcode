<template>
  <aside class="sidebar w-sidebar bg-bg-elevated border-r border-border flex flex-col select-none h-full">
    <!-- 设置态: 中部完全替换为 SettingsNav -->
    <SettingsNav v-if="isSettingsMode" />

    <!-- 常规态: Header + 工作区/会话 Tabs -->
    <template v-else>
      <SidebarHeader
        @select-nav="handleSelectNav"
        @enter-settings="handleEnterSettings"
      />

      <SidebarTabs />
    </template>

    <SidebarFooter
      @enter-settings="ui.enterSettings()"
      @exit-settings="ui.exitSettings()"
    />
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SidebarHeader from './sidebar/SidebarHeader.vue'
import SidebarFooter from './sidebar/SidebarFooter.vue'
import SidebarTabs from './sidebar/SidebarTabs.vue'
import SettingsNav from './sidebar/SettingsNav.vue'
import { useUiStore, type View } from '../stores/ui'

const ui = useUiStore()
const isSettingsMode = computed(() => ui.view === 'settings')

function handleSelectNav(view: Exclude<View, 'welcome' | 'chat' | 'settings'>) {
  ui.setView(view)
}

function handleEnterSettings(section?: string) {
  ui.enterSettings()
  if (section) {
    ui.settingsSection = section as any
  }
}
</script>
