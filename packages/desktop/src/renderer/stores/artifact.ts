import { defineStore } from 'pinia'
import { computed } from 'vue'
import { pickArtifactType, type ArtifactInstance } from '../artifacts/artifactRegistry'
import type { ToolCall } from '../../types/ipc'
import '../artifacts/renderers' // side-effect 注册 diff/todo renderer

/**
 * 产物 store: computed 派生自 messageStore.messages.
 * 不持久化, 不有自己的 state, 只有 artifacts computed.
 * 每个 ArtifactInstance.id === toolCall.id (引用关联, 不复制对象).
 *
 * 工厂注入: useArtifactStore(messageStore) — messageStore 为同 repo 的实例.
 * 注意: Pinia composition store 自动 unwrap ref, 所以 messageStore.messages 是数组本身, 非 Ref.
 */
export const useArtifactStore = (
  messageStore: { messages: Array<{ toolCalls?: ToolCall[] }> }
) =>
  defineStore('artifact', () => {
    const artifacts = computed<ArtifactInstance[]>(() => {
      // Pinia composition store unwrap 了 ref, messages 直接是数组
      // 但 Vue reactivity 仍跟踪 underlying ref, computed 会响应变化
      return messageStore.messages
        .flatMap((m) => m.toolCalls ?? [])
        .map((tc) => {
          const type = pickArtifactType(tc.name)
          return type
            ? { id: tc.id, type, toolCall: tc, props: tc.args } as ArtifactInstance
            : null
        })
        .filter((x): x is ArtifactInstance => x !== null)
    })

    return { artifacts }
  })()