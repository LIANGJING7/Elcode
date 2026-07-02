import { ref, computed } from 'vue'
import type { McpConfig, McpServerStatus, MCPStatus } from '../../../types/ipc'

export function useMcpConfig() {
  const servers = ref<Record<string, McpServerStatus>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadConfig(directory?: string) {
    loading.value = true
    error.value = null
    try {
      const status = await window.desktop.mcp.status(directory)
      // Convert MCPStatus to McpServerStatus format
      const converted: Record<string, McpServerStatus> = {}
      for (const [name, s] of Object.entries(status)) {
        converted[name] = {
          status: convertStatus(s.status),
          error: s.error
        }
      }
      servers.value = converted
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load MCP config'
    } finally {
      loading.value = false
    }
  }

  async function addServer(config: McpConfig, directory?: string) {
    loading.value = true
    try {
      const payload = {
        name: config.name,
        type: config.type,
        enabled: config.enabled ?? true,
        command: config.command ? [config.command, ...config.args || []] : undefined,
        url: config.url,
        environment: config.environment,
        timeout: config.timeout
      }
      const status = await window.desktop.mcp.add(payload, directory)
      // Convert and update servers
      const converted: Record<string, McpServerStatus> = {}
      for (const [name, s] of Object.entries(status)) {
        converted[name] = {
          status: convertStatus(s.status),
          error: s.error
        }
      }
      servers.value = converted
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add server'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function connectServer(name: string, directory?: string) {
    loading.value = true
    try {
      await window.desktop.mcp.connect(name, directory)
      await loadConfig(directory)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to connect server'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function disconnectServer(name: string, directory?: string) {
    loading.value = true
    try {
      await window.desktop.mcp.disconnect(name, directory)
      await loadConfig(directory)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to disconnect server'
      throw err
    } finally {
      loading.value = false
    }
  }

  function validateConfig(config: McpConfig): string[] {
    const errors: string[] = []
    
    if (!config.name?.trim()) {
      errors.push('Server name is required')
    }
    
    if (config.type === 'local') {
      if (!config.command?.trim()) {
        errors.push('Command is required for local servers')
      }
    } else {
      if (!config.url?.trim()) {
        errors.push('URL is required for remote servers')
      }
      try {
        new URL(config.url!)
      } catch {
        errors.push('Invalid URL format')
      }
    }
    
    return errors
  }

  return {
    servers,
    loading,
    error,
    loadConfig,
    addServer,
    connectServer,
    disconnectServer,
    validateConfig
  }
}

// Convert backend status to frontend status
function convertStatus(status: MCPStatus['status']): McpServerStatus['status'] {
  switch (status) {
    case 'connected':
      return 'connected'
    case 'disabled':
      return 'disabled'
    case 'failed':
      return 'failed'
    case 'needs_auth':
      return 'auth_required'
    case 'needs_client_registration':
      return 'auth_required' // Treat as auth required for UI
    default:
      return 'disabled'
  }
}