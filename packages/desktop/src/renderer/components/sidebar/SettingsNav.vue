<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-vue-next'
import { useUiStore, type SettingsSection } from '../../stores/ui'

// 设置态侧栏导航: 4 个设置分区 + 返回. 点分区只设 uiStore.settingsSection,
// 不动 view(仍是 settings); 主区内容由 SettingsView 按 settingsSection 渲染(phase 6).
const ui = useUiStore()
const sections: { id: SettingsSection; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'models', label: '模型' },
  { id: 'mcp', label: 'MCP' },
  { id: 'skills', label: 'Skills' },
]
</script>

<template>
  <div class="settings-nav p-3 flex flex-col gap-2">
    <Button
      variant="ghost"
      data-testid="back"
      class="justify-start gap-2 px-2 py-1.5 text-sm"
      @click="ui.exitSettings()"
    >
      <ArrowLeft class="w-4 h-4" />
      <span>返回工作区</span>
    </Button>

    <ul class="space-y-0.5">
      <li v-for="sec in sections" :key="sec.id">
        <Button
          variant="ghost"
          :data-settings-section="sec.id"
          class="w-full justify-start px-2 py-1.5 text-sm"
          :class="ui.settingsSection === sec.id ? 'bg-accent/10 text-accent' : ''"
          @click="ui.settingsSection = sec.id"
        >
          {{ sec.label }}
        </Button>
      </li>
    </ul>
  </div>
</template>
