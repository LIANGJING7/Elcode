import { ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../types/ipc'
import type { Message, Conversation } from '../types/ipc'

export const desktopAPI = {
  session: {
    create: (workspacePath: string): Promise<string> => 
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_CREATE, workspacePath),
    
    sendMessage: (sessionId: string, content: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_SEND_MESSAGE, sessionId, content),
    
    list: (): Promise<Conversation[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_LIST),
    
    delete: (sessionId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_DELETE, sessionId),
    
    onStreamData: (callback: (data: { sessionId: string; message: Message }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { sessionId: string; message: Message }) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.SESSION_STREAM_DATA, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSION_STREAM_DATA, handler)
    },
    
    onStreamEnd: (callback: (data: { sessionId: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { sessionId: string }) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.SESSION_STREAM_END, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSION_STREAM_END, handler)
    }
  },

  file: {
    read: (filePath: string): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, filePath),
    
    write: (filePath: string, content: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE, filePath, content)
  },

  tool: {
    list: (): Promise<{ name: string; description: string }[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.TOOL_LIST)
  },

  config: {
    get: (key: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET, key),
    
    set: (key: string, value: unknown): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SET, key, value)
  }
}

export type DesktopAPI = typeof desktopAPI