<script setup lang="ts">
import type { Message } from '../../../types/ipc'

defineProps<{ message: Message }>()
</script>

<template>
  <div class="message-user flex justify-end mb-4">
    <div
      data-testid="user-bubble"
      class="bg-accent-muted text-surface px-4 py-2 rounded-lg max-w-[80%]"
    >
      {{ message.content }}
    </div>
  </div>
</template>