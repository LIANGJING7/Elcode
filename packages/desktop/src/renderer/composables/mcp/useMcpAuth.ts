import { ref } from 'vue'
import type { AuthenticationState } from '../../../types/ipc'

export function useMcpAuth(serverName: string, directory?: string) {
  const authState = ref<AuthenticationState>({ state: 'disabled' })
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function checkAuthStatus() {
    try {
      const status = await window.desktop.mcp.status(directory)
      const serverStatus = status[serverName]
      if (serverStatus) {
        // Determine auth state from backend status
        if (serverStatus.status === 'needs_auth') {
          authState.value = { state: 'required' }
        } else if (serverStatus.status === 'needs_client_registration') {
          authState.value = { state: 'required' }
        } else if (serverStatus.status === 'connected') {
          authState.value = { state: 'authenticated' }
        } else {
          authState.value = { state: 'disabled' }
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to check auth status'
    }
  }

  // Note: OAuth flow methods (startAuth, waitForAuth, logout) 
  // require backend endpoints that may not be fully available yet
  // These are placeholders for future implementation
  
  async function startAuth() {
    loading.value = true
    authState.value.state = 'opening'
    try {
      // TODO: Call backend OAuth start endpoint when available
      // const result = await window.desktop.mcp.authStart(serverName, directory)
      // authState.value = {
      //   state: 'waiting',
      //   authorizationUrl: result.authorizationUrl
      // }
      authState.value.state = 'waiting'
    } catch (err) {
      authState.value.state = 'failed'
      authState.value.error = err instanceof Error ? err.message : 'Auth failed'
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    try {
      // TODO: Call backend OAuth remove endpoint when available
      // await window.desktop.mcp.authRemove(serverName, directory)
      authState.value = { state: 'required' }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Logout failed'
    } finally {
      loading.value = false
    }
  }

  return {
    authState,
    loading,
    error,
    startAuth,
    logout,
    checkAuthStatus
  }
}