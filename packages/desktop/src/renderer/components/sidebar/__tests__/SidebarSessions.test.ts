import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SidebarSessions from '../SidebarSessions.vue'
import { useSessionStore } from '../../../stores/session'
import { useWorkspaceStore } from '../../../stores/workspace'
import type { Conversation } from '../../../../types/ipc'

// sessionStore 对 currentWorkspace 有 watch → reload → window.desktop.session.list.
// list 返回 { conversations, nextCursor } (非裸数组), 让其 resolve 成测试期望的会话.
const convs: Conversation[] = [
  { id: '1', title: 'Migrate auth', messages: [], createdAt: new Date(), updatedAt: new Date(), primaryWorkspaceId: 'ws-a', workspaceIds: ['ws-a'] },
  { id: '2', title: 'Fix db', messages: [], createdAt: new Date(), updatedAt: new Date(), primaryWorkspaceId: 'ws-a', workspaceIds: ['ws-a'] },
]

const mockSession = {
  create: vi.fn(),
  list: vi.fn().mockResolvedValue({ conversations: convs, nextCursor: null }),
  get: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  messages: vi.fn().mockResolvedValue([]),
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

function mkWs() {
  return { id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: new Date(0) }
}

// 注: New Session 按钮已移至 SidebarHeader (技能 nav 下方), 见 SidebarHeader.test.ts.
describe('SidebarSessions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSession.list.mockResolvedValue({ conversations: convs, nextCursor: null })
    mockSession.messages.mockResolvedValue([])
  })

  it('渲染 state.conversations 中的所有会话行', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [mkWs()]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    s.state.conversations = [...convs]
    const w = mount(SidebarSessions)
    await vi.waitFor(() =>
      expect(w.findAll('[data-session-id]').map((b) => b.attributes('data-session-id'))).toEqual(['1', '2'])
    )
  })

  it('点会话行调 selectSession(id) 置 currentSessionId', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [mkWs()]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    s.state.conversations = [...convs]
    const w = mount(SidebarSessions)
    await w.find('[data-session-id="1"]').trigger('click')
    expect(s.currentSessionId).toBe('1')
  })

  it('当前选中会话高亮 is-active', async () => {
    const ws = useWorkspaceStore()
    ws.workspaces = [mkWs()]
    ws.currentWorkspace = ws.workspaces[0]
    const s = useSessionStore()
    s.state.conversations = [...convs]
    s.currentSessionId = '1'

    const w = mount(SidebarSessions)
    await vi.waitFor(() => expect(w.find('[data-session-id="1"]').exists()).toBe(true))
    expect(w.find('[data-session-id="1"]').classes()).toContain('is-active')
    expect(w.find('[data-session-id="2"]').classes()).not.toContain('is-active')
  })
})
