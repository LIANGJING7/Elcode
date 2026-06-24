import { ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../types/ipc'
import type { Message, Conversation, LocationRef, PromptInput, Workspace } from '../types/ipc'

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
    
    delete: (sessionId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_DELETE, sessionId),
    
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
    
    models: (directory?: string): Promise<unknown[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG_MODELS, directory)
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
  }
}

export type DesktopAPI = typeof desktopAPI