import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWorkspaceStore } from './workspace'
import { useSessionStore } from './session'

export interface PermissionRequest {
  id: string
  sessionID: string
  permission: string
  patterns: string[]
  metadata: Record<string, unknown>
  always: string[]
  tool?: {
    messageID: string
    callID: string
  }
}

export const usePermissionStore = defineStore('permission', () => {
  const requests = ref<Map<string, PermissionRequest[]>>(new Map())
  const workspaceStore = useWorkspaceStore()
  const sessionStore = useSessionStore()

  const currentRequests = computed(() => {
    // Only return requests for the current session
    const sessionId = sessionStore.currentSessionId
    if (!sessionId) return []
    return requests.value.get(sessionId) ?? []
  })

  const hasPending = computed(() => currentRequests.value.length > 0)

  function addRequest(request: PermissionRequest) {
    const sessionID = request.sessionID
    const existing = requests.value.get(sessionID) ?? []
    const idx = existing.findIndex(r => r.id === request.id)
    if (idx >= 0) {
      existing[idx] = request
    } else {
      existing.push(request)
    }
    requests.value.set(sessionID, [...existing])
  }

  function removeRequest(sessionID: string, requestID: string) {
    const existing = requests.value.get(sessionID)
    if (!existing) return
    const idx = existing.findIndex(r => r.id === requestID)
    if (idx >= 0) {
      existing.splice(idx, 1)
      requests.value.set(sessionID, [...existing])
    }
  }

  async function reply(requestID: string, reply: 'once' | 'always' | 'reject', message?: string) {
    const directory = workspaceStore.currentWorkspace?.path
    
    // Find the request to get sessionID
    let sessionID: string | undefined
    for (const [sid, reqs] of requests.value) {
      const found = reqs.find(r => r.id === requestID)
      if (found) {
        sessionID = sid
        break
      }
    }

    try {
      await window.desktop.session.permissionReply(requestID, reply, directory)
      if (sessionID) {
        removeRequest(sessionID, requestID)
      }
    } catch (error) {
      console.error('[Permission] Failed to reply:', error)
      throw error
    }
  }

  return {
    requests,
    currentRequests,
    hasPending,
    addRequest,
    removeRequest,
    reply,
  }
})