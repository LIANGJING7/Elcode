import { ipcMain } from 'electron'
import { CHANNELS, isValidChannel } from './channels'
import { startBackend } from '../backend-client'
import { registerSessionHandlers } from './handlers-session'
import { registerFileHandlers } from './handlers-file'
import { registerWorkspaceHandlers } from './handlers-workspace'
import { registerSkillHandlers } from './handlers-skill'
import { registerMcpHandlers } from './handlers-mcp'
import { registerWindowHandlers } from './handlers-window'
import { registerGlobalStateHandlers } from './handlers-global-state'
import { registerLcodeConfigHandlers } from './handlers-lcode-config'

;(globalThis as any).AI_SDK_LOG_WARNINGS = false

export async function registerIPCHandlers() {
  registerSessionHandlers()
  registerFileHandlers()
  registerWorkspaceHandlers()
  registerSkillHandlers()
  registerMcpHandlers()
  registerWindowHandlers()
  registerGlobalStateHandlers()
  registerLcodeConfigHandlers()

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