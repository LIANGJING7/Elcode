import { ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../types/ipc'
import type { Message, Conversation, LocationRef, PromptInput, Workspace, SessionUpdate, SkillInfo, MCPStatus, MCPAddPayload, AuthMethod, AuthorizationResult } from '../types/ipc'

export const desktopAPI = {
  session: {
    create: (location: LocationRef): Promise<string> => 
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_CREATE, location),
    
    get: (sessionID: string, directory?: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET, sessionID, directory),
    
    list: (directory?: string, workspaceID?: string): Promise<Conversation[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_LIST, { directory, workspaceID }),
    
    messages: (sessionID: string, limit?: number, directory?: string): Promise<Message[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_MESSAGES, sessionID, limit, directory),
    
    prompt: (sessionID: string, prompt: PromptInput[], directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_PROMPT, sessionID, prompt, directory),
    
    interrupt: (sessionID: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_INTERRUPT, sessionID, directory),
    
    resume: (sessionID: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_RESUME, sessionID, directory),
    
    delete: (sessionId: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_DELETE, sessionId, directory),

    // SESSION_UPDATE 只写本地 sessions.json(keyed by sessionID), 无需 directory 透传。
    update: (sessionID: string, patch: SessionUpdate): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_UPDATE, sessionID, patch),
    
    onStreamEvent: (callback: (data: { sessionID: string; event: unknown }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { sessionID: string; event: unknown }) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.SESSION_STREAM_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSION_STREAM_EVENT, handler)
    }
  },

  file: {
    read: (filePath: string, directory?: string): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, filePath, directory),
    
    write: (filePath: string, content: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE, filePath, content, directory),
    
    list: (cwd: string, pattern?: string, directory?: string): Promise<unknown[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_LIST, cwd, pattern, directory)
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
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_REFRESH_MODELS, providerId, directory)
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
      ipcRenderer.invoke(IPC_CHANNELS.SKILL_LIST, directory)
  },

  mcp: {
    status: (directory?: string): Promise<Record<string, MCPStatus>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_STATUS, directory),

    add: (payload: MCPAddPayload, directory?: string): Promise<Record<string, MCPStatus>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_ADD, payload, directory),

    connect: (name: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_CONNECT, name, directory),

    disconnect: (name: string, directory?: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_DISCONNECT, name, directory)
  }
}

export type DesktopAPI = typeof desktopAPI