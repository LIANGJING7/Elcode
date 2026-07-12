<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

export interface ImageAttachment {
  type: 'image'
  name: string
  path: string
  mime: string
  url: string
}

const props = defineProps<{
  image: ImageAttachment
}>()

const emit = defineEmits<{
  close: []
}>()

function handleClose() {
  emit('close')
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm"
    @click="handleBackdropClick"
  >
    <div class="relative max-w-[90vw] max-h-[80vh] flex flex-col items-center">
      <!-- 关闭按钮 -->
      <button
        class="absolute -top-10 right-0 w-8 h-8 flex items-center justify-center rounded-lg bg-bg-elevated text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
        @click="handleClose"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- 图片 -->
      <img
        :src="image.url"
        :alt="image.name"
        class="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-lg"
      />

      <!-- 文件名 -->
      <div class="mt-2 text-sm text-text-muted">
        {{ image.name }}
      </div>
    </div>
  </div>
</template>