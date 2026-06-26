import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createIpcMessageRepository } from '../MessageRepository'

// 薄 IPC adapter: mock 出 preload.session.* 的形状. 直接挂在 jsdom window 上
// (本测试不触发 DOM 事件, 但沿用既定约定, 避免替换整个 window).
const mockSession = {
  create: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  messages: vi.fn(),
  prompt: vi.fn(),
  interrupt: vi.fn(),
  resume: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  onStreamEvent: vi.fn(),
}
;(window as unknown as { desktop: { session: typeof mockSession } }).desktop = { session: mockSession }

describe('MessageRepository (thin IPC adapter)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loadMessages 调 session.messages 并透传 limit/directory', async () => {
    mockSession.messages.mockResolvedValue([{ role: 'user', content: 'hi' }])
    const repo = createIpcMessageRepository()
    const out = await repo.loadMessages('sess-1')
    // adapter: messages(sessionId, limit, directory) — limit/directory 省略即 undefined
    expect(mockSession.messages).toHaveBeenCalledWith('sess-1', undefined, undefined)
    expect(out).toEqual([{ role: 'user', content: 'hi' }])
  })

  it('loadMessages 透传 limit + directory 给后端', async () => {
    mockSession.messages.mockResolvedValue([])
    const repo = createIpcMessageRepository()
    await repo.loadMessages('sess-1', 50, 'C:/repo')
    expect(mockSession.messages).toHaveBeenCalledWith('sess-1', 50, 'C:/repo')
  })

  it('subscribeStream 注册 onStreamEvent 回调, 解包 event, 返回 unsubscribe', () => {
    const unsub = () => {}
    mockSession.onStreamEvent.mockReturnValue(unsub)
    const repo = createIpcMessageRepository()
    const cb = vi.fn()
    const u = repo.subscribeStream('sess-1', cb)
    expect(mockSession.onStreamEvent).toHaveBeenCalled()
    expect(u).toBe(unsub)
    // 验证解包: onStreamEvent 收到 {sessionID, event}, handler 收到 event 本体
    const registered = mockSession.onStreamEvent.mock.calls[0][0] as (data: { sessionID: string; event: unknown }) => void
    registered({ sessionID: 'sess-1', event: { type: 'message', message: { id: 'm1' } } })
    expect(cb).toHaveBeenCalledWith({ type: 'message', message: { id: 'm1' } })
  })

  it('prompt 调 session.prompt 并透传 directory', async () => {
    mockSession.prompt.mockResolvedValue(true)
    const repo = createIpcMessageRepository()
    const out = await repo.prompt('sess-1', [{ type: 'text', text: 'hi' }], 'C:/repo')
    expect(mockSession.prompt).toHaveBeenCalledWith('sess-1', [{ type: 'text', text: 'hi' }], 'C:/repo')
    expect(out).toBe(true)
  })

  it('interrupt 调 session.interrupt 并透传 directory', async () => {
    mockSession.interrupt.mockResolvedValue(true)
    const repo = createIpcMessageRepository()
    await repo.interrupt('sess-1', 'C:/repo')
    expect(mockSession.interrupt).toHaveBeenCalledWith('sess-1', 'C:/repo')
  })

  it('deleteMessage 调 session.delete 并透传 directory', async () => {
    mockSession.delete.mockResolvedValue(true)
    const repo = createIpcMessageRepository()
    const out = await repo.deleteMessage('sess-1', 'C:/repo')
    expect(mockSession.delete).toHaveBeenCalledWith('sess-1', 'C:/repo')
    expect(out).toBe(true)
  })
})
