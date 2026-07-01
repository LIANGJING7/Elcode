<script setup lang="ts">
/**
 * MarkdownRenderer — chat 消息的 Markdown 渲染入口。
 *
 * 使用 TokenRenderer (Token-based Vue 渲染)，不使用 v-html。
 * 支持: 标题、段落、代码块、表格、引用、列表、任务列表、链接、图片、脚注。
 */
import TokenRenderer from '../markdown/TokenRenderer.vue'

defineProps<{
  content: string
  messageId: string
}>()
</script>

<template>
  <TokenRenderer v-if="content" :content="content" :message-id="messageId" />
</template>
