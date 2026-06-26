import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReasoningBlock from '../ReasoningBlock.vue'

describe('ReasoningBlock', () => {
  it('默认折叠 (details closed)', () => {
    const w = mount(ReasoningBlock, { props: { content: '思考...', tokens: 50 } })
    expect(w.find('details').element.open).toBe(false)
    expect(w.find('summary').text()).toContain('Reasoning')
  })

  it('显示 token 数', () => {
    const w = mount(ReasoningBlock, { props: { content: 'x', tokens: 123 } })
    expect(w.find('summary').text()).toContain('123')
  })

  it('无 tokens 时不显示数', () => {
    const w = mount(ReasoningBlock, { props: { content: 'x' } })
    expect(w.find('summary').text()).not.toContain('tokens')
  })
})