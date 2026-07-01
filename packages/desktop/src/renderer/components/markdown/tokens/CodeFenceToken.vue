<script setup lang="ts">
import CodeBlock from '../../chat/CodeBlock.vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

const lang = props.openToken.info?.trim() || 'text'
const code = props.openToken.content || ''
</script>

<template>
  <CodeBlock :code="code" :lang="lang" :message-id="messageId" :code-index="codeIndex" />
</template>
