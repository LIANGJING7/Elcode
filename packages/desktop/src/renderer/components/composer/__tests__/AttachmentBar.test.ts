import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AttachmentBar from '../AttachmentBar.vue'

describe('AttachmentBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('无附件时不渲染', () => {
    const wrapper = mount(AttachmentBar, {
      props: { attachments: [] }
    })
    expect(wrapper.find('.attachment-bar').exists()).toBe(false)
  })

  it('有附件时渲染 chip 行', () => {
    const attachments = [
      { type: 'file', name: 'test.ts', path: '/src/test.ts' },
      { type: 'at', name: 'utils.ts', path: '/src/utils.ts' }
    ]
    const wrapper = mount(AttachmentBar, {
      props: { attachments }
    })
    expect(wrapper.find('.attachment-bar').exists()).toBe(true)
    const chips = wrapper.findAll('.attachment-chip')
    expect(chips.length).toBe(2)
  })

  it('chip 显示文件名和类型图标', () => {
    const attachments = [
      { type: 'file', name: 'test.ts', path: '/src/test.ts' },
      { type: 'at', name: 'utils.ts', path: '/src/utils.ts' }
    ]
    const wrapper = mount(AttachmentBar, {
      props: { attachments }
    })
    const chips = wrapper.findAll('.attachment-chip')
    expect(chips[0].text()).toContain('test.ts')
    expect(chips[0].text()).toContain('📎')
    expect(chips[1].text()).toContain('utils.ts')
    expect(chips[1].text()).toContain('@')
  })

  it('点击 × 移除附件并 emit remove', async () => {
    const attachments = [
      { type: 'file', name: 'test.ts', path: '/src/test.ts' }
    ]
    const wrapper = mount(AttachmentBar, {
      props: { attachments }
    })
    const removeBtn = wrapper.find('.remove-chip')
    await removeBtn.trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')![0]).toEqual([0]) // index
  })

  it('多个附件时 chip 横向排列', () => {
    const attachments = [
      { type: 'file', name: 'a.ts', path: '/a.ts' },
      { type: 'file', name: 'b.ts', path: '/b.ts' },
      { type: 'file', name: 'c.ts', path: '/c.ts' }
    ]
    const wrapper = mount(AttachmentBar, {
      props: { attachments }
    })
    const bar = wrapper.find('.attachment-bar')
    expect(bar.classes()).toContain('flex')
    expect(bar.classes()).toContain('flex-wrap')
  })
})