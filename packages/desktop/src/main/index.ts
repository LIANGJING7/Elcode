import { app, ipcMain } from 'electron'
import { createWindow, getMainWindow } from './window'
import { registerIPCHandlers } from './ipc/handlers'

;(globalThis as any).AI_SDK_LOG_WARNINGS = false

app.whenReady().then(() => {
  registerIPCHandlers()
  createWindow()

  app.on('activate', () => {
    if (!getMainWindow()) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  const channels = Object.values(require('./ipc/channels').IPC_CHANNELS) as string[]
  channels.forEach(channel => ipcMain.removeHandler(channel))
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in main process:', reason)
})