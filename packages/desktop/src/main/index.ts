import { app, ipcMain, Menu, nativeImage, dialog } from 'electron'
import { createWindow, getMainWindow, showError } from './window'
import { registerIPCHandlers, initBackend } from './ipc/handlers'
import { stopBackend } from './backend-client'
import { join } from 'path'
import { fileURLToPath } from 'url'
import * as fs from 'fs'

const __dirname = join(fileURLToPath(import.meta.url), '..')

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
  const logPath = join(app.getPath('userData'), 'startup.log')
  const log = (msg: string) => {
    console.log(msg)
    const timestamp = new Date().toISOString()
    fs.appendFileSync(logPath, `${timestamp} ${msg}\n`)
  }
  
  log('[startApp] app.isPackaged: ' + app.isPackaged)
  log('[startApp] process.resourcesPath: ' + process.resourcesPath)
  log('[startApp] __dirname: ' + __dirname)
  
  try {
    setAppIcon()
    registerIPCHandlers()
    log('[startApp] Calling initBackend...')
    await initBackend()
    log('[startApp] Backend initialized, creating window...')
    await createWindow()
    log('[startApp] Window created successfully')
  } catch (err) {
    log('[startApp] ERROR: ' + (err instanceof Error ? err.message : String(err)))
    console.error('Failed to initialize:', err)
    const errorMsg = err instanceof Error ? err.message : String(err)
    await showError(errorMsg)
  }
}

app.whenReady().then(() => {
  startApp().catch(err => {
    console.error('startApp failed:', err)
    dialog.showErrorBox('Startup Error', `Failed to start application:\n${err instanceof Error ? err.message : String(err)}`)
    app.exit(1)
  })

  app.on('activate', () => {
    if (!getMainWindow()) {
      startApp().catch(err => {
        console.error('startApp on activate failed:', err)
      })
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