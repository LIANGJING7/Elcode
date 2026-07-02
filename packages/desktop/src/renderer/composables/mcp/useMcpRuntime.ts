import { ref, onMounted, onUnmounted } from 'vue'
import type { McpRuntimeState, ToolInfo, ResourceInfo, PromptInfo, McpServerStatus } from '../../../types/ipc'

export function useMcpRuntime(serverName: string, directory?: string) {
  const runtime = ref<McpRuntimeState | null>(null)
  const tools = ref<ToolInfo[]>([])
  const resources = ref<ResourceInfo[]>([])
  const prompts = ref<PromptInfo[]>([])
  const capabilities = ref<Record<string, boolean>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  let pollInterval: ReturnType<typeof setInterval> | null = null

  async function fetchRuntimeState() {
    loading.value = true
    try {
      const status = await window.desktop.mcp.status(directory)
      const serverStatus = status[serverName]
      if (serverStatus) {
        // Note: Extended fields not yet available from backend
        // When backend supports them, populate runtime, tools, etc.
        runtime.value = null // Placeholder for future backend support
        tools.value = []
        resources.value = []
        prompts.value = []
        capabilities.value = {}
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch runtime'
    } finally {
      loading.value = false
    }
  }

  function startPolling(intervalMs = 5000) {
    fetchRuntimeState()
    pollInterval = setInterval(fetchRuntimeState, intervalMs)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  onMounted(() => startPolling())
  onUnmounted(() => stopPolling())

  return {
    runtime,
    tools,
    resources,
    prompts,
    capabilities,
    loading,
    error,
    fetchRuntimeState,
    startPolling,
    stopPolling
  }
}