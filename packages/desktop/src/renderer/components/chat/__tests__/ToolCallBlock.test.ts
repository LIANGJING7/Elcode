import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToolCallBlock from '../ToolCallBlock.vue'
import type { ToolCall } from '../../../../types/ipc'

describe('ToolCallBlock', () => {
  it('running 状态点 pulse (黄色), completed 转绿色 ✓', () => {
    const tcRunning: ToolCall = { id: 't1', name: 'read_file', args: {}, status: 'running' }
    const w = mount(ToolCallBlock, { props: { toolCall: tcRunning } })
    expect(w.find('[data-testid="status-dot"]').classes()).toContain('running')

    const tcCompleted: ToolCall = { id: 't1', name: 'read_file', args: {}, status: 'completed' }
    const w2 = mount(ToolCallBlock, { props: { toolCall: tcCompleted } })
    expect(w2.find('[data-testid="status-dot"]').classes()).toContain('completed')
  })

  it('点击切换单行摘要 / 详情(默认展开)', async () => {
    const tc: ToolCall = { id: 't1', name: 'read_file', args: { path: 'a.ts' }, status: 'completed', result: { size: '1.2KB' } }
    const w = mount(ToolCallBlock, { props: { toolCall: tc } })
    // 默认展开
    expect(w.find('[data-testid="detail"]').exists()).toBe(true)
    // 点击切换折叠
    await w.find('[data-testid="toggle"]').trigger('click')
    expect(w.find('[data-testid="detail"]').exists()).toBe(false)
    // 再次展开
    await w.find('[data-testid="toggle"]').trigger('click')
    expect(w.find('[data-testid="detail"]').exists()).toBe(true)
  })

  it('emit inspect 触发 Inspector 切换 activeToolCallId', async () => {
    const tc: ToolCall = { id: 't1', name: 'read_file', args: {}, status: 'completed' }
    const w = mount(ToolCallBlock, { props: { toolCall: tc } })
    await w.find('[data-testid="summary"]').trigger('click')
    expect(w.emitted('inspect')).toBeTruthy()
    expect(w.emitted('inspect')![0]).toEqual(['t1'])
  })
})