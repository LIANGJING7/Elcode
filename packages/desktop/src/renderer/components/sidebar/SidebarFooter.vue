<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../../stores/ui'

const ui = useUiStore()
const emit = defineEmits<{
  'enter-settings': []
  'exit-settings': []
}>()

const isSettingsMode = computed(() => ui.view === 'settings')
</script>

<template>
  <div v-if="!isSettingsMode" class="sidebar-footer px-3 py-2 border-t border-border/60">
    <button
      data-sidebar-action="settings"
      class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text-muted hover:bg-bg-tertiary transition-colors duration-fast"
      @click="emit('enter-settings')"
    >
      <span>⚙</span>
      <span>设置</span>
    </button>
  </div>
</template>
