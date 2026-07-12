// packages/desktop/src/renderer/stores/subagent.ts

import { defineStore } from 'pinia'
import { ref, computed, shallowReactive, watch as vueWatch } from 'vue'
import type { Message, ToolCall } from '../../types/ipc'
import type {
  FooterSubagentTab,
  FooterSubagentDetail,
  TabsPatch,
  DetailPatch,
  ConnectionState,
  StreamCommit,
} from '../types/subagent'

/**
 * Extract subagent tab data from a task tool call.
 * Matches TUI's taskTab function in subagent-data.ts.
 */
function extractSubagentTab(tool: ToolCall): FooterSubagentTab | null {
  if (tool.name !== 'task') return null
  
  console.log('[DEBUG extractSubagentTab] tool.name:', tool.name, 'tool.id:', tool.id)
  
  // Try structured field first
  let structured = tool.output?.structured as any
  console.log('[DEBUG extractSubagentTab] tool.output?.structured:', structured ? JSON.stringify(structured).slice(0, 200) : 'undefined')
  
  // If structured is undefined, try parsing output.result
  if (!structured && tool.output?.result) {
    try {
      const result = tool.output.result
      console.log('[DEBUG extractSubagentTab] tool.output.result:', typeof result === 'string' ? result.slice(0, 100) : JSON.stringify(result).slice(0, 100))
      if (typeof result === 'string') {
        const parsed = JSON.parse(result)
        structured = parsed?.structured
        console.log('[DEBUG extractSubagentTab] parsed.result.structured:', structured ? JSON.stringify(structured).slice(0, 100) : 'undefined')
      }
    } catch (e) {
      console.warn('[extractSubagentTab] Failed to parse output.result:', e)
    }
  }
  
  const sessionId = structured?.sessionId ?? structured?.sessionID
  console.log('[DEBUG extractSubagentTab] sessionId:', sessionId)
  if (!sessionId) {
    console.warn('[extractSubagentTab] No sessionId in structured:', structured)
    return null
  }
  
  const args = tool.args as Record<string, unknown>
  const label = args.subagent_type ?? args.subagentType ?? 'General'
  const description = args.description ?? structured?.summary ?? ''
  
  return {
    sessionID: sessionId,
    partID: tool.id,
    callID: tool.id,
    label: String(label).charAt(0).toUpperCase() + String(label).slice(1),
    description: String(description),
    status: structured?.state ?? (tool.status === 'completed' ? 'completed' : tool.status === 'error' ? 'error' : 'running'),
    background: false,
    title: structured?.summary,
    toolCalls: structured?.toolCalls,
    lastUpdatedAt: Date.now(),
  }
}

/**
 * Bootstrap subagent tabs from history messages.
 * Matches TUI's bootstrapSubagentData logic.
 */
function bootstrapFromMessages(messages: Message[]): FooterSubagentTab[] {
  const tabs: FooterSubagentTab[] = []
  
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    if (!message.toolCalls) continue
    
    for (const tool of message.toolCalls) {
      const tab = extractSubagentTab(tool)
      if (tab) {
        tabs.push(tab)
      }
    }
  }
  
  return tabs
}

function buildCommitsFromMessages(messages: Message[]): StreamCommit[] {
  const commits: StreamCommit[] = []
  
  for (const msg of messages) {
    if (msg.role === 'user' && msg.content) {
      commits.push({
        kind: 'text',
        text: msg.content,
        phase: 'final',
        source: 'user',
      })
      continue
    }
    
    if (msg.role !== 'assistant') continue

    if (msg.reasoning) {
      commits.push({
        kind: 'reasoning',
        text: msg.reasoning,
        phase: 'final',
        source: 'reasoning',
      })
    }

    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        const status: StreamCommit['toolState'] =
          tc.status === 'completed' ? 'completed'
          : tc.status === 'error' ? 'error'
          : 'running'

        let summary = tc.name
        if (tc.output?.structured) {
          const s = tc.output.structured as Record<string, unknown>
          if (typeof s.summary === 'string') summary = s.summary
          else if (s.type === 'bash' && s.exitCode !== undefined) summary = `${tc.name}: exit ${s.exitCode}`
          else if (s.type === 'read') summary = `${tc.name}: ${(s as any).path ?? ''}`
          else if (s.type === 'task') summary = `${tc.name}: ${(s as any).subagentType ?? 'subagent'}`
        }

        commits.push({
          kind: 'tool',
          text: summary,
          phase: status === 'running' ? 'progress' : 'final',
          source: 'tool',
          tool: tc.name,
          toolState: status,
        })
      }
    }

    if (msg.content && msg.content.trim()) {
      commits.push({
        kind: 'text',
        text: msg.content,
        phase: 'final',
        source: 'assistant',
      })
    }
  }
  
  return commits
}

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
  
  // Debug: log tabs changes
  vueWatch(() => [...tabs.entries()], (entries) => {
    console.log('[DEBUG SubagentStore] tabs updated:', entries.length, 'entries')
    entries.forEach(([id, tab]) => {
      console.log('[DEBUG SubagentStore]   tab:', id.slice(0, 12), 'label:', tab.label, 'status:', tab.status)
    })
  }, { deep: true })
  
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
  async function watch(sessionId: string, messages?: Message[], forceBootstrap?: boolean) {
    // Prevent duplicate watch unless forceBootstrap is true
    if (currentSessionId.value === sessionId && !forceBootstrap) return
    
    // Unwatch previous session if different
    if (currentSessionId.value && currentSessionId.value !== sessionId) {
      await window.desktop.subagent.unwatch(currentSessionId.value)
    }
    
    currentSessionId.value = sessionId
    connectionState.value = 'connecting'
    loading.value = true
    activeTabId.value = null
    
    try {
      // Bootstrap from history messages (TUI-style data extraction)
      // Clear and bootstrap if messages provided OR forceBootstrap is true
      if ((messages && messages.length > 0) || forceBootstrap) {
        tabs.clear()
        details.clear()
        if (messages && messages.length > 0) {
          const historyTabs = bootstrapFromMessages(messages)
          for (const tab of historyTabs) {
            tabs.set(tab.sessionID, tab)
          }
          console.log('[SubagentStore] Bootstrapped from history:', historyTabs.length, 'tabs')
        }
      }
      
      // Also try IPC watch (for future realtime sync)
      // NOTE: IPC may return objects that need serialization
      try {
        const snapshot = await window.desktop.subagent.watch(sessionId)
        
        // Ensure snapshot is plain object (not Proxy)
        const plainSnapshot = JSON.parse(JSON.stringify(snapshot))
        
        // Merge IPC data if available
        for (const tab of plainSnapshot.tabs ?? []) {
          tabs.set(tab.sessionID, tab)
        }
        version.value = plainSnapshot.version ?? 0
      } catch (ipcError) {
        console.warn('[SubagentStore] IPC watch failed (non-critical):', ipcError)
        // Continue without IPC data - history bootstrap is sufficient
      }
      
      // Ensure every tab has a detail entry (even if empty) so the panel renders
      for (const sessionID of tabs.keys()) {
        if (!details.has(sessionID)) {
          details.set(sessionID, {
            sessionID,
            // Child messages are not loaded yet - starts empty, will be populated
            // by future real-time events or on-demand load
            commits: [
              { kind: 'text', text: 'Subagent session data not loaded. Click to navigate.', phase: 'final', source: 'system' },
            ],
          })
        }
      }
      
      connectionState.value = 'watching'
      loading.value = false
      
      // Select first tab by default
      if (tabs.size > 0) {
        selectTab([...tabs.keys()][0])
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
  
  async function loadDetail(sessionId: string, directory?: string) {
    const existing = details.get(sessionId)
    if (existing && existing.commits.length > 0 && existing.commits[0].text !== 'Subagent session data not loaded. Click to navigate.') return existing
    
    try {
      const msgs = await window.desktop.session.messages(sessionId, 200, directory)
      console.log('[SubagentStore] Loaded', msgs.length, 'messages for', sessionId.slice(0, 12))
      msgs.forEach((m, i) => console.log(`[SubagentStore]   msg[${i}] role=${m.role} content=${m.content?.slice(0, 60) || ''} toolCalls=${m.toolCalls?.length || 0}`))
      
      const commits = buildCommitsFromMessages(msgs)
      
      // If first item isn't a user message, prepend the tab description as context
      if (commits.length === 0 || (commits[0].kind === 'reasoning' || commits[0].kind === 'tool')) {
        const tab = tabs.get(sessionId)
        const context = tab?.description || tab?.title || tab?.label || ''
        if (context) {
          commits.unshift({ kind: 'text', text: context, phase: 'final', source: 'assistant' })
        }
      }
      
      details.set(sessionId, {
        sessionID: sessionId,
        commits: commits.length > 0 ? commits : [{ kind: 'text', text: 'No activity recorded.', phase: 'final', source: 'system' }],
      })
      console.log('[SubagentStore] Loaded detail with', commits.length, 'commits')
      return details.get(sessionId)
    } catch (e) {
      console.error('[SubagentStore] Failed to load detail for', sessionId.slice(0, 12), ':', e)
      details.set(sessionId, {
        sessionID: sessionId,
        commits: [{ kind: 'error', text: 'Failed to load subagent session data.', phase: 'final', source: 'system' }],
      })
      return details.get(sessionId)
    }
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
    loadDetail,
    removeDetail,
    updateTabs,
    updateDetail,
    applyTabsPatch,
    applyDetailPatch,
  }
})