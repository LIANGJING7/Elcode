// packages/desktop/src/main/ipc/handlers-subagent.ts
// IPC handlers for subagent panel watch/unwatch with reference counting

import { ipcMain } from 'electron'
import type { FooterSubagentTab, FooterSubagentDetail, TabsPatch, DetailPatch, SubagentSnapshot } from '../../types/subagent'
import { IPC_CHANNELS } from '../../types/ipc'

// Reference counting for watches
const watchState = new Map<string, {
  subscribers: Set<number>  // webContents ids
  refCount: number
}>()

// Get FooterService from backend (will need to import)
// This is a placeholder - actual implementation needs backend integration
async function getFooterSnapshot(sessionId: string): Promise<SubagentSnapshot> {
  // TODO: Connect to core FooterService
  // For now return empty
  return { tabs: [], version: 0 }
}

export function registerSubagentHandlers() {
  ipcMain.handle(IPC_CHANNELS.SUBAGENT_WATCH, async (event, sessionId: string) => {
    const webContentsId = event.sender.id
    
    // Reference counting
    const state = watchState.get(sessionId) ?? {
      subscribers: new Set<number>(),
      refCount: 0,
    }
    
    if (!state.subscribers.has(webContentsId)) {
      state.subscribers.add(webContentsId)
      state.refCount++
      watchState.set(sessionId, state)
      
      // TODO: Start actual backend watch
    }
    
    // Return snapshot
    return getFooterSnapshot(sessionId)
  })
  
  ipcMain.handle(IPC_CHANNELS.SUBAGENT_UNWATCH, async (event, sessionId: string) => {
    const webContentsId = event.sender.id
    const state = watchState.get(sessionId)
    
    if (state && state.subscribers.has(webContentsId)) {
      state.subscribers.delete(webContentsId)
      state.refCount--
      
      if (state.refCount === 0) {
        watchState.delete(sessionId)
        // TODO: Stop backend watch
      }
    }
  })
  
  // Cleanup on webContents destroyed
  // This will be handled in app lifecycle
}

// Push functions (called by backend)
// Note: Using channel names from preload (subagent:tabs:update, subagent:detail:update)
export function pushTabsUpdated(
  webContents: Electron.WebContents,
  sessionId: string,
  patch: TabsPatch,
  version: number
) {
  webContents.send('subagent:tabs:update', { sessionId, patch, version })
}

export function pushDetailUpdated(
  webContents: Electron.WebContents,
  sessionId: string,
  targetSessionId: string,
  patches: DetailPatch[],
  version: number
) {
  webContents.send('subagent:detail:update', { sessionId, targetSessionId, patches, version })
}

// Cleanup helper for webContents destroyed
export function cleanupWebContents(webContentsId: number) {
  for (const [sessionId, state] of watchState.entries()) {
    if (state.subscribers.has(webContentsId)) {
      state.subscribers.delete(webContentsId)
      state.refCount--
      
      if (state.refCount === 0) {
        watchState.delete(sessionId)
        // TODO: Stop backend watch
      }
    }
  }
}