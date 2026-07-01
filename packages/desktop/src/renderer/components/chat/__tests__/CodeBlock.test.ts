import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CodeBlock from '../CodeBlock.vue'

// Mock shiki to avoid async highlighter loading in jsdom
vi.mock('shiki', () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    codeToHtml: (code: string) => `<pre class="shiki">${code}</pre>`,
  }),
}))

async function flushPromises() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('CodeBlock', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('短代码块默认展开', async () => {
    const code = 'line1\nline2\nline3'
    const w = mount(CodeBlock, {
      props: { code, lang: 'ts', messageId: 'm1', codeIndex: 0 },
    })
    await flushPromises()
    await w.vm.$nextTick()
    expect(w.text()).toContain('line1')
    expect(w.text()).toContain('line2')
    expect(w.text()).toContain('line3')
    expect(w.find('[data-testid="fold-btn"]').exists()).toBe(false)
  })

  it('长代码块默认折叠 (超过 autoFoldThreshold)', async () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line${i}`)
    const code = lines.join('\n')
    const w = mount(CodeBlock, {
      props: { code, lang: 'ts', messageId: 'm1', codeIndex: 0, autoFoldThreshold: 15 },
    })
    await flushPromises()
    await w.vm.$nextTick()
    expect(w.find('[data-testid="fold-btn"]').exists()).toBe(true)
    expect(w.text()).toContain('line0')
    // CSS 隐藏模式: 内容在 DOM 中但 maxHeight 限制可见区域
    const content = w.find('.code-content')
    expect(content.attributes('style') ?? '').toContain('max-height')
    // 折叠指示器显示
    expect(w.text()).toContain('已折叠')
  })

  it('显示语言标签', () => {
    const w = mount(CodeBlock, {
      props: { code: 'x', lang: 'bash', messageId: 'm1', codeIndex: 0 },
    })
    expect(w.text()).toContain('bash')
  })

  it('key 包含 messageId 和 codeIndex (稳定性)', () => {
    const w = mount(CodeBlock, {
      props: { code: 'x', lang: 'ts', messageId: 'm1', codeIndex: 2 },
    })
    expect(w.attributes('data-block-key')).toBe('m1-code-2')
  })
})
