import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MessageRepository } from '../repositories/MessageRepository'
import type { Message } from '../../types/ipc'

// Global repo set at app startup (main.ts)
let _repo: MessageRepository | null = null

export function setMessageRepository(repo: MessageRepository) {
  _repo = repo
}

/**
 * 稳定消息 store: 当前会话的历史消息列表 + 当前 sessionId/directory.
 * 流式中的瞬态消息不落这里(见 streamStore), 仅在流 complete 时 appendMessage 落定.
 *
 * Repo 经 setMessageRepository 在 main.ts 设置, 不直接耦合 window.desktop.
 */
export const useMessageStore = defineStore('message', () => {
  const messages = ref<Message[]>([])
  const sessionId = ref<string | null>(null)
  const directory = ref<string | undefined>(undefined)

  async function load(sid: string, dir?: string) {
    if (!_repo) throw new Error('MessageRepository not set. Call setMessageRepository first.')
    sessionId.value = sid
    directory.value = dir
    const list = await _repo.loadMessages(sid, undefined, dir)
    messages.value = list
  }

  function clear() {
    messages.value = []
    sessionId.value = null
    directory.value = undefined
  }

  function appendMessage(msg: Message) {
    messages.value.push(msg)
  }

  return { messages, sessionId, directory, load, clear, appendMessage }
})