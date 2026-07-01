import { ipcMain } from 'electron'
import { CHANNELS } from './channels'
import { backend } from '../backend-client'
import { resolveWithinWorkspace } from './guards'

export function registerFileHandlers() {
  ipcMain.handle(CHANNELS.FILE_READ, async (_event, filePath: string, directory?: string) => {
    const resolved = resolveWithinWorkspace(filePath)
    return await backend.file.read(resolved, directory)
  })

  ipcMain.handle(CHANNELS.FILE_WRITE, async (_event, filePath: string, content: string, directory?: string) => {
    const resolved = resolveWithinWorkspace(filePath)
    await backend.file.write(resolved, content, directory)
    return true
  })

  ipcMain.handle(CHANNELS.FILE_LIST, async (_event, cwd: string, pattern?: string, directory?: string) => {
    const resolved = resolveWithinWorkspace(cwd)
    return await backend.file.list(resolved, pattern, directory)
  })

  // Open file picker dialog and return file contents
  ipcMain.handle(CHANNELS.FILE_PICK, async (_event) => {
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const filePath = result.filePaths[0]
    const fs = await import('fs/promises')
    const content = await fs.readFile(filePath, 'utf-8')
    return { filePath, content, name: filePath.split(/[\\/]/).pop() || filePath }
  })
}