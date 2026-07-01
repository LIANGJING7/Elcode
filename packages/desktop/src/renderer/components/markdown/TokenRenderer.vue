<script setup lang="ts">
/**
 * TokenRenderer — markdown-it Token[] → Vue Component 调度器。
 *
 * 不使用 v-html。将 markdown-it parse 出的 Token 序列遍历，
 * 每个 block-level token 对应一个 Vue 组件渲染。
 * inline tokens 由 InlineToken.vue 递归处理。
 */
import { computed, type Component } from 'vue'
import MarkdownIt from 'markdown-it'
import markdownItTaskLists from 'markdown-it-task-lists'
import markdownItFootnote from 'markdown-it-footnote'
import HeadingToken from './tokens/HeadingToken.vue'
import ParagraphToken from './tokens/ParagraphToken.vue'
import CodeFenceToken from './tokens/CodeFenceToken.vue'
import TableToken from './tokens/TableToken.vue'
import QuoteToken from './tokens/QuoteToken.vue'
import ListToken from './tokens/ListToken.vue'
import ImageToken from './tokens/ImageToken.vue'
import type Token from 'markdown-it'

const props = defineProps<{
  content: string
  messageId: string
}>()

const md = new MarkdownIt({ html: false, linkify: true })
  .use(markdownItTaskLists)
  .use(markdownItFootnote)

const tokens = computed(() => md.parse(props.content, {}))

// Block-level token type → Component 映射
const BLOCK_MAP: Record<string, Component> = {
  heading_open: HeadingToken,
  paragraph_open: ParagraphToken,
  fence: CodeFenceToken,
  code_block: CodeFenceToken,
  table_open: TableToken,
  blockquote_open: QuoteToken,
  bullet_list_open: ListToken,
  ordered_list_open: ListToken,
  image: ImageToken,
}

// 解析 inline content tokens (between open and close)
function extractInlineTokens(allTokens: Token[], openIdx: number): Token[] {
  const open = allTokens[openIdx]
  const closeType = (open as any).type.replace('_open', '_close')
  const result: Token[] = []
  let depth = 0
  for (let i = openIdx + 1; i < allTokens.length; i++) {
    const t = allTokens[i] as any
    if (t.type === (open as any).type) depth++
    if (t.type === closeType) {
      if (depth === 0) break
      depth--
    }
    result.push(t)
  }
  return result
}

interface BlockNode {
  key: string
  component: Component
  openToken: Token
  inlineTokens: Token[]
  codeIndex: number
}

// 将 token 流转换为 block 节点列表
const blockNodes = computed<BlockNode[]>(() => {
  const nodes: BlockNode[] = []
  let codeIdx = 0
  const all = tokens.value
  for (let i = 0; i < all.length; i++) {
    const t = all[i] as any
    // fence 是自闭合的 (无 open/close)
    if (t.type === 'fence' || t.type === 'code_block') {
      nodes.push({
        key: `${props.messageId}-fence-${codeIdx}`,
        component: CodeFenceToken,
        openToken: t,
        inlineTokens: [],
        codeIndex: codeIdx,
      })
      codeIdx++
      continue
    }
    // image 是自闭合的
    if (t.type === 'image') {
      nodes.push({
        key: `${props.messageId}-img-${i}`,
        component: ImageToken,
        openToken: t,
        inlineTokens: [],
        codeIndex: codeIdx,
      })
      continue
    }
    const comp = BLOCK_MAP[t.type]
    if (comp && t.type.endsWith('_open')) {
      const inline = extractInlineTokens(all, i)
      nodes.push({
        key: `${props.messageId}-${t.type}-${i}`,
        component: comp,
        openToken: t,
        inlineTokens: inline,
        codeIndex: codeIdx,
      })
    }
  }
  return nodes
})
</script>

<template>
  <div class="markdown-content text-sm leading-relaxed">
    <template v-for="node in blockNodes" :key="node.key">
      <component
        :is="node.component"
        :open-token="node.openToken"
        :inline-tokens="node.inlineTokens"
        :message-id="messageId"
        :code-index="node.codeIndex"
      />
    </template>
  </div>
</template>
