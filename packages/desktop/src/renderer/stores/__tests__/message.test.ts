import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMessageStore, setMessageRepository } from '../message'
import type { MessageRepository } from '../../repositories/MessageRepository'
import type { Message } from '../../../types/ipc'

function mkRepo(): MessageRepository {
  return {
    loadMessages: vi.fn().mockResolvedValue([{ id: 'm1', role: 'assistant', content: 'hi', timestamp: new Date() } as Message]),
    subscribeStream: vi.fn(),
    prompt: vi.fn(),
    interrupt: vi.fn(),
    deleteMessage: vi.fn(),
  }
}

describe('messageStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setMessageRepository(mkRepo())
  })

  it('load 设置 messages 与 sessionId/directory, 调 repo.loadMessages', async () => {
    const repo = mkRepo()
    setMessageRepository(repo)
    const m = useMessageStore()
    await m.load('sess-1', 'C:/repo')
    expect(repo.loadMessages).toHaveBeenCalledWith('sess-1', undefined, 'C:/repo')
    expect(m.messages.length).toBe(1)
    expect(m.sessionId).toBe('sess-1')
    expect(m.directory).toBe('C:/repo')
  })

  it('clear 清空 messages 与 sessionId', () => {
    const m = useMessageStore()
    m.messages = [{ id: 'x', role: 'user', content: 'x', timestamp: new Date() } as Message]
    m.clear()
    expect(m.messages).toEqual([])
    expect(m.sessionId).toBeNull()
    expect(m.directory).toBeUndefined()
  })

  it('appendMessage 追加稳定消息 (流式完成时调)', () => {
    const m = useMessageStore()
    m.appendMessage({ id: 'a', role: 'assistant', content: 'done', timestamp: new Date() } as Message)
    expect(m.messages.length).toBe(1)
    expect(m.messages[0]).toMatchObject({ id: 'a', content: 'done' })
  })

  it('load 切换会话时覆盖旧 messages (不复用)', async () => {
    const repo = mkRepo()
    setMessageRepository(repo)
    const m = useMessageStore()
    await m.load('sess-1', 'C:/repo')
    expect(m.messages.length).toBe(1)
    repo.loadMessages = vi.fn().mockResolvedValue([])
    await m.load('sess-2', 'C:/other')
    expect(m.sessionId).toBe('sess-2')
    expect(m.directory).toBe('C:/other')
    expect(m.messages).toEqual([])
  })
})