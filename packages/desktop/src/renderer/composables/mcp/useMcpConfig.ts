import { ref, computed } from 'vue'
import type { McpConfig, McpServerStatus, MCPStatus } from '../../../types/ipc'

// Backend config shape (ConfigMCPV1.Info = Local | Remote)
interface BackendLocalConfig {
  type: 'local'
  command: string[]
  environment?: Record<string, string>
  enabled?: boolean
  timeout?: number
}

interface BackendRemoteConfig {
  type: 'remote'
  url: string
  enabled?: boolean
  headers?: Record<string, string>
  oauth?: { clientId?: string; clientSecret?: string; scope?: string } | false
  timeout?: number
}

type BackendMcpConfig = BackendLocalConfig | BackendRemoteConfig

export function useMcpConfig() {
  const servers = ref<Record<string, McpServerStatus>>({})
  const configs = ref<Record<string, McpConfig>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadConfig(directory?: string) {
    loading.value = true
    error.value = null
    try {
      // Fetch both status and config in parallel
      const [statusResult, configResult] = await Promise.all([
        window.desktop.mcp.status(directory),
        window.desktop.mcp.config(directory)
      ])

      // Convert MCPStatus to McpServerStatus format
      const convertedStatus: Record<string, McpServerStatus> = {}
      for (const [name, s] of Object.entries(statusResult)) {
        convertedStatus[name] = {
          status: convertStatus(s.status),
          error: s.error
        }
      }
      servers.value = convertedStatus

      // Convert backend config to frontend McpConfig format
      const convertedConfig: Record<string, McpConfig> = {}
      for (const [name, cfg] of Object.entries(configResult)) {
        convertedConfig[name] = convertBackendConfig(name, cfg as BackendMcpConfig)
      }
      configs.value = convertedConfig
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
      // Reload both status and config after add
      await loadConfig(directory)
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
    configs,
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
      return 'auth_required'
    default:
      return 'disabled'
  }
}

// Convert backend ConfigMCPV1.Info to frontend McpConfig
function convertBackendConfig(name: string, cfg: BackendMcpConfig): McpConfig {
  if (cfg.type === 'local') {
    // command is string[] where [0] is the command, [1..] are args
    const [command, ...args] = cfg.command
    return {
      name,
      type: 'local',
      enabled: cfg.enabled,
      command: command || '',
      args: args.length > 0 ? args : undefined,
      environment: cfg.environment,
      timeout: cfg.timeout
    }
  } else {
    return {
      name,
      type: 'remote',
      enabled: cfg.enabled,
      url: cfg.url,
      headers: cfg.headers,
      oauth: cfg.oauth,
      timeout: cfg.timeout
    }
  }
}