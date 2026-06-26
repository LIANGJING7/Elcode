import { defineStore } from 'pinia'
import { computed } from 'vue'
import { pickArtifactType, type ArtifactInstance } from '../artifacts/artifactRegistry'
import type { ToolCall } from '../../types/ipc'
import '../artifacts/renderers' // side-effect 注册 diff/todo renderer
import { useMessageStore } from './message'

/**
 * 产物 store: computed 派生自 messageStore.messages.
 * 不持久化, 不有自己的 state, 只有 artifacts computed.
 * 每个 ArtifactInstance.id === toolCall.id (引用关联, 不复制对象).
 */
export const useArtifactStore = defineStore('artifact', () => {
  const artifacts = computed<ArtifactInstance[]>(() => {
    const messageStore = useMessageStore()
    return messageStore.messages
      .flatMap((m) => m.toolCalls ?? [])
      .map((tc: ToolCall) => {
        const type = pickArtifactType(tc.name)
        return type
          ? { id: tc.id, type, toolCall: tc, props: tc.args } as ArtifactInstance
          : null
      })
      .filter((x): x is ArtifactInstance => x !== null)
  })

  return { artifacts }
})