<template>
  <div class="attachment-button-wrapper relative">
    <button
      class="attachment-button p-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent-muted transition-all duration-fast flex-shrink-0"
      :class="{ 'text-accent bg-accent-muted': menuOpen }"
      :disabled="disabled"
      @click="toggleMenu"
      @keydown.escape="closeMenu"
    >
      <span class="text-lg leading-none">+</span>
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="menuOpen"
      class="attachment-menu absolute bottom-full left-0 mb-2 bg-bg-elevated border border-border rounded-lg shadow-lg overflow-hidden z-20"
    >
      <div class="p-1">
        <button
          class="menu-item w-full px-3 py-2 text-left text-sm text-text hover:bg-bg-hover rounded transition-colors"
          @click="handleAtFile"
        >
          <span class="text-accent mr-2">@</span>
          <span>提及文件</span>
        </button>
        <button
          class="menu-item w-full px-3 py-2 text-left text-sm text-text hover:bg-bg-hover rounded transition-colors"
          @click="handleAttach"
        >
          <span class="text-accent mr-2">📎</span>
          <span>添加附件</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  disabled?: boolean
}>(), {
  disabled: false
})

const emit = defineEmits<{
  atFile: []
  attach: []
}>()

const menuOpen = ref(false)

function toggleMenu() {
  if (props.disabled) return
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function handleAtFile() {
  emit('atFile')
  closeMenu()
}

function handleAttach() {
  emit('attach')
  closeMenu()
}
</script>

<style scoped>
.attachment-menu {
  min-width: 140px;
}
</style>