<template>
  <div
    v-if="attachments.length > 0"
    class="attachment-bar flex flex-wrap gap-2 px-4 py-2 border-t border-border/40"
  >
    <div
      v-for="(attachment, index) in attachments"
      :key="attachment.path"
      class="attachment-chip inline-flex items-center gap-1 px-2 py-1 bg-bg-hover rounded text-2xs text-text"
    >
      <span class="type-icon">
        {{ attachment.type === 'at' ? '@' : '📎' }}
      </span>
      <span class="filename">{{ attachment.name }}</span>
      <button
        class="remove-chip ml-1 text-text-muted hover:text-accent transition-colors"
        title="移除"
        @click="emit('remove', index)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Attachment {
  type: 'file' | 'at'
  name: string
  path: string
}

defineProps<{
  attachments: Attachment[]
}>()

const emit = defineEmits<{
  remove: [index: number]
}>()
</script>