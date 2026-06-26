import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStreamStore } from '../stream'
import { useMessageStore } from '../message'
import type { MessageRepository, StreamEvent } from '../../repositories/MessageRepository'

function mkRepo(): MessageRepository {
  return {
    loadMessages: vi.fn().mockResolvedValue([]),
    subscribeStream: vi.fn(),
    prompt: vi.fn().mockResolvedValue(true),
    interrupt: vi.fn().mockResolvedValue(true),
    deleteMessage: vi.fn().mockResolvedValue(true),
  }
}

describe('streamStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('start 流式期间 streamingMessage 持续以最新 event 覆盖', async () => {
    const repo = mkRepo()
    let emitHandler: ((e: StreamEvent) => void) | null = null
    repo.subscribeStream = vi.fn().mockImplementation((_sid: string, h: (e: StreamEvent) => void) => {
      emitHandler = h
      return () => { emitHandler = null }
    })
    const message = useMessageStore(repo)
    const s = useStreamStore(repo, message)
    s.start('sess-1', 'C:/repo')
    // 模拟两条 message 事件
    emitHandler!({ type: 'message', message: { id: 'm1', role: 'assistant', content: 'hello', timestamp: new Date() } })
    expect(s.streamingMessage?.content).toBe('hello')
    emitHandler!({ type: 'message', message: { id: 'm1', role: 'assistant', content: 'hello world', timestamp: new Date() } })
    expect(s.streamingMessage?.content).toBe('hello world')
    // 完成
    emitHandler!({ type: 'complete' })
    expect(s.streamingMessage).toBeNull()
    expect(message.messages.some(m => m.content === 'hello world')).toBe(true)
  })

  it('interrupt 中断未完成流, 清 streamingMessage, 传 directory', async () => {
    const repo = mkRepo()
    let emitHandler: ((e: StreamEvent) => void) | null = null
    repo.subscribeStream = vi.fn().mockImplementation((_sid, h) => { emitHandler = h; return () => {} })
    repo.interrupt = vi.fn().mockResolvedValue(true)
    const message = useMessageStore(repo)
    const s = useStreamStore(repo, message)
    s.start('sess-1', 'C:/repo')
    emitHandler!({ type: 'message', message: { id: 'm1', role: 'assistant', content: 'x', timestamp: new Date() } })
    await s.interrupt()
    expect(s.streamingMessage).toBeNull()
    // interrupt 应传入 start 时记录的 directory
    expect(repo.interrupt).toHaveBeenCalledWith('sess-1', 'C:/repo')
  })

  it('complete 无 streamingMessage 时不追加空', async () => {
    const repo = mkRepo()
    let emitHandler: ((e: StreamEvent) => void) | null = null
    repo.subscribeStream = vi.fn().mockImplementation((_sid, h) => { emitHandler = h; return () => {} })
    const message = useMessageStore(repo)
    const s = useStreamStore(repo, message)
    s.start('sess-1', 'C:/repo')
    // 直接 complete, 无前置 message 事件
    emitHandler!({ type: 'complete' })
    expect(s.streamingMessage).toBeNull()
    expect(message.messages.length).toBe(0)
  })

  it('tool 事件更新 streamingToolCall', async () => {
    const repo = mkRepo()
    let emitHandler: ((e: StreamEvent) => void) | null = null
    repo.subscribeStream = vi.fn().mockImplementation((_sid, h) => { emitHandler = h; return () => {} })
    const message = useMessageStore(repo)
    const s = useStreamStore(repo, message)
    s.start('sess-1', 'C:/repo')
    emitHandler!({ type: 'tool', toolCall: { name: 'read_file', args: { path: '/src/test.ts' } } })
    const tc = s.streamingToolCall as { name: string } | null
    expect(tc?.name).toBe('read_file')
    expect(s.streamingMessage).toBeNull()
    // complete 清 both
    emitHandler!({ type: 'complete' })
    expect(s.streamingToolCall).toBeNull()
  })
})