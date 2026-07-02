import { ref } from 'vue'

export function useMcpConnection(serverName: string, directory?: string) {
  const testing = ref(false)
  const testResult = ref<{ success: boolean; latency?: number; error?: string } | null>(null)

  async function testConnection() {
    testing.value = true
    testResult.value = null
    try {
      const startTime = Date.now()
      await window.desktop.mcp.connect(serverName, directory)
      const latency = Date.now() - startTime
      await window.desktop.mcp.disconnect(serverName, directory)
      testResult.value = {
        success: true,
        latency
      }
    } catch (err) {
      testResult.value = {
        success: false,
        error: err instanceof Error ? err.message : 'Connection test failed'
      }
    } finally {
      testing.value = false
    }
  }

  async function connect() {
    testing.value = true
    try {
      await window.desktop.mcp.connect(serverName, directory)
      testResult.value = { success: true }
    } catch (err) {
      testResult.value = {
        success: false,
        error: err instanceof Error ? err.message : 'Connect failed'
      }
    } finally {
      testing.value = false
    }
  }

  async function disconnect() {
    testing.value = true
    try {
      await window.desktop.mcp.disconnect(serverName, directory)
      testResult.value = null
    } catch (err) {
      testResult.value = {
        success: false,
        error: err instanceof Error ? err.message : 'Disconnect failed'
      }
    } finally {
      testing.value = false
    }
  }

  return {
    testing,
    testResult,
    testConnection,
    connect,
    disconnect
  }
}