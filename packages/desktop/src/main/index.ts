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
  ipcMain.removeAllHandlers()
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in main process:', reason)
})