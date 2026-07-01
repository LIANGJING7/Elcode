<script setup lang="ts">
import { Sparkles, Zap } from 'lucide-vue-next'
import { useUiStore, type View } from '../../stores/ui'
import { navigationRegistry } from '../../navigation/navigationRegistry'

const ui = useUiStore()
const emit = defineEmits<{
  'select-nav': [view: Exclude<View, 'welcome' | 'chat' | 'settings'>]
  'enter-settings': [section?: string]
}>()

const sorted = [...navigationRegistry].sort((a, b) => a.order - b.order)

// icon mapping
function iconComponent(name: string) {
  switch (name) {
    case 'sparkles': return Sparkles
    case 'bolt': return Zap
    default: return null
  }
}

function handleClick(item: typeof navigationRegistry[0]) {
  if (item.enterSettings) {
    emit('enter-settings', item.settingsSection)
  } else {
    emit('select-nav', item.view)
  }
}
</script>

<template>
  <div class="sidebar-header px-3 pb-3 pt-0">
    <nav class="nav-list flex flex-col gap-0.5">
      <Button
        v-for="item in sorted"
        :key="item.id"
        :data-nav-id="item.id"
        variant="ghost"
        class="flex items-center justify-start w-full gap-2 px-2 py-1.5 text-sm text-left"
        :class="{ 'bg-accent/10 text-accent': item.enterSettings ? (ui.view === 'settings' && ui.settingsSection === item.settingsSection) : (ui.view === item.view) }"
        @click="handleClick(item)"
      >
        <component :is="iconComponent(item.icon)" v-if="iconComponent(item.icon)" class="w-4 h-4 shrink-0" />
        <span class="truncate">{{ item.label }}</span>
      </Button>
    </nav>
  </div>
</template>
