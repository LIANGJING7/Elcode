import { BrowserWindow, app, nativeImage } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = join(fileURLToPath(import.meta.url), '..')

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

/**
 * Get the correct icon path based on platform
 * Windows requires .ico format for proper display in dev mode
 */
function getIconPath(): string {
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  return join(__dirname, '../../build', iconName)
}

export function createWindow(): BrowserWindow {
  // Create native image for better icon handling across platforms
  const icon = nativeImage.createFromPath(getIconPath())
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a1a',
    frame: false,
    titleBarOverlay: {
      color: '#202020',
      symbolColor: '#a8a4a0',
      height: 48,
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    show: false
  })

  // Load splash page first and show immediately
  const loadingPath = join(__dirname, '../renderer/loading.html')
  win.loadFile(loadingPath).then(() => {
    win.show()
  })

  win.on('closed', () => {
    mainWindow = null
  })

  mainWindow = win
  return win
}

export async function switchToApp(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) return
  
  const win = mainWindow
  
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    await win.loadURL(devUrl)
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  
  // Wait for Vue to finish loading to avoid white flash
  await new Promise<void>(resolve => {
    win.webContents.once('did-finish-load', () => resolve())
  })
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function focusWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
  }
}

export function sendMessageToRenderer(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}