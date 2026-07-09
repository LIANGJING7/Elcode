import type { ConfigPatch, ResultP } from '../shared/types/config-patch'

/**
 * LCode Global Config Structure
 */
export interface LCodeGlobalConfig {
  "$schema"?: string
  mcp?: Record<string, McpServerConfig>
  tools?: Record<string, boolean | string>
  agent?: Record<string, unknown>
}

/**
 * MCP Server Configuration
 */
export interface McpServerConfig {
  type: 'local' | 'remote'
  enabled?: boolean
  
  // Local type
  command?: string[]
  cwd?: string
  environment?: Record<string, string>
  
  // Remote type
  url?: string
  headers?: Record<string, string>
  oauth?: {
    clientId?: string
    clientSecret?: string
    scope?: string
  } | false
  
  timeout?: number
}

/**
 * MCP Connection State Machine
 */
export type McpConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'reconnecting'

export interface McpServerStatus {
  state: McpConnectionState
  config?: McpServerConfig
  error?: string
  lastConnected?: string
  reconnectAttempts?: number
}

// Re-export for convenience
export type { ConfigPatch, ResultP }

export type { 
  CustomProviderConfig, 
  ProviderType
} from './custom-provider'
export { 
  PROVIDER_TYPE_TO_NPM,
  PROVIDER_TYPE_LABELS,
  generateDisplayNameFromId,
  validateProviderId,
  validateBaseUrl 
} from './custom-provider'