import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../types/ipc'
import { backend } from '../backend-client'
import type { MCPStatus, MCPAddPayload } from '../../types/ipc'

/**
 * MCP IPC handlers - Phase 5
 * Core provides /mcp endpoints: GET status, POST add, POST connect/disconnect.
 */
export function registerMcpHandlers() {
  // MCP_STATUS: forward to backend GET /mcp
  ipcMain.handle(IPC_CHANNELS.MCP_STATUS, async (_, directory?: string) => {
    try {
      const status = await backend.mcp.status(directory)
      return status as Record<string, MCPStatus>
    } catch (err) {
      console.error('[McpHandler] status error:', err)
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
}