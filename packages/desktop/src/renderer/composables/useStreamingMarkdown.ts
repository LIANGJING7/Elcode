import { shallowRef, watch, type Ref } from 'vue'

/**
 * useStreamingMarkdown — Streaming 增量渲染优化。
 *
 * AI 回复是 Streaming，每秒可能产生几十个 delta。
 * 不做 batch 会导致 markdown-it 反复 parse，CPU 飙升。
 *
 * 策略: 100ms 内的多次更新合并为一次渲染，使用 requestAnimationFrame。
 */
export function useStreamingMarkdown(streamingContent: Ref<string>) {
  const renderedContent = shallowRef<string>(streamingContent.value)
  let lastRenderTime = 0
  let pendingRaf: number | null = null
  const RENDER_INTERVAL = 100

  watch(streamingContent, (content) => {
    const now = Date.now()
    if (now - lastRenderTime < RENDER_INTERVAL) {
      // 在 batch 窗口内，调度 rAF
      if (pendingRaf === null) {
        pendingRaf = requestAnimationFrame(() => {
          renderedContent.value = streamingContent.value
          lastRenderTime = Date.now()
          pendingRaf = null
        })
      }
      return
    }
    // 超过 batch 窗口，立即渲染
    renderedContent.value = content
    lastRenderTime = now
  })

  return { renderedContent }
}
