import { ipcMain } from 'electron'
import { CHANNELS } from './channels'
import path from 'path'
import fs from 'fs/promises'
import { xdgState } from 'xdg-basedir'
import os from 'os'

// Global state file path (same as core: xdgState/lcode/lcode.json)
const APP_NAME = 'lcode'
const STATE_DIR = path.join(xdgState ?? path.join(os.homedir(), '.local', 'state'), APP_NAME)
const STATE_FILE = path.join(STATE_DIR, 'lcode.json')

// Ensure state directory exists
async function ensureStateDir(): Promise<void> {
  try {
    await fs.mkdir(STATE_DIR, { recursive: true })
  } catch {
    // ignore
  }
}

// Read global state file
async function readState(): Promise<Record<string, unknown>> {
  try {
    const content = await fs.readFile(STATE_FILE, 'utf-8')
    const data = JSON.parse(content)
    if (data && typeof data === 'object') {
      return data as Record<string, unknown>
    }
    return {}
  } catch {
    return {}
  }
}

// Write global state file
async function writeState(data: Record<string, unknown>): Promise<void> {
  await ensureStateDir()
  await fs.writeFile(STATE_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export function registerGlobalStateHandlers(): void {
  ipcMain.handle(CHANNELS.GLOBAL_STATE_GET, async () => {
    return await readState()
  })

  ipcMain.handle(CHANNELS.GLOBAL_STATE_SET, async (_event, data: Record<string, unknown>) => {
    await writeState(data)
    return true
  })
}