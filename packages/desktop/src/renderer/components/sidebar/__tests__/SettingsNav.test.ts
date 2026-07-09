import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SettingsNav from '../SettingsNav.vue'
import { useUiStore } from '../../../stores/ui'

describe('SettingsNav', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('渲染 3 个设置项', () => {
    const w = mount(SettingsNav)
    expect(w.findAll('button[data-settings-section]').map(b => b.attributes('data-settings-section')))
      .toEqual(['models', 'mcp', 'skills'])
  })

  it('点设置项设 uiStore.settingsSection, 不动 view (仍是 settings)', async () => {
    const ui = useUiStore()
    ui.setView('chat')
    ui.enterSettings()
    const w = mount(SettingsNav)
    await w.find('button[data-settings-section="models"]').trigger('click')
    expect(ui.settingsSection).toBe('models')
    expect(ui.view).toBe('settings')
  })

  it('当前 settingsSection 对应项高亮 is-active', async () => {
    const ui = useUiStore()
    ui.setView('chat')
    ui.enterSettings()
    ui.settingsSection = 'mcp'
    const w = mount(SettingsNav)
    expect(w.find('button[data-settings-section="mcp"]').classes()).toContain('is-active')
    expect(w.find('button[data-settings-section="models"]').classes()).not.toContain('is-active')
  })

  it('← 返回 exitSettings', async () => {
    const ui = useUiStore()
    ui.setView('chat')
    ui.enterSettings()
    const w = mount(SettingsNav)
    await w.find('button[data-testid="back"]').trigger('click')
    expect(ui.view).toBe('chat')
  })
})
