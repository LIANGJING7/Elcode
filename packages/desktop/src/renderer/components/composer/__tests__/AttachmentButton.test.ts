import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AttachmentButton from '../AttachmentButton.vue'

describe('AttachmentButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染 + 按钮图标', () => {
    const wrapper = mount(AttachmentButton)
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('+')
  })

  it('点击触发 openMenu, 显示两个选项', async () => {
    const wrapper = mount(AttachmentButton)
    const button = wrapper.find('button')

    // Initially menu hidden
    expect(wrapper.find('.attachment-menu').exists()).toBe(false)

    // Click to open
    await button.trigger('click')
    expect(wrapper.find('.attachment-menu').exists()).toBe(true)

    // Two options: 提及文件 + 添加附件
    const options = wrapper.findAll('.menu-item')
    expect(options.length).toBe(2)
    expect(options[0].text()).toContain('提及文件')
    expect(options[1].text()).toContain('添加附件')
  })

  it('选择"提及文件" emit atFile', async () => {
    const wrapper = mount(AttachmentButton)
    await wrapper.find('button').trigger('click')

    const atFileOption = wrapper.findAll('.menu-item')[0]
    await atFileOption.trigger('click')

    expect(wrapper.emitted('atFile')).toBeTruthy()
    expect(wrapper.find('.attachment-menu').exists()).toBe(false) // menu closes
  })

  it('选择"添加附件" emit attach', async () => {
    const wrapper = mount(AttachmentButton)
    await wrapper.find('button').trigger('click')

    const attachOption = wrapper.findAll('.menu-item')[1]
    await attachOption.trigger('click')

    expect(wrapper.emitted('attach')).toBeTruthy()
    expect(wrapper.find('.attachment-menu').exists()).toBe(false) // menu closes
  })

  it('disabled 时按钮不可点击', () => {
    const wrapper = mount(AttachmentButton, {
      props: { disabled: true }
    })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('Esc 关闭菜单', async () => {
    const wrapper = mount(AttachmentButton)
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.attachment-menu').exists()).toBe(true)

    // Trigger escape on the button (which has the keydown handler)
    await wrapper.find('button').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.attachment-menu').exists()).toBe(false)
  })
})