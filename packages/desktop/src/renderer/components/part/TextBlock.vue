<script setup lang="ts">
import TokenRenderer from '../markdown/TokenRenderer.vue'

const props = defineProps<{
  content: string
  isStreaming?: boolean
}>()
</script>

<template>
  <div class="text-block whitespace-pre-wrap mb-2 text-sm leading-relaxed">
    <TokenRenderer v-if="!isStreaming" :tokens="[]" :raw="content" />
    <span v-else class="streaming-text">{{ content }}</span>
  </div>
</template>

<style scoped>
.streaming-text { opacity: 0.9; }
</style>