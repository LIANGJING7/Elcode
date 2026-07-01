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

  it('同一 user turn 的多条 assistant reasoning 合并为单个块', () => {
    // 后端把多步 agentic 响应持久化为多条 assistant message，每条带 reasoning。
    // 渲染时应聚合成一个 Reasoning 块，与流式展示对齐。
    const messages: Message[] = [
      { id: 'u1', role: 'user', content: '请帮我重构', timestamp: new Date() },
      { id: 'a1', role: 'assistant', content: '', reasoning: '第一步思考...', timestamp: new Date() },
      { id: 'a2', role: 'assistant', content: '', reasoning: '第二步思考...', timestamp: new Date() },
      { id: 'a3', role: 'assistant', content: '重构完成', timestamp: new Date() },
    ]
    const w = mount(ChatTimeline, { props: { messages, streamingMessage: null } })
    expect(w.findAll('.reasoning-block')).toHaveLength(1)
  })

  it('不同 user turn 的 reasoning 各自独立成块', () => {
    const messages: Message[] = [
      { id: 'u1', role: 'user', content: '第一问', timestamp: new Date() },
      { id: 'a1', role: 'assistant', content: '答一', reasoning: '思考一', timestamp: new Date() },
      { id: 'u2', role: 'user', content: '第二问', timestamp: new Date() },
      { id: 'a2', role: 'assistant', content: '答二', reasoning: '思考二', timestamp: new Date() },
    ]
    const w = mount(ChatTimeline, { props: { messages, streamingMessage: null } })
    expect(w.findAll('.reasoning-block')).toHaveLength(2)
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