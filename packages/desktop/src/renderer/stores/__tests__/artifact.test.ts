import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { toRaw } from 'vue'
import { useArtifactStore } from '../artifact'
import { useMessageStore, setMessageRepository } from '../message'
import type { MessageRepository } from '../../repositories/MessageRepository'
import type { Message, ToolCall } from '../../../types/ipc'

function mkRepo(): MessageRepository {
  return {
    loadMessages: vi.fn().mockResolvedValue([]),
    subscribeStream: vi.fn(),
    prompt: vi.fn(),
    interrupt: vi.fn(),
    deleteMessage: vi.fn(),
  }
}

describe('artifactStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setMessageRepository(mkRepo())
  })

  it('artifacts 是 computed: 从 messageStore.messages 经 registry 派生', () => {
    const message = useMessageStore()
    const tc1: ToolCall = { id: 't1', name: 'edit_file', args: { path: 'a.ts' }, status: 'completed', result: { diff: '@@' } }
    const tc2: ToolCall = { id: 't2', name: 'read_file', args: { path: 'b.ts' }, status: 'completed', result: {} }
    message.messages = [{ id: 'm1', role: 'assistant', content: '', timestamp: new Date(), toolCalls: [tc1, tc2] } as Message]
    const art = useArtifactStore()
    expect(art.artifacts.length).toBe(1)
    expect(art.artifacts[0].type).toBe('diff')
    expect(art.artifacts[0].id).toBe('t1')
    expect(art.artifacts[0].toolCall.name).toBe('edit_file')
  })

  it('删除消息 → computed 重算 → artifact 自动消失', () => {
    const message = useMessageStore()
    const tc: ToolCall = { id: 't1', name: 'edit_file', args: {}, status: 'completed' }
    message.messages = [{ id: 'm1', role: 'assistant', content: '', timestamp: new Date(), toolCalls: [tc] } as Message]
    const art = useArtifactStore()
    expect(art.artifacts.length).toBe(1)
    message.messages = []
    expect(art.artifacts.length).toBe(0)
  })

  it('ArtifactInstance.id === ToolCall.id (引用不复制)', () => {
    const message = useMessageStore()
    const tc: ToolCall = { id: 't1', name: 'edit_file', args: {}, status: 'completed' }
    message.messages = [{ id: 'm1', role: 'assistant', content: '', timestamp: new Date(), toolCalls: [tc] } as Message]
    const art = useArtifactStore()
    expect(toRaw(art.artifacts[0].toolCall)).toBe(tc)
  })

  it('todo_write 命中 todo renderer', () => {
    const message = useMessageStore()
    const tc: ToolCall = { id: 't1', name: 'todo_write', args: { todos: [] }, status: 'completed' }
    message.messages = [{ id: 'm1', role: 'assistant', content: '', timestamp: new Date(), toolCalls: [tc] } as Message]
    const art = useArtifactStore()
    expect(art.artifacts.length).toBe(1)
    expect(art.artifacts[0].type).toBe('todo')
  })

  it('无 toolCalls 的消息不产生 artifact', () => {
    const message = useMessageStore()
    message.messages = [{ id: 'm1', role: 'user', content: 'hello', timestamp: new Date() } as Message]
    const art = useArtifactStore()
    expect(art.artifacts.length).toBe(0)
  })
})