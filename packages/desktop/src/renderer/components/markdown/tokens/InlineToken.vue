<script setup lang="ts">
/**
 * InlineToken — 渲染 markdown-it inline tokens。
 * 处理: text, softbreak, code_inline, link, image, strong, em, s
 */
import { h, type VNode } from 'vue'

const props = defineProps<{
  tokens: any[]
  messageId: string
}>()

// 将 inline tokens 转换为 VNode 数组，处理嵌套 (strong/em/s/link)
function renderTokens(tokens: any[]): VNode[] {
  const result: VNode[] = []
  let i = 0

  while (i < tokens.length) {
    const t = tokens[i]

    // inline token 的内容在 children 里
    if (t.type === 'inline' && t.children) {
      result.push(...renderTokens(t.children))
    } else if (t.type === 'text') {
      result.push(h('span', t.content))
    } else if (t.type === 'softbreak' || t.type === 'hardbreak') {
      result.push(h('br'))
    } else if (t.type === 'code_inline') {
      result.push(h('code', { class: 'inline-code bg-bg-hover px-1 rounded text-xs font-mono' }, t.content))
    } else if (t.type === 'image') {
      const src = t.attrs?.find((a: any[]) => a[0] === 'src')?.[1] ?? ''
      result.push(h('img', {
        src, alt: t.content, loading: 'lazy',
        class: 'max-w-full rounded my-2',
      }))
    } else if (t.type === 'link_open') {
      // 收集 link_open...link_close 内的所有内容
      const href = t.attrs?.find((a: any[]) => a[0] === 'href')?.[1] ?? '#'
      const linkChildren: VNode[] = []
      i++
      while (i < tokens.length && tokens[i].type !== 'link_close') {
        const inner = tokens[i]
        if (inner.type === 'text') linkChildren.push(inner.content)
        else if (inner.type === 'code_inline') linkChildren.push(h('code', { class: 'inline-code bg-bg-hover px-1 rounded text-xs font-mono' }, inner.content))
        i++
      }
      result.push(h('a', {
        href, target: '_blank', rel: 'noopener noreferrer',
        class: 'text-accent underline',
      }, linkChildren))
    } else if (t.type === 'strong_open') {
      // 收集 strong_open...strong_close
      const strongChildren = collectUntilClose(tokens, i, 'strong_close')
      result.push(h('strong', { class: 'font-semibold' }, renderTokens(strongChildren)))
      i = skipUntilClose(tokens, i, 'strong_close')
    } else if (t.type === 'em_open') {
      const emChildren = collectUntilClose(tokens, i, 'em_close')
      result.push(h('em', {}, renderTokens(emChildren)))
      i = skipUntilClose(tokens, i, 'em_close')
    } else if (t.type === 's_open') {
      const sChildren = collectUntilClose(tokens, i, 's_close')
      result.push(h('span', { style: 'text-decoration: line-through' }, renderTokens(sChildren)))
      i = skipUntilClose(tokens, i, 's_close')
    }

    i++
  }

  return result
}

// 收集 open...close 之间的 tokens (不含 open/close 本身)
function collectUntilClose(tokens: any[], openIdx: number, closeType: string): any[] {
  const result: any[] = []
  let depth = 0
  for (let i = openIdx + 1; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type === tokens[openIdx].type) depth++
    if (t.type === closeType) {
      if (depth === 0) break
      depth--
    }
    result.push(t)
  }
  return result
}

// 返回 close token 的索引+1 (用于跳过已处理的块)
function skipUntilClose(tokens: any[], openIdx: number, closeType: string): number {
  let depth = 0
  for (let i = openIdx + 1; i < tokens.length; i++) {
    if (tokens[i].type === tokens[openIdx].type) depth++
    if (tokens[i].type === closeType) {
      if (depth === 0) return i + 1
      depth--
    }
  }
  return tokens.length
}

const rendered = () => h('span', renderTokens(props.tokens ?? []))
</script>

<template>
  <component :is="rendered" />
</template>
