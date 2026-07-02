import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../types/ipc'
import { backend } from '../backend-client'
import type { MCPStatus, MCPAddPayload } from '../../types/ipc'

/**
 * MCP IPC handlers - Phase 5
 * Core provides /mcp endpoints: GET status, POST add, POST connect/disconnect.
 * Plus tools, prompts, resources endpoints.
 */
export function registerMcpHandlers() {
  // MCP_STATUS: forward to backend GET /mcp
  ipcMain.handle(IPC_CHANNELS.MCP_STATUS, async (_, directory?: string) => {
    try {
      console.log('[McpHandler] status: directory=', directory)
      const status = await backend.mcp.status(directory)
      console.log('[McpHandler] status result:', JSON.stringify(status).slice(0, 500))
      return status as Record<string, MCPStatus>
    } catch (err) {
      console.error('[McpHandler] status error:', err)
      return {}
    }
  })

  // MCP_CONFIG: forward to backend GET /mcp/config
  ipcMain.handle(IPC_CHANNELS.MCP_CONFIG, async (_, directory?: string) => {
    try {
      console.log('[McpHandler] config: directory=', directory)
      const config = await backend.mcp.config(directory)
      console.log('[McpHandler] config result:', JSON.stringify(config).slice(0, 500))
      return config as Record<string, unknown>
    } catch (err) {
      console.error('[McpHandler] config error:', err)
      return {}
    }
  })

  // MCP_ADD: forward to backend POST /mcp
  ipcMain.handle(IPC_CHANNELS.MCP_ADD, async (_, payload: MCPAddPayload, directory?: string) => {
    try {
      // Convert MCPAddPayload to core's AddPayload format
      const config = {
        type: payload.type,
        ...(payload.type === 'local' && payload.command ? { command: payload.command } : {}),
        ...(payload.type === 'remote' && payload.url ? { url: payload.url } : {}),
        ...(payload.enabled !== undefined ? { enabled: payload.enabled } : {}),
        ...(payload.environment ? { environment: payload.environment } : {}),
        ...(payload.timeout ? { timeout: payload.timeout } : {}),
      }
      const result = await backend.mcp.add(payload.name, config, directory)
      return result as Record<string, MCPStatus>
    } catch (err) {
      console.error('[McpHandler] add error:', err)
      return {}
    }
  })

  // MCP_CONNECT: forward to backend POST /mcp/:name/connect
  ipcMain.handle(IPC_CHANNELS.MCP_CONNECT, async (_, name: string, directory?: string) => {
    try {
      const result = await backend.mcp.connect(name, directory)
      return result
    } catch (err) {
      console.error('[McpHandler] connect error:', err)
      return false
    }
  })

  // MCP_DISCONNECT: forward to backend POST /mcp/:name/disconnect
  ipcMain.handle(IPC_CHANNELS.MCP_DISCONNECT, async (_, name: string, directory?: string) => {
    try {
      const result = await backend.mcp.disconnect(name, directory)
      return result
    } catch (err) {
      console.error('[McpHandler] disconnect error:', err)
      return false
    }
  })

  // MCP_TOOLS: forward to backend GET /mcp/tools
  ipcMain.handle(IPC_CHANNELS.MCP_TOOLS, async (_, directory?: string) => {
    try {
      const tools = await backend.mcp.tools(directory)
      return tools as Record<string, unknown[]>
    } catch (err) {
      console.error('[McpHandler] tools error:', err)
      return {}
    }
  })

  // MCP_PROMPTS: forward to backend GET /mcp/prompts
  ipcMain.handle(IPC_CHANNELS.MCP_PROMPTS, async (_, directory?: string) => {
    try {
      const prompts = await backend.mcp.prompts(directory)
      return prompts as Record<string, unknown[]>
    } catch (err) {
      console.error('[McpHandler] prompts error:', err)
      return {}
    }
  })

  // MCP_RESOURCES: forward to backend GET /mcp/resources
  ipcMain.handle(IPC_CHANNELS.MCP_RESOURCES, async (_, directory?: string) => {
    try {
      const resources = await backend.mcp.resources(directory)
      return resources as Record<string, unknown[]>
    } catch (err) {
      console.error('[McpHandler] resources error:', err)
      return {}
    }
  })

  // MCP_SERVER_TOOLS: forward to backend GET /mcp/:name/tools
  ipcMain.handle(IPC_CHANNELS.MCP_SERVER_TOOLS, async (_, name: string, directory?: string) => {
    try {
      const tools = await backend.mcp.serverTools(name, directory)
      return tools as unknown[]
    } catch (err) {
      console.error('[McpHandler] serverTools error:', err)
      return []
    }
  })
}