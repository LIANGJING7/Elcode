import { contextBridge, ipcRenderer } from 'electron'

const api = {
  onBackendReady: (callback: (port: number) => void) => {
    ipcRenderer.on('backend-ready', (_event, port) => callback(port))
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)