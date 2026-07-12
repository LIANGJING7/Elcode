// 薄薄一层 IPC adapter: store 不直接 import preload/IPC, 只经此接口 —
// 为日后切 SQLite/远程后端留路. 当前实现直接转发现有 preload.session.*.

import type { Message, PromptInput } from '../../types/ipc'

/** 流事件: onStreamEvent 回调收到的 `event` 本体(已从 {sessionID, event} 解包). */
export interface StreamEvent {
  type: 'message' | 'complete' | 'tool' | 'reasoning' | string
  message?: Message
  toolCall?: unknown
  [key: string]: unknown
}

export type StreamHandler = (event: StreamEvent) => void
export type Unsubscribe = () => void

/**
 * 消息仓储接口. store 通过此接口读写会话消息与流, 不直接触碰 window.desktop.
 * 这层抽象让后续可替换为 SQLite 本地缓存或远程后端, 而不动 store 逻辑.
 */
export interface MessageRepository {
  /** 加载某会话的历史消息. limit 省略时后端默认 100 条; directory 是后端 location hint. */
  loadMessages(sessionId: string, limit?: number, directory?: string): Promise<Message[]>
  /** 订阅流事件. 返回 unsubscribe. 注意: 当前订阅的是全局流, store 需按 sessionId 过滤. */
  subscribeStream(sessionId: string, handler: StreamHandler): Unsubscribe
  /** 发送 prompt. directory 是后端 location hint. */
  prompt(sessionId: string, prompt: PromptInput[], directory?: string): Promise<boolean>
  /** 中断当前会话的流式生成. directory 是后端 location hint. */
  interrupt(sessionId: string, directory?: string): Promise<boolean>
  /** 删除会话(等同清空消息). directory 是后端 location hint. */
  deleteMessage(sessionId: string, directory?: string): Promise<boolean>
}

/**
 * 创建基于 preload IPC 的 MessageRepository.
 * window.desktop 的全局类型由 src/types/window.d.ts 声明, 这里直接使用.
 */
export function createIpcMessageRepository(): MessageRepository {
  return {
    loadMessages: (sessionId, limit, directory) =>
      window.desktop.session.messages(sessionId, limit, directory),
    subscribeStream: (_sessionId, handler) =>
      window.desktop.session.onStreamEvent((data) => {
        // data === {sessionID, event}; handler 收 event 本体
        handler(data.event as StreamEvent)
      }),
    prompt: (sessionId, prompt, directory) =>
      window.desktop.session.prompt(sessionId, prompt, undefined, directory),
    interrupt: (sessionId, directory) =>
      window.desktop.session.interrupt(sessionId, directory),
    deleteMessage: (sessionId, directory) =>
      window.desktop.session.delete(sessionId, directory),
  }
}
