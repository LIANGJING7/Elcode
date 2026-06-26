import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ComposerInput from '../ComposerInput.vue'

describe('ComposerInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染多行 textarea, placeholder 可配', () => {
    const wrapper = mount(ComposerInput, {
      props: { placeholder: 'Type a message...' }
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('placeholder')).toBe('Type a message...')
  })

  it('输入 `/` 触发 SlashCommandMenu 显示', async () => {
    const wrapper = mount(ComposerInput)
    const textarea = wrapper.find('textarea')

    // Initially menu not shown
    expect(wrapper.find('.slash-command-menu').exists()).toBe(false)

    // Type `/` at start of line
    await textarea.setValue('/')
    
    // Wait for reactivity
    await wrapper.vm.$nextTick()

    // Menu should appear
    expect(wrapper.find('.slash-command-menu').exists()).toBe(true)
  })

  it('SlashCommandMenu 含 /plan /build /clear /compact /model 命令', async () => {
    const wrapper = mount(ComposerInput)
    const textarea = wrapper.find('textarea')

    await textarea.setValue('/')
    await wrapper.vm.$nextTick()

    const menu = wrapper.find('.slash-command-menu')
    expect(menu.exists()).toBe(true)
    
    const commands = menu.findAll('.slash-command-item')
    expect(commands.length).toBeGreaterThanOrEqual(5)

    const commandTexts = commands.map(c => c.text().toLowerCase())
    expect(commandTexts.some(t => t.includes('plan'))).toBe(true)
    expect(commandTexts.some(t => t.includes('build'))).toBe(true)
    expect(commandTexts.some(t => t.includes('clear'))).toBe(true)
    expect(commandTexts.some(t => t.includes('compact'))).toBe(true)
    expect(commandTexts.some(t => t.includes('model'))).toBe(true)
  })

  it('↑ 键回溯历史 (若 history 存, textarea 空)', async () => {
    const history = ['prev message 1', 'prev message 2']
    const wrapper = mount(ComposerInput, {
      props: { history }
    })
    const textarea = wrapper.find('textarea')

    // Press up arrow when textarea is empty
    await textarea.trigger('keydown', { key: 'ArrowUp' })
    await wrapper.vm.$nextTick()

    // Should show last history item
    expect(wrapper.emitted('update:value')).toBeTruthy()
    expect(wrapper.emitted('update:value')!.slice(-1)[0]).toEqual(['prev message 2'])
  })

  it('↓ 键前进历史 (从历史态回空态)', async () => {
    const history = ['prev message 1', 'prev message 2']
    const wrapper = mount(ComposerInput, {
      props: { history }
    })
    const textarea = wrapper.find('textarea')

    // Go back in history (first up)
    await textarea.trigger('keydown', { key: 'ArrowUp' })
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:value')!.slice(-1)[0]).toEqual(['prev message 2'])

    // Go forward (down)
    await textarea.trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()
    // Back to empty (no more history)
    expect(wrapper.emitted('update:value')!.slice(-1)[0]).toEqual([''])
  })

  it('Enter 发送, Shift+Enter 换行', async () => {
    const wrapper = mount(ComposerInput)
    const textarea = wrapper.find('textarea')

    // Set value first
    await textarea.setValue('test message')
    await wrapper.vm.$nextTick()

    // Shift+Enter should NOT emit send
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(wrapper.emitted('send')).toBeFalsy()

    // Enter alone should emit send
    await textarea.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')).toBeTruthy()
    expect(wrapper.emitted('send')![0]).toEqual(['test message'])
  })

  it('emit update:value 绑定外部', async () => {
    const wrapper = mount(ComposerInput)
    const textarea = wrapper.find('textarea')

    await textarea.setValue('new value')
    expect(wrapper.emitted('update:value')).toBeTruthy()
    expect(wrapper.emitted('update:value')![0]).toEqual(['new value'])
  })

  it('选择 slash command 替换输入 + emit command', async () => {
    const wrapper = mount(ComposerInput)
    const textarea = wrapper.find('textarea')

    await textarea.setValue('/')
    await wrapper.vm.$nextTick()

    // Menu should be visible
    expect(wrapper.find('.slash-command-menu').exists()).toBe(true)

    // Click on /plan command
    const commands = wrapper.findAll('.slash-command-item')
    const planCommand = commands.find(c => c.text().toLowerCase().includes('plan'))
    expect(planCommand).toBeDefined()
    
    await planCommand!.trigger('click')
    await wrapper.vm.$nextTick()

    // Should emit 'slashCommand' with command name
    expect(wrapper.emitted('slashCommand')).toBeTruthy()
    expect(wrapper.emitted('slashCommand')![0][0]).toBe('plan')

    // Input should be cleared
    expect(wrapper.emitted('update:value')!.slice(-1)[0]).toEqual([''])
  })

  it('Esc 关闭 SlashCommandMenu', async () => {
    const wrapper = mount(ComposerInput)
    const textarea = wrapper.find('textarea')

    await textarea.setValue('/')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.slash-command-menu').exists()).toBe(true)

    await textarea.trigger('keydown', { key: 'Escape' })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.slash-command-menu').exists()).toBe(false)
  })

  it('disabled 时 textarea 不可输入', () => {
    const wrapper = mount(ComposerInput, {
      props: { disabled: true }
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('disabled')).toBeDefined()
  })
})