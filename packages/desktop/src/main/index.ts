import { app, ipcMain, Menu, nativeImage } from 'electron'
import { createWindow, getMainWindow, switchToApp, showError } from './window'
import { registerIPCHandlers, initBackend } from './ipc/handlers'
import { stopBackend } from './backend-client'
import { join } from 'path'
import { fileURLToPath } from 'url'

;(globalThis as any).AI_SDK_LOG_WARNINGS = false

Menu.setApplicationMenu(null)

function setAppIcon(): void {
  if (process.platform === 'darwin' && !app.isPackaged) {
    const __dirname = join(fileURLToPath(import.meta.url), '..')
    const iconPath = join(__dirname, '../build/icon.png')
    const icon = nativeImage.createFromPath(iconPath)
    app.dock.setIcon(icon)
  }
}

async function startApp(): Promise<void> {
  try {
    setAppIcon()
    await createWindow()
    
    await initBackend()
    registerIPCHandlers()

    await switchToApp()
  } catch (err) {
    console.error('Failed to initialize:', err)
    const errorMsg = err instanceof Error ? err.message : String(err)
    await showError(errorMsg)
  }
}

app.whenReady().then(() => {
  startApp()

  app.on('activate', () => {
    if (!getMainWindow()) {
      startApp()
    }
  })
})

ipcMain.handle('retry-startup', async () => {
  await stopBackend().catch(() => {})
  await startApp()
})

// Teardown must finish before the main process actually dies — otherwise
// Electron exits while `stopBackend()` is still running taskkill and the
// child `bun.exe` backend-launcher leaks as an orphan. The `exit`/SIGINT
// handlers in backend-client.ts are a synchronous safety net, but the normal
// quit path should be clean.
let shuttingDown = false

async function teardownAndQuit(): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  try {
    await stopBackend()
    const { IPC_CHANNELS } = await import('./ipc/channels')
    const channels = Object.values(IPC_CHANNELS) as string[]
    channels.forEach(channel => ipcMain.removeHandler(channel))
  } catch (err) {
    console.error('Teardown error:', err)
  } finally {
    app.exit(0)
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    void teardownAndQuit()
  }
})

// `before-quit` fires for both manual quit (Cmd+Q / tray) and programmatic
// `app.quit()`. Prevent the default quit so we control the final exit; the
// sync exit-handler on the backend process still covers hard-kill cases.
app.on('before-quit', (event) => {
  event.preventDefault()
  void teardownAndQuit()
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in main process:', reason)
})