<script setup lang="ts">
import { ref } from 'vue'

export interface ImageAttachment {
  type: 'image'
  name: string
  path: string
  mime: string
  url: string
}

const props = defineProps<{
  attachment: ImageAttachment
}>()

const emit = defineEmits<{
  remove: []
  preview: [image: ImageAttachment]
}>()

const isHovered = ref(false)

function handleMouseEnter() {
  isHovered.value = true
}

function handleMouseLeave() {
  isHovered.value = false
}

function handleRemove(e: Event) {
  e.stopPropagation()
  emit('remove')
}

function handleClick() {
  emit('preview', props.attachment)
}
</script>

<template>
  <div
    class="image-thumbnail relative w-20 h-20 rounded-lg overflow-hidden cursor-pointer group"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <img
      :src="attachment.url"
      :alt="attachment.name"
      class="w-full h-full object-cover"
    />
    <!-- 删除按钮 -->
    <button
      v-show="isHovered"
      class="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-bg-elevated/80 text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
      @click="handleRemove"
    >
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.image-thumbnail {
  background-color: var(--color-bg-hover);
}
</style>