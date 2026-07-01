<script setup lang="ts">
import { computed } from 'vue'
import InlineToken from './InlineToken.vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

const isOrdered = computed(() => props.openToken.type === 'ordered_list_open')

interface ListItem {
  tokens: any[]
  checked?: boolean | null
}

const items = computed<ListItem[]>(() => {
  const result: ListItem[] = []
  let currentItem: ListItem | null = null

  for (const t of props.inlineTokens) {
    if (t.type === 'list_item_open') {
      currentItem = { tokens: [] }
    } else if (t.type === 'list_item_close') {
      if (currentItem) result.push(currentItem)
      currentItem = null
    } else if (currentItem && !t.type.endsWith('_open') && !t.type.endsWith('_close')) {
      currentItem.tokens.push(t)
    }
  }
  return result
})
</script>

<template>
  <component :is="isOrdered ? 'ol' : 'ul'" class="ml-5 mb-3">
    <li v-for="(item, i) in items" :key="i" class="mb-1 list-disc">
      <InlineToken :tokens="item.tokens" :message-id="messageId" />
    </li>
  </component>
</template>

<style scoped>
ol { list-style-type: decimal; }
ul { list-style-type: disc; }
</style>
