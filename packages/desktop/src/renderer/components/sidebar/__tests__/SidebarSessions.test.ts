import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SidebarSessions from '../SidebarSessions.vue'
import { useSessionStore } from '../../../stores/session'
import { useWorkspaceStore } from '../../../stores/workspace'
import { useUiStore } from '../../../stores/ui'
import type { Conversation } from '../../../../types/ipc'

// sessionStore 对 currentWorkspace 有 watch → loadConversations → window.desktop.session.list.
// 让 list resolve 成测试期望的会话, 避免 watch 异步覆盖测试手动设置的 conversations.
const convs: Conversation[] = [
  { id: '1', title: 'Migrate auth', messages: [], createdAt: new Date(), updatedAt: new Date(), primaryWorkspaceId: 'ws-a', workspaceIds: ['ws-a'] },
  { id: '2', title: 'Fix db', messages: [], createdAt: new Date(), updatedAt: new Date(), primaryWorkspaceId: 'ws-a', workspaceIds: ['ws-a'] },
]

const mockSession = {
  create: vi.fn(),
  list: vi.fn().mockResolvedValue(convs),
  get: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  prompt: vi.fn(),
  interrupt: vi.fn(),
  onStreamEvent: vi.fn(() => () => {}),
}
const mockWorkspace = {
  list: vi.fn().mockResolvedValue([]),
  getCwd: vi.fn().mockResolvedValue(''),
  add: vi.fn(),
  remove: vi.fn(),
  select: vi.fn().mockResolvedValue(true),
  openFolder: vi.fn(),
}
// 直接挂在 jsdom window 上, 不替换整个 window(否则丢事件构造器, trigger/setValue 崩).
;(window as unknown as { desktop: unknown }).desktop = { session: mockSession, workspace: mockWorkspace }

describe('SidebarSessions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSession.list.mockResolvedValue(convs)
  })

  it('点 + New Session 直接 createSession, 不弹目录对话框', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [{ id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: new Date(0) }]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    const spy = vi.spyOn(s, 'createSession').mockResolvedValue()
    const w = mount(SidebarSessions)
    await w.find('button[data-testid="new-session"]').trigger('click')
    await vi.waitFor(() => expect(spy).toHaveBeenCalled())
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 'ws-a', path: 'C:/repo' }))
  })

  it('只显示当前 workspace 的会话 (filter primaryWorkspaceId)', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [{ id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: new Date(0) }]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    // 只让 ws-a 的会话进 list 结果(模拟后端按目录返回)
    const onlyA = [convs[0], { ...convs[1], id: '2', primaryWorkspaceId: 'ws-b', workspaceIds: ['ws-b'] }]
    mockSession.list.mockResolvedValue(onlyA)
    s.conversations = onlyA
    const w = mount(SidebarSessions)
    await vi.waitFor(() =>
      expect(w.findAll('button[data-session-id]').map(b => b.attributes('data-session-id'))).toEqual(['1'])
    )
  })

  it('搜索框过滤标题', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [{ id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: new Date(0) }]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    s.conversations = [...convs]
    const w = mount(SidebarSessions)
    await w.find('input[data-testid="search"]').setValue('auth')
    await vi.waitFor(() =>
      expect(w.findAll('button[data-session-id]').map(b => b.attributes('data-session-id'))).toEqual(['1'])
    )
  })

  it('点会话行调 selectSession(id) 并切到 chat 视图', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [{ id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: new Date(0) }]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    s.conversations = [...convs]
    const ui = useUiStore()
    ui.setView('skills')

    const w = mount(SidebarSessions)
    await w.find('button[data-session-id="1"]').trigger('click')
    expect(s.currentSessionId).toBe('1')
    expect(ui.view).toBe('chat')
  })

  it('New Session 创建后切到 chat 视图', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [{ id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: new Date(0) }]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    const ui = useUiStore()
    ui.setView('skills')
    vi.spyOn(s, 'createSession').mockResolvedValue()

    const w = mount(SidebarSessions)
    await w.find('button[data-testid="new-session"]').trigger('click')
    await vi.waitFor(() => expect(ui.view).toBe('chat'))
  })

  it('当前选中会话高亮 is-active', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [{ id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: new Date(0) }]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    s.conversations = [...convs]
    s.currentSessionId = '1'

    const w = mount(SidebarSessions)
    await vi.waitFor(() => expect(w.find('button[data-session-id="1"]').exists()).toBe(true))
    expect(w.find('button[data-session-id="1"]').classes()).toContain('is-active')
    expect(w.find('button[data-session-id="2"]').classes()).not.toContain('is-active')
  })
})
