import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SidebarFooter from '../SidebarFooter.vue'
import { useUiStore } from '../../../stores/ui'

describe('SidebarFooter', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('默认渲染一个打开设置的按钮', () => {
    const w = mount(SidebarFooter)
    expect(w.find('button[data-sidebar-action="settings"]').exists()).toBe(true)
  })

  it('点击设置按钮 emit enter-settings', async () => {
    const w = mount(SidebarFooter)
    await w.find('button[data-sidebar-action="settings"]').trigger('click')
    expect(w.emitted('enter-settings')).toBeTruthy()
  })

  it('设置模式下渲染"返回工作区"按钮, 点击 emit exit-settings', async () => {
    const ui = useUiStore()
    ui.enterSettings()
    const w = mount(SidebarFooter)
    const backBtn = w.find('button[data-sidebar-action="exit-settings"]')
    expect(backBtn.exists()).toBe(true)
    // 设置模式下不再显示进入设置按钮
    expect(w.find('button[data-sidebar-action="settings"]').exists()).toBe(false)
    await backBtn.trigger('click')
    expect(w.emitted('exit-settings')).toBeTruthy()
  })
})