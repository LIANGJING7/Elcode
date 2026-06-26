import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MessageRepository } from '../repositories/MessageRepository'
import type { Message } from '../../types/ipc'

/**
 * 稳定消息 store: 当前会话的历史消息列表 + 当前 sessionId/directory.
 * 流式中的瞬态消息不落这里(见 streamStore), 仅在流 complete 时 appendMessage 落定.
 *
 * 工厂注入 repo: useMessageStore(repo) — repo 由 main.ts 在启动时创建并注入,
 * 使 store 可测(传 mock repo)且不直接耦合 window.desktop.
 */
export const useMessageStore = (repo: MessageRepository) =>
  defineStore('message', () => {
    const messages = ref<Message[]>([])
    const sessionId = ref<string | null>(null)
    const directory = ref<string | undefined>(undefined)

    // load 切会话时调用. limit 本阶段不传(后端默认 100), directory 作 location hint 透传.
    async function load(sid: string, dir?: string) {
      sessionId.value = sid
      directory.value = dir
      const list = await repo.loadMessages(sid, undefined, dir)
      messages.value = list
    }

    function clear() {
      messages.value = []
      sessionId.value = null
      directory.value = undefined
    }

    // 流 complete 时由 streamStore 调用, 把稳定消息追加进列表.
    function appendMessage(msg: Message) {
      messages.value.push(msg)
    }

    return { messages, sessionId, directory, load, clear, appendMessage }
  })()
