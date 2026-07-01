import { app, ipcMain, Menu, nativeImage } from 'electron'
import { createWindow, getMainWindow } from './window'
import { registerIPCHandlers, initBackend } from './ipc/handlers'
import { stopBackend } from './backend-client'
import { join } from 'path'
import { fileURLToPath } from 'url'

;(globalThis as any).AI_SDK_LOG_WARNINGS = false

// Hide the default application menu bar
Menu.setApplicationMenu(null)

/**
 * Set app icon for macOS dock (development mode needs explicit icon setting)
 */
function setAppIcon(): void {
  if (process.platform === 'darwin' && !app.isPackaged) {
    const __dirname = join(fileURLToPath(import.meta.url), '..')
    const iconPath = join(__dirname, '../build/icon.png')
    const icon = nativeImage.createFromPath(iconPath)
    app.dock.setIcon(icon)
  }
}

app.whenReady().then(async () => {
  try {
    setAppIcon()
    await initBackend()
    registerIPCHandlers()
    createWindow()
  } catch (err) {
    console.error('Failed to initialize:', err)
    app.quit()
  }

  app.on('activate', () => {
    if (!getMainWindow()) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopBackend()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await stopBackend()
  const { IPC_CHANNELS } = await import('./ipc/channels')
  const channels = Object.values(IPC_CHANNELS) as string[]
  channels.forEach(channel => ipcMain.removeHandler(channel))
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in main process:', reason)
})