import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MessageRepository, StreamEvent, Unsubscribe } from '../repositories/MessageRepository'
import type { Message } from '../../types/ipc'

/**
 * 流式消息瞬态 store: 流式生成中的临时状态 (streamingMessage/streamingToolCall).
 * 与 messageStore 分离: messageStore 持稳定历史消息, 本 store 持运行时态.
 * 流 complete 时将 streamingMessage 追加进 messageStore 并清空本 store.
 *
 * 工厂注入 (repo + messageStore):
 * useStreamStore(repo, messageStore) — repo 由 main.ts 创建, messageStore 为同 repo 的实例.
 * 使 store 可测 (传 mock repo + message) 且不直接耦合 window.desktop.
 */
export const useStreamStore = (
  repo: MessageRepository,
  messageStore: { appendMessage: (msg: Message) => void }
) =>
  defineStore('stream', () => {
    const streamingMessage = ref<Message | null>(null)
    const streamingToolCall = ref<unknown | null>(null)
    const activeRun = ref<string | null>(null)
    // directory 作为后端 location hint, 在 start 时记录, interrupt 时透传
    let activeDirectory: string | undefined
    let unsub: Unsubscribe | null = null

    // 启动流式订阅. sessionId 标识当前会话; directory 作 location hint 透传给后端.
    function start(sessionId: string, directory?: string) {
      clear()
      activeRun.value = sessionId
      activeDirectory = directory
      unsub = repo.subscribeStream(sessionId, (e: StreamEvent) => {
        if (e.type === 'message') {
          streamingMessage.value = e.message ?? null
        } else if (e.type === 'tool') {
          streamingToolCall.value = e.toolCall ?? null
        } else if (e.type === 'complete') {
          // complete 时落定: 有 streamingMessage 则追加进 messageStore
          if (streamingMessage.value) {
            messageStore.appendMessage(streamingMessage.value)
          }
          clear()
        }
      })
    }

    // 中断流式生成. 调 repo.interrupt(activeRun, activeDirectory) + 清本 store.
    async function interrupt() {
      if (activeRun.value) {
        await repo.interrupt(activeRun.value, activeDirectory)
      }
      clear()
    }

    // 清瞬态: streamingMessage/streamingToolCall/activeRun/activeDirectory + unsubscribe.
    function clear() {
      streamingMessage.value = null
      streamingToolCall.value = null
      activeRun.value = null
      activeDirectory = undefined
      if (unsub) {
        unsub()
        unsub = null
      }
    }

    return { streamingMessage, streamingToolCall, activeRun, start, interrupt, clear }
  })()