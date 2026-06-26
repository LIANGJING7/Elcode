import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatTimeline from '../ChatTimeline.vue'
import type { Message } from '../../../../types/ipc'

describe('ChatTimeline', () => {
  it('空态渲染 placeholder', () => {
    const w = mount(ChatTimeline, { props: { messages: [], streamingMessage: null } })
    expect(w.text()).toContain('开始')
  })

  it('渲染 user 与 assistant 消息', () => {
    const messages: Message[] = [
      { id: 'm1', role: 'user', content: 'hi', timestamp: new Date() },
      { id: 'm2', role: 'assistant', content: 'hello', timestamp: new Date() },
    ]
    const w = mount(ChatTimeline, { props: { messages, streamingMessage: null } })
    expect(w.find('[data-testid="user-bubble"]').exists()).toBe(true)
    expect(w.find('[data-testid="assistant-bubble"]').exists()).toBe(true)
  })

  it('流式消息显示 Thinking 占位', () => {
    const w = mount(ChatTimeline, {
      props: {
        messages: [],
        streamingMessage: { id: 's1', role: 'assistant', content: '', timestamp: new Date() },
      },
    })
    expect(w.find('[data-testid="streaming-bubble"]').exists()).toBe(true)
    expect(w.text()).toContain('Thinking')
  })
})