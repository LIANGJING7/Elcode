import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { toRaw } from 'vue'
import { useArtifactStore } from '../artifact'
import { useMessageStore } from '../message'
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
  beforeEach(() => setActivePinia(createPinia()))

  it('artifacts 是 computed: 从 messageStore.messages 经 registry 派生', () => {
    const repo = mkRepo()
    const message = useMessageStore(repo)
    // 模拟一条 assistant 消息, 带 2 个 toolCalls: edit_file(命中 diff) + read_file(不命中,进Inspector)
    const tc1: ToolCall = { id: 't1', name: 'edit_file', args: { path: 'a.ts' }, status: 'completed', result: { diff: '@@' } }
    const tc2: ToolCall = { id: 't2', name: 'read_file', args: { path: 'b.ts' }, status: 'completed', result: {} }
    // Pinia composition store 自动 unwrap ref, message.messages 是数组本身
    message.messages = [
      { id: 'm1', role: 'assistant', content: '', timestamp: new Date(), toolCalls: [tc1, tc2] } as Message,
    ]
    const art = useArtifactStore(message)
    // 只有 edit_file 命中 diff renderer; read_file 不命中任何 (tool 不进 artifact, 进 Inspector)
    expect(art.artifacts.length).toBe(1)
    expect(art.artifacts[0].type).toBe('diff')
    expect(art.artifacts[0].id).toBe('t1')  // id === ToolCall.id
    expect(art.artifacts[0].toolCall.name).toBe('edit_file')
  })

  it('删除消息 → computed 重算 → artifact 自动消失', () => {
    const repo = mkRepo()
    const message = useMessageStore(repo)
    const tc: ToolCall = { id: 't1', name: 'edit_file', args: {}, status: 'completed' }
    message.messages = [{ id: 'm1', role: 'assistant', content: '', timestamp: new Date(), toolCalls: [tc] } as Message]
    const art = useArtifactStore(message)
    expect(art.artifacts.length).toBe(1)
    message.messages = []
    expect(art.artifacts.length).toBe(0)
  })

  it('ArtifactInstance.id === ToolCall.id (引用不复制)', () => {
    const repo = mkRepo()
    const message = useMessageStore(repo)
    const tc: ToolCall = { id: 't1', name: 'edit_file', args: {}, status: 'completed' }
    message.messages = [{ id: 'm1', role: 'assistant', content: '', timestamp: new Date(), toolCalls: [tc] } as Message]
    const art = useArtifactStore(message)
    // artifacts[0].toolCall 被 Vue reactive 包装, 用 toRaw 取原始引用
    expect(toRaw(art.artifacts[0].toolCall)).toBe(tc)
  })

  it('todo_write 命中 todo renderer', () => {
    const repo = mkRepo()
    const message = useMessageStore(repo)
    const tc: ToolCall = { id: 't1', name: 'todo_write', args: { todos: [] }, status: 'completed' }
    message.messages = [{ id: 'm1', role: 'assistant', content: '', timestamp: new Date(), toolCalls: [tc] } as Message]
    const art = useArtifactStore(message)
    expect(art.artifacts.length).toBe(1)
    expect(art.artifacts[0].type).toBe('todo')
  })

  it('无 toolCalls 的消息不产生 artifact', () => {
    const repo = mkRepo()
    const message = useMessageStore(repo)
    message.messages = [{ id: 'm1', role: 'user', content: 'hello', timestamp: new Date() } as Message]
    const art = useArtifactStore(message)
    expect(art.artifacts.length).toBe(0)
  })
})