import { BrowserWindow, app, nativeImage } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'
import { xdgState } from 'xdg-basedir'
import os from 'os'

const __dirname = join(fileURLToPath(import.meta.url), '..')

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

/**
 * Get the correct icon path based on platform
 * Windows requires .ico format for proper display in dev mode
 */
function getIconPath(): string {
  return join(__dirname, '../../build', 'icon.png')
}

// Read saved theme from global state file
async function getSavedTheme(): Promise<'dark' | 'light'> {
  try {
    const APP_NAME = 'lcode'
    const STATE_DIR = path.join(xdgState ?? path.join(os.homedir(), '.local', 'state'), APP_NAME)
    const STATE_FILE = path.join(STATE_DIR, 'lcode.json')
    const content = await fs.readFile(STATE_FILE, 'utf-8')
    const data = JSON.parse(content)
    if (data && typeof data === 'object' && (data.theme === 'dark' || data.theme === 'light')) {
      return data.theme
    }
  } catch {
    // ignore
  }
  return 'light' // default to light theme
}

export async function createWindow(): Promise<BrowserWindow> {
  const icon = nativeImage.createFromPath(getIconPath())
  
  // Read saved theme to set initial title bar colors
  const savedTheme = await getSavedTheme()
  const isDark = savedTheme === 'dark'
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon,
    titleBarStyle: 'hidden',
    backgroundColor: isDark ? '#202020' : '#f8f7f5',
    frame: false,
    titleBarOverlay: {
      color: isDark ? '#202020' : '#f8f7f5',
      symbolColor: isDark ? '#a8a4a0' : '#37352f',
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