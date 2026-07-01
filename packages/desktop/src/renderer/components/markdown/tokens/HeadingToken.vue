<script setup lang="ts">
import { computed } from 'vue'
import InlineToken from './InlineToken.vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

const level = computed(() => {
  return parseInt(props.openToken.tag.replace('h', ''), 10) || 1
})

// Extract inline content (skip open/close tokens)
const inlineContent = computed(() =>
  props.inlineTokens.filter((t) => !t.type.endsWith('_open') && !t.type.endsWith('_close')),
)
</script>

<template>
  <component :is="`h${level}`" class="font-semibold mt-4 mb-2">
    <InlineToken :tokens="inlineContent" :message-id="messageId" />
  </component>
</template>

<style scoped>
h1 { font-size: 1.5rem; }
h2 { font-size: 1.25rem; }
h3 { font-size: 1.1rem; }
h4, h5, h6 { font-size: 1rem; }
</style>
