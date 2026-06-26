<script setup lang="ts">
import { useUiStore, type View } from '../../stores/ui'
import { navigationRegistry } from '../../navigation/navigationRegistry'

const ui = useUiStore()
const emit = defineEmits<{
  'select-nav': [view: Exclude<View, 'welcome' | 'chat' | 'settings'>]
  'enter-settings': []
}>()

const sorted = [...navigationRegistry].sort((a, b) => a.order - b.order)

// icon registry 里目前是字符串 key, 这里转成可见的 glyph
function iconGlyph(name: string): string {
  switch (name) {
    case 'sparkles': return '✦'
    case 'bolt': return '⚡'
    default: return '•'
  }
}
</script>

<template>
  <div class="sidebar-header p-3">
    <div class="brand w-8 h-8 rounded-lg bg-accent flex items-center justify-center mb-3">
      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    </div>

    <nav class="nav-list flex flex-col gap-0.5">
      <button
        v-for="item in sorted"
        :key="item.id"
        :data-nav-id="item.id"
        class="nav-button px-2 py-1.5 rounded text-sm text-text-secondary hover:bg-bg-tertiary transition-colors duration-fast text-left flex items-center gap-2"
        :class="{ 'is-active bg-bg-tertiary text-text': ui.view === item.view }"
        @click="emit('select-nav', item.view)"
      >
        <span class="nav-icon">{{ iconGlyph(item.icon) }}</span>
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <button
      data-sidebar-action="settings"
      class="settings-button mt-3 w-full px-2 py-1.5 rounded text-sm text-text-muted hover:bg-bg-tertiary flex items-center gap-2"
      @click="emit('enter-settings')"
    >
      <span>⚙</span>
      <span>Settings</span>
    </button>
  </div>
</template>
