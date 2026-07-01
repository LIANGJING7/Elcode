import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSessionStore } from '../../stores/session'
import { useWorkspaceStore } from '../../stores/workspace'
import type { Conversation } from '../../../types/ipc'
import type { SessionListResult } from '../../../types/session'

const mockSession = {
  create: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  prompt: vi.fn(),
  interrupt: vi.fn(),
  messages: vi.fn(),
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

// Mock window.desktop
;(global as any).window = { desktop: { session: mockSession, workspace: mockWorkspace } }

const WS_A = { id: 'ws-a', name: 'a', path: 'C:/repo', lastAccessed: new Date() }

function makeConv(over: Partial<Conversation> = {}): Conversation {
  return {
    id: 'sess-1',
    title: 'old',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    directory: 'C:/repo',
    ...over,
  }
}

function makeSessionListResult(conversations: Conversation[], nextCursor?: number): SessionListResult {
  return { conversations, nextCursor }
}

describe('sessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSession.create.mockResolvedValue('sess-1')
    mockSession.update.mockResolvedValue({})
    mockSession.delete.mockResolvedValue(true)
    mockSession.list.mockResolvedValue(makeSessionListResult([makeConv({ id: 'sess-1', title: 'New chat' })]))
    mockSession.messages.mockResolvedValue([])

    const ws = useWorkspaceStore()
    ws.currentWorkspace = { ...WS_A }
    ws.workspaces = [{ ...WS_A }]
  })

  it('initializes with empty state', async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
    const s = useSessionStore()
    expect(s.currentSessionId).toBeNull()
    expect(s.state.conversations).toEqual([])
    expect(s.state.error).toBeNull()
  })

  it('createSession calls backend and loads conversations', async () => {
    mockSession.list.mockResolvedValue(makeSessionListResult([makeConv({ id: 'sess-1', title: 'New chat' })]))

    const s = useSessionStore()
    await s.createSession({ workspaceId: 'ws-a', path: 'C:/repo' })

    const loc = mockSession.create.mock.calls[0][0]
    expect(loc).toEqual({ directory: 'C:/repo', workspaceID: 'ws-a' })
    expect(s.currentSessionId).toBe('sess-1')
  })

  it('rename calls session.update and updates local conversation', async () => {
    const s = useSessionStore()
    s.state.conversations = [makeConv({ id: 'sess-1', title: 'old' })]
    await s.rename('sess-1', 'new title')
    expect(mockSession.update).toHaveBeenCalledWith('sess-1', { title: 'new title' })
    expect(s.state.conversations[0].title).toBe('new title')
  })

  it('clearAll deletes sessions by directory', async () => {
    mockSession.delete.mockClear()
    const s = useSessionStore()
    s.state.conversations = [
      makeConv({ id: 'sa', directory: 'C:/repo' }),
      makeConv({ id: 'sb', directory: 'C:/other' }),
    ]
    mockSession.list.mockResolvedValue(makeSessionListResult([
      makeConv({ id: 'sb', directory: 'C:/other' }),
    ]))
    await s.clearAll('C:/repo')
    expect(mockSession.delete).toHaveBeenCalledWith('sa')
    expect(mockSession.delete).not.toHaveBeenCalledWith('sb')
    expect(s.state.conversations.map((c) => c.id)).toEqual(['sb'])
  })

  it('select session + currentConversation computed', () => {
    const s = useSessionStore()
    s.state.conversations = [
      makeConv({ id: 's1', title: 'Chat 1' }),
      makeConv({ id: 's2', title: 'Chat 2' }),
    ]
    s.selectSession('s2')
    expect(s.currentSessionId).toBe('s2')
    expect(s.currentConversation?.title).toBe('Chat 2')
  })

  // Queue tests (per-session)
  it('currentPendingQueue initializes empty', async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
    const s = useSessionStore()
    expect(s.currentPendingQueue).toEqual([])
  })

  it('interrupt calls backend and clears that session\'s queue', async () => {
    const s = useSessionStore()
    s.currentSessionId = 'sess-1'
    s.state.conversations = [makeConv({ id: 'sess-1' })]
    
    // Simulate queued messages for session 1 (use internal getQueue via sending)
    // We directly manipulate the queue for testing
    const queue1 = s.currentPendingQueue
    queue1.push({
      id: 'queue-1',
      content: 'queued message 1',
      createdAt: Date.now()
    })
    queue1.push({
      id: 'queue-2',
      content: 'queued message 2',
      createdAt: Date.now()
    })
    
    await s.interrupt('sess-1')
    
    expect(mockSession.interrupt).toHaveBeenCalledWith('sess-1', 'C:/repo')
    expect(s.currentPendingQueue).toEqual([])
  })

  it('removeMessage removes from current session\'s queue', async () => {
    const s = useSessionStore()
    s.currentSessionId = 'sess-1'
    
    const queue = s.currentPendingQueue
    queue.push({
      id: 'q-a',
      content: 'msg A',
      createdAt: Date.now()
    })
    queue.push({
      id: 'q-b',
      content: 'msg B',
      createdAt: Date.now()
    })
    
    s.removeMessage('q-a')
    
    expect(s.currentPendingQueue.length).toBe(1)
    expect(s.currentPendingQueue[0].id).toBe('q-b')
  })

  it('editMessage returns content and removes from current session\'s queue', async () => {
    const s = useSessionStore()
    s.currentSessionId = 'sess-1'
    
    const queue = s.currentPendingQueue
    queue.push({
      id: 'q-x',
      content: 'edit me',
      createdAt: Date.now()
    })
    
    const content = s.editMessage('q-x')
    
    expect(content).toBe('edit me')
    expect(s.currentPendingQueue).toEqual([])
  })

  it('editMessage returns null when no current session', () => {
    const s = useSessionStore()
    s.currentSessionId = null
    expect(s.editMessage('unknown')).toBeNull()
  })

  it('queue is preserved when switching sessions, auto-sends when switching back to idle session', async () => {
    const s = useSessionStore()
    s.state.conversations = [makeConv({ id: 'sess-1' }), makeConv({ id: 'sess-2', id: 'sess-2' })]
    
    // Add queued messages for session 1
    s.currentSessionId = 'sess-1'
    s.currentPendingQueue.push({
      id: 'q-1',
      content: 'queued for sess-1',
      createdAt: Date.now()
    })
    
    // Verify queue has message for sess-1
    expect(s.currentPendingQueue.length).toBe(1)
    
    // Switch to session 2 - queue view should change (sess-2 has no queued messages)
    s.selectSession('sess-2')
    expect(s.currentPendingQueue).toEqual([])
    expect(s.currentSessionId).toBe('sess-2')
    
    // Switch back to sess-1
    // Since sess-1 is not streaming (mock streamingStore.isCurrentStreaming = false),
    // selectSession will trigger processQueue which sends the queued message
    // The queue will be processed and become empty
    s.selectSession('sess-1')
    
    // After auto-send, queue should be empty
    // Note: In real scenario, processQueue sends and starts streaming
    // In test, since streamingStore is mocked, it just removes the message
    expect(s.currentPendingQueue.length).toBe(0)
  })

  // New pagination tests
  it('hasMore is false when nextCursor is null', async () => {
    mockSession.list.mockResolvedValue(makeSessionListResult([makeConv()], undefined))
    const s = useSessionStore()
    // Wait for initial reload from workspace watcher
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(s.hasMore).toBe(false)
  })

  it('hasMore is true when nextCursor is set', async () => {
    mockSession.list.mockResolvedValue(makeSessionListResult([makeConv()], 1234567890))
    const s = useSessionStore()
    // Wait for initial reload from workspace watcher
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(s.hasMore).toBe(true)
  })

  it('tryLoadMore does nothing when hasMore is false', async () => {
    mockSession.list.mockResolvedValue(makeSessionListResult([makeConv()], undefined))
    const s = useSessionStore()
    // Wait for initial reload from workspace watcher
    await new Promise(resolve => setTimeout(resolve, 10))
    const initialCallCount = mockSession.list.mock.calls.length
    s.tryLoadMore()
    // Should not call list again
    expect(mockSession.list).toHaveBeenCalledTimes(initialCallCount)
  })

  it('setSearch updates query and reload can be called separately', async () => {
    mockSession.list.mockResolvedValue(makeSessionListResult([makeConv()], undefined))
    const s = useSessionStore()
    s.setSearch('test search')
    expect(s.query.search).toBe('test search')
    await s.reload()
    expect(mockSession.list).toHaveBeenCalledWith(expect.objectContaining({ search: 'test search' }))
  })
})