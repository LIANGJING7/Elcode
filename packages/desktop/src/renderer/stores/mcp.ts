import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MCPStatus, MCPAddPayload } from '../../types/ipc'

/**
 * MCP store - Phase 5
 * Core provides MCP status, add, connect, disconnect endpoints.
 */
export const useMcpStore = defineStore('mcp', () => {
  const servers = ref<Record<string, MCPStatus>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadStatus(directory?: string) {
    loading.value = true
    error.value = null
    try {
      console.log('[McpStore] loadStatus: directory=', directory)
      const status = await window.desktop.mcp.status(directory)
      console.log('[McpStore] loadStatus result:', JSON.stringify(status).slice(0, 500))
      servers.value = status
    } catch (err) {
      console.error('[McpStore] loadStatus error:', err)
      error.value = err instanceof Error ? err.message : 'Failed to load MCP status'
      servers.value = {}
    } finally {
      loading.value = false
    }
  }

  async function addServer(payload: MCPAddPayload, directory?: string) {
    loading.value = true
    error.value = null
    try {
      const status = await window.desktop.mcp.add(payload, directory)
      servers.value = status
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add MCP server'
    } finally {
      loading.value = false
    }
  }

  async function connect(name: string, directory?: string) {
    try {
      await window.desktop.mcp.connect(name, directory)
      // Refresh status after connect
      await loadStatus(directory)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to connect MCP server'
    }
  }

  async function disconnect(name: string, directory?: string) {
    try {
      await window.desktop.mcp.disconnect(name, directory)
      // Refresh status after disconnect
      await loadStatus(directory)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to disconnect MCP server'
    }
  }

  function clear() {
    servers.value = {}
    error.value = null
  }

  // Computed: server names sorted alphabetically
  const serverNames = Object.keys(servers.value).sort()

  return {
    servers,
    serverNames,
    loading,
    error,
    loadStatus,
    addServer,
    connect,
    disconnect,
    clear
  }
})