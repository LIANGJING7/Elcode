// packages/desktop/src/renderer/stores/subagent.ts

import { defineStore } from 'pinia'
import { ref, computed, shallowReactive } from 'vue'
import type {
  FooterSubagentTab,
  FooterSubagentDetail,
  TabsPatch,
  DetailPatch,
  ConnectionState,
} from '../types/subagent'

export const useSubagentStore = defineStore('subagent', () => {
  // Session binding
  const currentSessionId = ref<string | null>(null)
  const connectionState = ref<ConnectionState>('idle')
  const version = ref(0)
  const loading = ref(false)
  
  // Map structure (O(1) lookup)
  const tabs = shallowReactive(new Map<string, FooterSubagentTab>())
  const details = shallowReactive(new Map<string, FooterSubagentDetail>())
  const activeTabId = ref<string | null>(null)
  
  // Computed (single source of truth)
  const orderedTabs = computed(() =>
    [...tabs.values()].sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt)
  )
  
  const activeTab = computed(() =>
    activeTabId.value ? tabs.get(activeTabId.value) : undefined
  )
  
  const activeDetail = computed(() =>
    activeTabId.value ? details.get(activeTabId.value) : undefined
  )
  
  const watching = computed(() => currentSessionId.value !== null)
  
  // Actions
  async function watch(sessionId: string) {
    // Prevent duplicate watch
    if (currentSessionId.value === sessionId) return
    
    // Unwatch previous session
    if (currentSessionId.value) {
await window.desktop.subagent.unwatch(currentSessionId.value)
    }
    
    currentSessionId.value = sessionId
    connectionState.value = 'connecting'
    loading.value = true
    activeTabId.value = null
    
    try {
      const snapshot = await window.desktop.subagent.watch(sessionId)
      
      // Replace tabs (not clear first)
      tabs.clear()
      for (const tab of snapshot.tabs) {
        tabs.set(tab.sessionID, tab)
      }
      version.value = snapshot.version ?? 0
      
      connectionState.value = 'watching'
      loading.value = false
      
      // Select first tab by default
      if (snapshot.tabs.length > 0) {
        selectTab(snapshot.tabs[0].sessionID)
      }
    } catch (e) {
      connectionState.value = 'error'
      loading.value = false
      tabs.clear()
      details.clear()
      console.error('[SubagentStore] watch failed:', e)
    }
  }
  
  async function unwatch() {
    if (!currentSessionId.value) return
    
    await window.desktop.subagent.unwatch(currentSessionId.value)
    
    currentSessionId.value = null
    connectionState.value = 'idle'
    tabs.clear()
    details.clear()
    activeTabId.value = null
    version.value = 0
  }
  
  function selectTab(sessionId: string) {
    activeTabId.value = sessionId
  }
  
  function removeDetail(sessionId: string) {
    details.delete(sessionId)
  }
  
  // Patch methods
  function updateTabs(data: { sessionId: string; patch: TabsPatch; version: number }) {
    if (data.sessionId !== currentSessionId.value) return
    applyTabsPatch(data.patch, data.version)
  }
  
  function updateDetail(data: { sessionId: string; targetSessionId: string; patches: DetailPatch[]; version: number }) {
    if (data.sessionId !== currentSessionId.value) return
    applyDetailPatch(data.targetSessionId, data.patches, data.version)
  }
  
  function applyTabsPatch(patch: TabsPatch, newVersion: number) {
    // Version check
    if (newVersion <= version.value) return
    version.value = newVersion
    
    // Apply patch
    for (const tab of patch.added) {
      tabs.set(tab.sessionID, tab)
    }
    for (const tab of patch.updated) {
      tabs.set(tab.sessionID, tab)
    }
    for (const id of patch.removed) {
      tabs.delete(id)
      details.delete(id)
    }
  }
  
  function applyDetailPatch(sessionId: string, patches: DetailPatch[], newVersion: number) {
    if (newVersion <= version.value) return
    version.value = newVersion
    
    let detail = details.get(sessionId) ?? { sessionID: sessionId, commits: [] }
    
    for (const patch of patches) {
      if (patch.type === 'append' && patch.commits) {
        detail = { ...detail, commits: [...detail.commits, ...patch.commits] }
      } else if (patch.type === 'replace' && patch.data) {
        detail = { ...detail, ...patch.data }
      }
    }
    
    details.set(sessionId, detail)
  }
  
  return {
    currentSessionId,
    connectionState,
    version,
    loading,
    tabs,
    details,
    activeTabId,
    orderedTabs,
    activeTab,
    activeDetail,
    watching,
    watch,
    unwatch,
    selectTab,
    removeDetail,
    updateTabs,
    updateDetail,
    applyTabsPatch,
    applyDetailPatch,
  }
})