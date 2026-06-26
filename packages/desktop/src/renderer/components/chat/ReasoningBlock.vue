<script setup lang="ts">
defineProps<{ content: string; tokens?: number }>()
</script>

<template>
  <details class="reasoning-block bg-surface-hover rounded border border-surface my-2">
    <summary class="px-3 py-2 cursor-pointer hover:bg-surface">
      Reasoning
      <span v-if="tokens" class="text-accent-muted text-sm ml-2">{{ tokens }} tokens</span>
    </summary>
    <div class="px-3 pb-2 text-sm whitespace-pre-wrap">{{ content }}</div>
  </details>
</template>

<style scoped>
.reasoning-block {
  /* 默认折叠 */
}
</style>