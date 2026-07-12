import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MessageRepository, StreamEvent, Unsubscribe } from '../repositories/MessageRepository'
import type { Message } from '../../types/ipc'

// Global dependencies set at app startup (main.ts)
let _repo: MessageRepository | null = null
let _messageStore: { appendMessage: (msg: Message) => void } | null = null

export function setStreamDependencies(repo: MessageRepository, messageStore: { appendMessage: (msg: Message) => void }) {
  _repo = repo
  _messageStore = messageStore
}

/**
 * 流式消息瞬态 store: streamingMessage/streamingToolCall/activeRun.
 * 与 messageStore 分离: messageStore 持稳定历史消息, 本 store 持运行时态.
 * 流 complete 时将 streamingMessage 追加进 messageStore 并清空本 store.
 */
export const useStreamStore = defineStore('stream', () => {
  const streamingMessage = ref<Message | null>(null)
  const streamingToolCall = ref<unknown | null>(null)
  const activeRun = ref<string | null>(null)
  let activeDirectory: string | undefined
  let unsub: Unsubscribe | null = null

  function start(sessionId: string, directory?: string) {
    if (!_repo || !_messageStore) throw new Error('StreamDependencies not set. Call setStreamDependencies first.')
    clear()
    activeRun.value = sessionId
    activeDirectory = directory
    unsub = _repo.subscribeStream(sessionId, (e: StreamEvent) => {
      if (e.type === 'message') {
        streamingMessage.value = e.message ?? null
      } else if (e.type === 'tool') {
        streamingToolCall.value = e.toolCall ?? null
      } else if (e.type === 'complete') {
        if (streamingMessage.value && _messageStore) {
          _messageStore.appendMessage(streamingMessage.value)
        }
        clear()
      }
    })
  }

  async function interrupt() {
    if (!_repo) throw new Error('MessageRepository not set.')
    if (activeRun.value) {
      await _repo.interrupt(activeRun.value, activeDirectory)
    }
    clear()
  }

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
})