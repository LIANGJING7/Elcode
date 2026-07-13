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

export async function createWindow(): Promise<BrowserWindow> {
  const icon = nativeImage.createFromPath(getIconPath())
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon,
    titleBarStyle: 'hidden',
    backgroundColor: '#202020',
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

  if (isDev) {
    win.webContents.openDevTools()
  }

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    await win.loadURL(devUrl)
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Show window immediately so user sees loading animation
  win.show()

  win.on('closed', () => {
    mainWindow = null
  })

  mainWindow = win
  return win
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

export async function showError(errorMsg: string): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) return
  
  const win = mainWindow
  
  if (isDev) {
    const errorUrl = process.env.VITE_DEV_SERVER_URL 
      ? `${process.env.VITE_DEV_SERVER_URL}/src/renderer/error.html?error=${encodeURIComponent(errorMsg)}`
      : `http://localhost:5173/src/renderer/error.html?error=${encodeURIComponent(errorMsg)}`
    await win.loadURL(errorUrl)
  } else {
    const errorPath = join(__dirname, '../renderer/error.html')
    await win.loadFile(errorPath, { query: { error: errorMsg } })
  }
  
  win.show()
}