import { ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../types/ipc'
import type { Message, Conversation, LocationRef, PromptInput, PromptOptions, Workspace, SkillInfo, MCPStatus, MCPAddPayload, AuthMethod, AuthorizationResult, ConsoleState, ModelRef } from '../types/ipc'
import type { SessionListQuery, SessionListResult } from '../types/session'

export const desktopAPI = {
  session: {
    create: (location: LocationRef): Promise<string> => 
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_CREATE, location),
    
    get: (sessionID: string, directory?: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET, sessionID, directory),
    
    list: (query?: SessionListQuery): Promise<SessionListResult> => {
      console.log('[PRELOAD_SESSION_LIST] Invoking with query:', JSON.stringify(query))
      return ipcRenderer.invoke(IPC_CHANNELS.SESSION_LIST, query).then((result) => {
        console.log('[PRELOAD_SESSION_LIST] Result received:', JSON.stringify(result).slice(0, 300))
        return result
      }).catch((err) => {
        console.error('[PRELOAD_SESSION_LIST] Error:', err)
        throw err
      })
    },
    
    messages: (sessionID: string, limit?: number, directory?: string): Promise<Message[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_MESSAGES, sessionID, limit, directory),
    
    prompt: (sessionID: string, prompt: PromptInput[], options?: PromptOptions, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_PROMPT, sessionID, prompt, options, directory),
    
    interrupt: (sessionID: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_INTERRUPT, sessionID, directory),
    
    resume: (sessionID: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_RESUME, sessionID, directory),
    
    delete: (sessionId: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_DELETE, sessionId, directory),

    update: (sessionID: string, patch: { title?: string }, directory?: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_UPDATE, sessionID, patch, directory),
    
    onStreamEvent: (callback: (data: { sessionID: string; event: unknown }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { sessionID: string; event: unknown }) => {
        const e = data.event as Record<string, unknown>
        // Log all events with more detail for session events
        if (e?.type) {
          // DEBUG: Enhanced logging for content events
          if (e.type.startsWith('session.next.') || e.type.startsWith('message.part')) {
            console.log('[SSE PRELOAD] CONTENT event:', e.type, 'full:', JSON.stringify(e).slice(0, 500))
          } else if (e.type.startsWith('server.')) {
            console.log('[SSE PRELOAD] server event:', e.type)
          } else if (e.type.startsWith('session.')) {
            console.log('[SSE PRELOAD] SESSION event:', e.type)
            console.log('[SSE PRELOAD] SESSION full:', JSON.stringify(e).slice(0, 300))
          } else {
            console.log('[SSE PRELOAD] unknown event:', e.type, 'keys:', Object.keys(e).slice(0, 10))
          }
        }
        callback(data)
      }
      ipcRenderer.on(IPC_CHANNELS.SESSION_STREAM_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSION_STREAM_EVENT, handler)
    },

    todo: (sessionID: string, directory?: string): Promise<unknown[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_TODO, sessionID, directory),
  },

  file: {
    read: (filePath: string, directory?: string): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, filePath, directory),
    
    write: (filePath: string, content: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE, filePath, content, directory),
    
    list: (cwd: string, pattern?: string, directory?: string): Promise<unknown[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_LIST, cwd, pattern, directory),

    pick: (): Promise<{ filePath: string; content: string; name: string } | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_PICK)
  },

  tool: {
    list: (): Promise<{ name: string; description: string }[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.TOOL_LIST)
  },

  config: {
    get: (key: string, directory?: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET, key, directory),
    
    set: (key: string, value: unknown, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SET, key, value, directory),
    
    models: (directory?: string): Promise<{ all: unknown[]; default: string[]; connected: string[] }> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG_MODELS, directory)
  },

  configFile: {
    read: (filePath: string, directory?: string): Promise<{ success: boolean; content?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG_FILE_READ, filePath, directory),
    
    write: (filePath: string, content: string, directory?: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG_FILE_WRITE, filePath, content, directory)
  },

  console: {
    get: (directory?: string): Promise<ConsoleState> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONSOLE_GET, directory)
  },

  provider: {
    authMethods: (directory?: string): Promise<Record<string, AuthMethod[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_AUTH_METHODS, directory),
    
    authorize: (providerID: string, method: number, inputs?: Record<string, string>, directory?: string): Promise<AuthorizationResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_AUTHORIZE, providerID, method, inputs, directory),
    
    authCallback: (providerID: string, method: number, code?: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_AUTH_CALLBACK, providerID, method, code, directory),

    add: (config: { name: string; apiKey: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; provider?: unknown; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_ADD, config, directory),

    update: (providerId: string, config: { apiKey?: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; provider?: unknown; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_UPDATE, providerId, config, directory),

    delete: (providerId: string, directory?: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_DELETE, providerId, directory),

    test: (providerIdOrConfig: string | { name: string; apiKey: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; modelCount?: number; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_TEST, providerIdOrConfig, directory),

    refreshModels: (providerId: string, directory?: string): Promise<{ success: boolean; models?: unknown[]; changed?: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_REFRESH_MODELS, providerId, directory),

    deleteModel: (providerId: string, modelId: string, directory?: string): Promise<{ success: boolean; fromApi?: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_DELETE_MODEL, providerId, modelId, directory)
  },

  workspace: {
    getCwd: (): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_CWD),

    list: (): Promise<Workspace[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_LIST),

    add: (path?: string): Promise<Workspace | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_ADD, path),

    remove: (path: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_REMOVE, path),

    select: (path: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SELECT, path),

    openFolder: (): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_OPEN_FOLDER)
  },

  // Phase 5: Skills & MCP
  skill: {
    list: (directory?: string): Promise<SkillInfo[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SKILL_LIST, directory),
    
    write: (location: string, content: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SKILL_WRITE, location, content)
  },

  mcp: {
    status: (directory?: string): Promise<Record<string, MCPStatus>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_STATUS, directory),

    config: (directory?: string): Promise<Record<string, unknown>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_CONFIG, directory),

    add: (payload: MCPAddPayload, directory?: string): Promise<Record<string, MCPStatus>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_ADD, payload, directory),

    connect: (name: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_CONNECT, name, directory),

    disconnect: (name: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_DISCONNECT, name, directory),

    remove: (name: string, directory?: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_REMOVE, name, directory),

    tools: (directory?: string): Promise<Record<string, unknown[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_TOOLS, directory),

    prompts: (directory?: string): Promise<Record<string, unknown[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_PROMPTS, directory),

    resources: (directory?: string): Promise<Record<string, unknown[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_RESOURCES, directory),

    serverTools: (name: string, directory?: string): Promise<unknown[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_SERVER_TOOLS, name, directory),
  },

  window: {
    setTitleBarOverlay: (options: { color: string; symbolColor: string }): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_TITLE_BAR_OVERLAY, options)
  },

  globalState: {
    get: (): Promise<Record<string, unknown>> =>
      ipcRenderer.invoke(IPC_CHANNELS.GLOBAL_STATE_GET),

    set: (data: Record<string, unknown>): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.GLOBAL_STATE_SET, data)
  }
}

export type DesktopAPI = typeof desktopAPI