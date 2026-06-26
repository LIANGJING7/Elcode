<template>
  <aside class="sidebar w-sidebar bg-bg-elevated border-r border-border flex flex-col select-none">
    <!-- 设置态: 中部完全替换为 SettingsNav (导航/工作区/会话让位给设置分区列表).
         SidebarHeader 只在正常态出现; Footer 两态常驻(其返回按钮即设置态退出入口). -->
    <SettingsNav v-if="isSettingsMode" />

    <!-- 常规态: Header + 工作区/会话 Tabs.
         工作区选择与会话创建/选择已下沉到 SidebarTabs 子组件(各自直连 store),
         故 Sidebar 不再向父级 emit 这些事件. -->
    <template v-else>
      <SidebarHeader
        @select-nav="handleSelectNav"
        @enter-settings="ui.enterSettings()"
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

// 导航按钮 → 切主区 view (uiStore 单一 source of truth)
function handleSelectNav(view: Exclude<View, 'welcome' | 'chat' | 'settings'>) {
  ui.setView(view)
}
</script>
