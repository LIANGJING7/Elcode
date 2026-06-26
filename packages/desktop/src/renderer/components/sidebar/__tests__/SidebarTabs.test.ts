import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SidebarTabs from '../SidebarTabs.vue'
import { useWorkspaceStore } from '../../../stores/workspace'

const mockWorkspace = {
  list: vi.fn().mockResolvedValue([]),
  getCwd: vi.fn().mockResolvedValue(''),
  add: vi.fn(),
  remove: vi.fn(),
  select: vi.fn().mockResolvedValue(true),
  openFolder: vi.fn(),
}
;(window as unknown as { desktop: unknown }).desktop = { workspace: mockWorkspace, session: {} }

describe('SidebarTabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('默认显示 Workspaces tab', () => {
    const w = mount(SidebarTabs)
    expect(w.find('button[data-tab="workspaces"]').classes()).toContain('is-active')
    expect(w.findComponent({ name: 'SidebarWorkspaces' }).exists()).toBe(true)
  })

  it('无当前 workspace 时 sessions tab 禁用, 不可切', async () => {
    const ws = useWorkspaceStore()
    ws.currentWorkspace = null
    const w = mount(SidebarTabs)
    const btn = w.find('button[data-tab="sessions"]')
    expect(btn.attributes('disabled')).toBeDefined()
    await btn.trigger('click')
    // 仍停留在 workspaces
    expect(w.find('button[data-tab="workspaces"]').classes()).toContain('is-active')
  })

  it('有当前 workspace 时切到 sessions tab', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [{ id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: new Date(0) }]
    ws.currentWorkspace = ws.workspaces[0]
    const w = mount(SidebarTabs)
    await w.find('button[data-tab="sessions"]').trigger('click')
    expect(w.find('button[data-tab="sessions"]').classes()).toContain('is-active')
    expect(w.findComponent({ name: 'SidebarSessions' }).exists()).toBe(true)
  })

  it('在 sessions tab 时若当前 workspace 被移除, 退回 workspaces tab', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [{ id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: new Date(0) }]
    ws.currentWorkspace = ws.workspaces[0]
    const w = mount(SidebarTabs)
    await w.find('button[data-tab="sessions"]').trigger('click')
    expect(w.find('button[data-tab="sessions"]').classes()).toContain('is-active')
    // 模拟移除当前 workspace
    ws.currentWorkspace = null
    await w.vm.$nextTick()
    expect(w.find('button[data-tab="workspaces"]').classes()).toContain('is-active')
  })
})
