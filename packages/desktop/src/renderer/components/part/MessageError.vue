<script setup lang="ts">
const props = defineProps<{
  error: { type: string; message: string }
}>()
</script>

<template>
  <div class="message-error text-xs text-error bg-error/10 p-2 rounded mt-2">
    {{ props.error.message }}
  </div>
</template>