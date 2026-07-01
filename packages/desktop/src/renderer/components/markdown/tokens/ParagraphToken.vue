<script setup lang="ts">
import { computed } from 'vue'
import InlineToken from './InlineToken.vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

const inlineContent = computed(() =>
  props.inlineTokens.filter((t) => !t.type.endsWith('_open') && !t.type.endsWith('_close')),
)
</script>

<template>
  <p class="mb-3"><InlineToken :tokens="inlineContent" :message-id="messageId" /></p>
</template>
