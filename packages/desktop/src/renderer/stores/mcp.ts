import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { MCPStatus, MCPAddPayload } from '../../types/ipc'

/**
 * MCP store - Phase 5
 * Core provides MCP status, add, connect, disconnect endpoints.
 */
export const useMcpStore = defineStore('mcp', () => {
  const servers = ref<Record<string, MCPStatus>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Debounced loadStatus to avoid frequent API calls (300ms debounce)
  const debouncedLoadStatus = useDebounceFn(async (directory?: string) => {
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
  }, 300)

  // Immediate loadStatus for cases where debounce is not desired
  async function loadStatusImmediate(directory?: string) {
    loading.value = true
    error.value = null
    try {
      console.log('[McpStore] loadStatusImmediate: directory=', directory)
      const status = await window.desktop.mcp.status(directory)
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
      // Refresh status after connect (immediate, no debounce)
      await loadStatusImmediate(directory)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to connect MCP server'
    }
  }

  async function disconnect(name: string, directory?: string) {
    try {
      await window.desktop.mcp.disconnect(name, directory)
      // Refresh status after disconnect (immediate, no debounce)
      await loadStatusImmediate(directory)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to disconnect MCP server'
    }
  }

  async function removeServer(name: string, directory?: string) {
    loading.value = true
    error.value = null
    try {
      console.log('[McpStore] removeServer: name=', name, 'directory=', directory)
      const result = await window.desktop.mcp.remove(name, directory)
      console.log('[McpStore] removeServer result:', result)
      if (result.success) {
        // Remove from local state
        delete servers.value[name]
        // Refresh status from backend (immediate, no debounce)
        await loadStatusImmediate(directory)
      }
      return result
    } catch (err) {
      console.error('[McpStore] removeServer error:', err)
      error.value = err instanceof Error ? err.message : 'Failed to remove MCP server'
      return { success: false }
    } finally {
      loading.value = false
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
    loadStatus: debouncedLoadStatus,
    loadStatusImmediate,
    addServer,
    connect,
    disconnect,
    removeServer,
    clear
  }
})