import { describe, it, expect } from 'vitest'
import { ref, nextTick } from 'vue'
import { useStreamingMarkdown } from '../useStreamingMarkdown'

describe('useStreamingMarkdown', () => {
  it('初始渲染 content', () => {
    const content = ref('hello')
    const { renderedContent } = useStreamingMarkdown(content)
    expect(renderedContent.value).toBe('hello')
  })

  it('高频更新被 batch (100ms 内不重复渲染)', async () => {
    const content = ref('a')
    const { renderedContent } = useStreamingMarkdown(content)
    content.value = 'b'
    content.value = 'c'
    content.value = 'd'
    // 100ms 内不应更新
    expect(renderedContent.value).toBe('a')
    // 等待 batch (rAF + 100ms)
    await new Promise((r) => setTimeout(r, 150))
    expect(renderedContent.value).toBe('d')
  })

  it('超过 100ms 间隔的更新立即渲染', async () => {
    const content = ref('a')
    const { renderedContent } = useStreamingMarkdown(content)
    // 第一次更新立即渲染 (初始 lastRenderTime=0, 远超 100ms)
    content.value = 'b'
    await nextTick()
    expect(renderedContent.value).toBe('b')
    // 等待超过 batch 窗口
    await new Promise((r) => setTimeout(r, 120))
    content.value = 'c'
    await nextTick()
    expect(renderedContent.value).toBe('c')
  })
})
