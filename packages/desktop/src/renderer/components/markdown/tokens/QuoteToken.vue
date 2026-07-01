<script setup lang="ts">
import { computed } from 'vue'
import InlineToken from './InlineToken.vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

// Extract paragraph-level inline content
const inlineContent = computed(() =>
  props.inlineTokens.filter((t) => !t.type.endsWith('_open') && !t.type.endsWith('_close')),
)
</script>

<template>
  <blockquote class="border-l-[3px] border-accent pl-4 my-3 text-text-muted italic">
    <InlineToken :tokens="inlineContent" :message-id="messageId" />
  </blockquote>
</template>
