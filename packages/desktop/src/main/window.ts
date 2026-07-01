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

  if (isDev) {
    // vite-plugin-electron sets VITE_DEV_SERVER_URL to the actual dev server
    // URL (incl. the real port — vite may pick 5174, 5175, ... when 5173 is
    // busy). Falling back to the default keeps `electron .` usable in a dev
    // shell if the env var isn't set.
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    win.loadURL(devUrl)
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => {
    win.show()
  })

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