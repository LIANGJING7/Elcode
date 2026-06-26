import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSessionStore } from '../../stores/session'
import { useWorkspaceStore } from '../../stores/workspace'
import type { Conversation } from '../../../types/ipc'

// 真实 preload API 名称(原测试用 sendMessage/onStreamData/onStreamEnd 是脱节的, 这里按现实 mock)
const mockSession = {
  create: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  prompt: vi.fn(),
  interrupt: vi.fn(),
  onStreamEvent: vi.fn(() => () => {}),
}
const mockWorkspace = {
  list: vi.fn(),
  getCwd: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  select: vi.fn(),
  openFolder: vi.fn(),
}

vi.stubGlobal('window', { desktop: { session: mockSession, workspace: mockWorkspace } })

const WS_A = { id: 'ws-a', name: 'a', path: 'C:/repo', lastAccessed: new Date() }

function makeConv(over: Partial<Conversation> = {}): Conversation {
  return {
    id: 'sess-1',
    title: 'old',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    primaryWorkspaceId: 'ws-a',
    workspaceIds: ['ws-a'],
    ...over,
  }
}

describe('sessionStore (phase 2 upgrade)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSession.create.mockResolvedValue('sess-1')
    mockSession.update.mockResolvedValue(true)
    mockSession.delete.mockResolvedValue(true)

    // 让 directoryOf() 在 rename/togglePin 复用 currentWorkspace path,
    // clearAll(workspaceId) 经 workspaces 列表查 path
    const ws = useWorkspaceStore()
    ws.currentWorkspace = { ...WS_A }
    ws.workspaces = [{ ...WS_A }]
  })

  it('initializes with empty state', () => {
    const s = useSessionStore()
    expect(s.currentSessionId).toBeNull()
    expect(s.conversations).toEqual([])
    expect(s.isLoading).toBe(false)
    expect(s.error).toBeNull()
  })

  it('createSession 用 primaryWorkspaceId + workspaceIds 入参并落 metadata', async () => {
    mockSession.list.mockResolvedValue([{ ...makeConv({ id: 'sess-1', title: 'New chat' }) }])

    const s = useSessionStore()
    await s.createSession({ workspaceId: 'ws-a', path: 'C:/repo' })

    const loc = mockSession.create.mock.calls[0][0]
    expect(loc).toEqual({ directory: 'C:/repo', workspaceID: 'ws-a' })
    expect(mockSession.update).toHaveBeenCalledWith('sess-1', {
      primaryWorkspaceId: 'ws-a',
      workspaceIds: ['ws-a'],
    })
    expect(s.currentSessionId).toBe('sess-1')
    const conv = s.conversations.find((c) => c.id === 'sess-1')!
    expect(conv.primaryWorkspaceId).toBe('ws-a')
    expect(conv.workspaceIds).toEqual(['ws-a'])
  })

  it('createSession 显式多挂载时透传 primary + workspaceIds', async () => {
    mockSession.create.mockResolvedValue('sess-2')
    mockSession.update.mockClear()
    mockSession.list.mockResolvedValue([])

    const s = useSessionStore()
    await s.createSession({
      workspaceId: 'ws-a',
      path: 'C:/repo',
      primaryWorkspaceId: 'ws-primary',
      workspaceIds: ['ws-primary', 'ws-a'],
    })

    expect(mockSession.update).toHaveBeenCalledWith('sess-2', {
      primaryWorkspaceId: 'ws-primary',
      workspaceIds: ['ws-primary', 'ws-a'],
    })
  })

  it('rename 调 session.update 改 title 并更新本地 conversation', async () => {
    const s = useSessionStore()
    s.conversations = [makeConv({ id: 'sess-1', title: 'old' })]
    await s.rename('sess-1', 'new title')
    expect(mockSession.update).toHaveBeenCalledWith('sess-1', { title: 'new title' })
    expect(s.conversations[0].title).toBe('new title')
  })

  it('togglePin flips pinned + update', async () => {
    const s = useSessionStore()
    s.conversations = [makeConv({ id: 'sess-1', pinned: false })]
    await s.togglePin('sess-1')
    expect(s.conversations[0].pinned).toBe(true)
    expect(mockSession.update).toHaveBeenCalledWith('sess-1', { pinned: true })
    await s.togglePin('sess-1')
    expect(s.conversations[0].pinned).toBe(false)
    expect(mockSession.update).toHaveBeenLastCalledWith('sess-1', { pinned: false })
  })

  it('clearAll 删当前 workspace 所有的 sessions', async () => {
    mockSession.delete.mockClear()
    const s = useSessionStore()
    s.conversations = [
      makeConv({ id: 'sa', primaryWorkspaceId: 'ws-a', workspaceIds: ['ws-a'] }),
      makeConv({ id: 'sb', primaryWorkspaceId: 'ws-b', workspaceIds: ['ws-b'] }),
    ]
    // 重新 list 只返回剩余 sb
    mockSession.list.mockResolvedValue([
      makeConv({ id: 'sb', primaryWorkspaceId: 'ws-b', workspaceIds: ['ws-b'] }),
    ])
    await s.clearAll('ws-a')
    expect(mockSession.delete).toHaveBeenCalledWith('sa', 'C:/repo')
    expect(mockSession.delete).not.toHaveBeenCalledWith('sb', 'C:/repo')
    expect(s.conversations.map((c) => c.id)).toEqual(['sb'])
  })

  it('select session + currentConversation computed', () => {
    const s = useSessionStore()
    s.conversations = [
      makeConv({ id: 's1', title: 'Chat 1' }),
      makeConv({ id: 's2', title: 'Chat 2' }),
    ]
    s.selectSession('s2')
    expect(s.currentSessionId).toBe('s2')
    expect(s.currentConversation?.title).toBe('Chat 2')
  })
})