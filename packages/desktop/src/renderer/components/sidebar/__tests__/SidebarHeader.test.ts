import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SidebarHeader from '../SidebarHeader.vue'
import { useUiStore } from '../../../stores/ui'
import { useSessionStore } from '../../../stores/session'
import { useWorkspaceStore } from '../../../stores/workspace'

// SidebarHeader 用 <Button> 但未 import, 测试里回退成原生 <button>, data-* 透传到 <button>.
// sessionStore 的 immediate watch 在有 currentWorkspace 时会 reload → session.list, 故 stub window.desktop.
const mockSession = {
  list: vi.fn().mockResolvedValue({ conversations: [], nextCursor: null }),
  onStreamEvent: vi.fn(() => () => {}),
  messages: vi.fn().mockResolvedValue([]),
}
;(window as unknown as { desktop: unknown }).desktop = {
  session: mockSession,
  workspace: { list: vi.fn().mockResolvedValue([]), getCwd: vi.fn().mockResolvedValue('') },
}

describe('SidebarHeader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('渲染 navigationRegistry 注册的所有导航按钮', () => {
    const w = mount(SidebarHeader)
    expect(w.findAll('button[data-nav-id]').map((b) => b.attributes('data-nav-id'))).toEqual(['skills'])
  })

  it('点击 skills 导航按钮 emit enter-settings 带 settingsSection', async () => {
    const w = mount(SidebarHeader)
    await w.find('button[data-nav-id="skills"]').trigger('click')
    expect(w.emitted('enter-settings')).toBeTruthy()
    expect(w.emitted('enter-settings')![0]).toEqual(['skills'])
  })

  it('ui.view=settings 且 settingsSection 匹配时, 对应导航按钮高亮', () => {
    const ui = useUiStore()
    ui.enterSettings()
    ui.settingsSection = 'skills'
    const w = mount(SidebarHeader)
    expect(w.find('button[data-nav-id="skills"]').classes()).toContain('bg-accent/10')
  })

  it('无当前 workspace 时, 新建会话按钮禁用', () => {
    const w = mount(SidebarHeader)
    expect((w.find('button[data-testid="new-session"]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('有当前 workspace 时, 点新建会话调 startNewSession', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [{ id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: new Date(0) }]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    const spy = vi.spyOn(s, 'startNewSession')

    const w = mount(SidebarHeader)
    const btn = w.find('button[data-testid="new-session"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    await btn.trigger('click')
    expect(spy).toHaveBeenCalled()
  })
})
