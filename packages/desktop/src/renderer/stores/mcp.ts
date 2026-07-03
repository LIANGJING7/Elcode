import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { MCPStatus } from '../../types/ipc'

/**
 * MCP store - Phase 5
 * MCP configuration is global (no directory parameter).
 * Runtime status may still be workspace-specific.
 */
export const useMcpStore = defineStore('mcp', () => {
  const servers = ref<Record<string, MCPStatus>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)
  const connectingServers = reactive(new Set<string>())

  const debouncedLoadStatus = useDebounceFn(async () => {
    loading.value = true
    error.value = null
    try {
      console.log('[McpStore] loadStatus (debounced)')
      const status = await window.desktop.mcp.status()
      console.log('[McpStore] loadStatus result:', JSON.stringify(status).slice(0, 500))
      servers.value = status
    } catch (err) {
      console.error('[McpStore] loadStatus error:', err)
      error.value = err instanceof Error ? err.message : 'Failed to load MCP status'
      servers.value = {}
    } finally {
      loading.value = false
    }
  }, 300)

  async function loadStatusImmediate() {
    loading.value = true
    error.value = null
    try {
      console.log('[McpStore] loadStatusImmediate')
      const status = await window.desktop.mcp.status()
      console.log('[McpStore] loadStatusImmediate result:', JSON.stringify(status).slice(0, 500))
      servers.value = status
    } catch (err) {
      console.error('[McpStore] loadStatusImmediate error:', err)
      error.value = err instanceof Error ? err.message : 'Failed to load MCP status'
      servers.value = {}
    } finally {
      loading.value = false
    }
  }

  async function connect(name: string) {
    connectingServers.add(name)
    try {
      await window.desktop.mcp.connect(name)
      await loadStatusImmediate()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to connect MCP server'
    } finally {
      connectingServers.delete(name)
    }
  }

  async function disconnect(name: string) {
    connectingServers.add(name)
    try {
      await window.desktop.mcp.disconnect(name)
      await loadStatusImmediate()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to disconnect MCP server'
    } finally {
      connectingServers.delete(name)
    }
  }

  function clear() {
    servers.value = {}
    error.value = null
  }

  const serverNames = Object.keys(servers.value).sort()

  return {
    servers,
    serverNames,
    loading,
    error,
    connectingServers,
    loadStatus: debouncedLoadStatus,
    loadStatusImmediate,
    connect,
    disconnect,
    clear
  }
})