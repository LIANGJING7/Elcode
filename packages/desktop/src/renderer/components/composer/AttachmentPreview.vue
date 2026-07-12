<script setup lang="ts">
import { computed } from 'vue'
import ImageThumbnail from './ImageThumbnail.vue'
import ImagePreviewModal from './ImagePreviewModal.vue'
import { ref } from 'vue'

export interface ImageAttachment {
  type: 'image'
  name: string
  path: string
  mime: string
  url: string
}

const props = defineProps<{
  attachments: ImageAttachment[]
}>()

const emit = defineEmits<{
  remove: [index: number]
}>()

const previewImage = ref<ImageAttachment | null>(null)
const previewOpen = ref(false)

function handleRemove(index: number) {
  emit('remove', index)
}

function handlePreview(image: ImageAttachment) {
  previewImage.value = image
  previewOpen.value = true
}

function closePreview() {
  previewOpen.value = false
}
</script>

<template>
  <div
    v-if="attachments.length > 0"
    class="attachment-preview flex flex-wrap gap-2 px-3 py-2 border-t border-border/60"
  >
    <ImageThumbnail
      v-for="(attachment, index) in attachments"
      :key="attachment.path"
      :attachment="attachment"
      @remove="handleRemove(index)"
      @preview="handlePreview"
    />
  </div>

  <ImagePreviewModal
    v-if="previewOpen && previewImage"
    :image="previewImage"
    @close="closePreview"
  />
</template>