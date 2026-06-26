import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SidebarHeader from '../SidebarHeader.vue'
import { useUiStore } from '../../../stores/ui'

describe('SidebarHeader', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('渲染 navigationRegistry 注册的所有导航按钮', () => {
    const w = mount(SidebarHeader)
    const buttons = w.findAll('button[data-nav-id]')
    expect(buttons.map((b) => b.attributes('data-nav-id'))).toEqual(['skills', 'mcp'])
  })

  it('点击导航按钮 emit select-nav 且 payload 为对应 view', async () => {
    const w = mount(SidebarHeader)
    await w.find('button[data-nav-id="skills"]').trigger('click')
    expect(w.emitted('select-nav')).toBeTruthy()
    expect(w.emitted('select-nav')![0]).toEqual(['skills'])
  })

  it('ui.view 是某导航 view 时, 对应按钮高亮', async () => {
    const ui = useUiStore()
    ui.setView('mcp')
    const w = mount(SidebarHeader)
    expect(w.find('button[data-nav-id="mcp"]').classes()).toContain('is-active')
  })

  it('点击设置⚙ emit enter-settings', async () => {
    const w = mount(SidebarHeader)
    await w.find('button[data-sidebar-action="settings"]').trigger('click')
    expect(w.emitted('enter-settings')).toBeTruthy()
  })
})