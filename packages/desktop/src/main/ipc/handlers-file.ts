import { ipcMain } from 'electron'
import { CHANNELS } from './channels'
import { backend } from '../backend-client'
import { resolveWithinWorkspace } from './guards'
import * as path from 'path'

export function registerFileHandlers() {
  ipcMain.handle(CHANNELS.FILE_READ, async (_event, filePath: string, directory?: string) => {
    console.log('[FILE_READ] filePath:', filePath, 'type:', typeof filePath, 'directory:', directory)
    
    // Validate filePath
    if (typeof filePath !== 'string' || !filePath) {
      console.error('[FILE_READ] Invalid filePath:', filePath)
      throw new Error('Invalid filePath: must be a non-empty string')
    }
    
    // If filePath is absolute and directory is not provided (or is empty), read directly
    // This allows viewing files outside the current workspace (e.g., for diff comparison)
    if (path.isAbsolute(filePath) && !directory) {
      console.log('[FILE_READ] Reading absolute path directly:', filePath)
      const fs = await import('fs/promises')
      return await fs.readFile(filePath, 'utf-8')
    }
    
    // If directory is undefined but filePath is absolute, still read directly
    if (path.isAbsolute(filePath)) {
      console.log('[FILE_READ] Reading absolute path (directory may be undefined):', filePath)
      const fs = await import('fs/promises')
      return await fs.readFile(filePath, 'utf-8')
    }
    
    console.log('[FILE_READ] Resolving within workspace:', filePath, 'directory:', directory)
    const resolved = resolveWithinWorkspace(filePath, directory)
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

  ipcMain.handle(CHANNELS.FILE_SEARCH, async (_event, query: string, directory?: string) => {
    return await backend.file.search(query, directory)
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