import { ipcMain } from 'electron'
import { CHANNELS, isValidChannel } from './channels'
import { startBackend } from '../backend-client'
import { registerSessionHandlers } from './handlers-session'
import { registerFileHandlers } from './handlers-file'
import { registerConfigHandlers } from './handlers-config'
import { registerWorkspaceHandlers } from './handlers-workspace'

;(globalThis as any).AI_SDK_LOG_WARNINGS = false

export async function registerIPCHandlers() {
  registerSessionHandlers()
  registerFileHandlers()
  registerConfigHandlers()
  registerWorkspaceHandlers()

  ipcMain.handle(CHANNELS.WORKSPACE_GET_CWD, () => {
    return process.cwd()
  })

  ipcMain.on('ipc-request', (event, channel: string) => {
    if (!isValidChannel(channel)) {
      console.error(`Blocked unauthorized IPC channel: ${channel}`)
      event.reply('ipc-error', { channel, error: 'Unauthorized channel' })
    }
  })
}

export async function initBackend() {
  try {
    const { port } = await startBackend()
    console.log(`Backend initialized on port ${port}`)
  } catch (err) {
    console.error('Failed to start backend:', err)
    throw err
  }
}