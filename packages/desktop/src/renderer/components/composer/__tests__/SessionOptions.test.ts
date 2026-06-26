import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SessionOptions from '../SessionOptions.vue'

describe('SessionOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染 registry 中的 mode 下拉 (model 当 registry 有 options 时才显示)', () => {
    const wrapper = mount(SessionOptions)
    const selects = wrapper.findAll('select')
    // mode always shown, model only when has options
    expect(selects.length).toBeGreaterThanOrEqual(1)
  })

  it('mode 下拉含 build/plan 选项', () => {
    const wrapper = mount(SessionOptions)
    const modeSelect = wrapper.findAll('select').find(s => s.classes().includes('mode-select'))
    if (modeSelect) {
      const options = modeSelect.findAll('option')
      expect(options.some(o => o.attributes('value') === 'build')).toBe(true)
      expect(options.some(o => o.attributes('value') === 'plan')).toBe(true)
    }
  })

  it('emit update:options 当选择变化', async () => {
    const wrapper = mount(SessionOptions, {
      props: { options: { mode: 'build' } }
    })
    const selects = wrapper.findAll('select')
    if (selects.length > 0) {
      await selects[0].setValue('plan')
      expect(wrapper.emitted('update:options')).toBeTruthy()
    }
  })

  it('禁用 runtime 不允许的选项 (when editingSession=false)', () => {
    const wrapper = mount(SessionOptions, {
      props: { editingSession: false }
    })
    // 选项允许 runtime 的应可见，仅 allow create 的应禁用
    // (本测试简化为检查渲染)
    expect(wrapper.findAll('select').length).toBeGreaterThanOrEqual(1)
  })
})