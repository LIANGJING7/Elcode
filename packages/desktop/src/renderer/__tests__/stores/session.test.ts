import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSessionStore } from '../../stores/session'
import type { Conversation } from '../../../types/ipc'

const mockDesktop = {
  session: {
    create: vi.fn(),
    sendMessage: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
    onStreamData: vi.fn(() => vi.fn()),
    onStreamEnd: vi.fn(() => vi.fn())
  }
}

;(globalThis as any).window = { desktop: mockDesktop }

describe('SessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with empty state', () => {
    const store = useSessionStore()
    expect(store.currentSessionId).toBeNull()
    expect(store.conversations).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('should create session successfully', async () => {
    mockDesktop.session.create.mockResolvedValue('session-123')
    mockDesktop.session.list.mockResolvedValue([
      { id: 'session-123', title: 'New Chat', messages: [], createdAt: new Date(), updatedAt: new Date() }
    ] as Conversation[])
    
    const store = useSessionStore()
    await store.createSession('/path/to/workspace')
    
    expect(store.currentSessionId).toBe('session-123')
    expect(mockDesktop.session.create).toHaveBeenCalledWith('/path/to/workspace')
  })

  it('should set isLoading during operations', async () => {
    mockDesktop.session.list.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    const store = useSessionStore()
    const promise = store.loadConversations()
    
    expect(store.isLoading).toBe(true)
    await promise
    expect(store.isLoading).toBe(false)
  })

  it('should select session', () => {
    const store = useSessionStore()
    store.selectSession('session-456')
    expect(store.currentSessionId).toBe('session-456')
  })

  it('should compute currentConversation correctly', () => {
    const store = useSessionStore()
    store.conversations = [
      { id: 'session-1', title: 'Chat 1', messages: [], createdAt: new Date(), updatedAt: new Date() },
      { id: 'session-2', title: 'Chat 2', messages: [], createdAt: new Date(), updatedAt: new Date() }
    ] as Conversation[]
    store.currentSessionId = 'session-2'
    expect(store.currentConversation?.title).toBe('Chat 2')
  })
})