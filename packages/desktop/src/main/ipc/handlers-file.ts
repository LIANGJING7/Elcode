import { ipcMain } from 'electron'
import { CHANNELS } from './channels'
import { backend } from '../backend-client'
import { resolveWithinWorkspace } from './guards'
import * as path from 'path'

const MIME_MAP: Record<string, string> = {
  'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'bmp': 'image/bmp',
  'pdf': 'application/pdf',
  'zip': 'application/zip',
  'gz': 'application/gzip', 'tar': 'application/x-tar',
  'json': 'application/json',
  'xml': 'application/xml',
  'html': 'text/html', 'htm': 'text/html',
  'css': 'text/css',
  'js': 'text/javascript', 'ts': 'text/typescript', 'jsx': 'text/javascript', 'tsx': 'text/typescript',
  'md': 'text/markdown',
  'txt': 'text/plain',
  'csv': 'text/csv',
  'yaml': 'text/yaml', 'yml': 'text/yaml',
  'toml': 'text/plain',
}

const TEXT_EXTS = new Set(['svg', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx', 'md', 'txt', 'csv', 'yaml', 'yml', 'toml'])

function getMime(ext: string): string {
  return MIME_MAP[ext] || 'application/octet-stream'
}

async function readFileContent(filePath: string, ext: string): Promise<{ content: string; isBase64: boolean }> {
  const fs = await import('fs/promises')
  if (TEXT_EXTS.has(ext)) {
    const content = await fs.readFile(filePath, 'utf-8')
    return { content, isBase64: false }
  }
  const buffer = await fs.readFile(filePath)
  return { content: buffer.toString('base64'), isBase64: true }
}

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

  // Unified file picker — supports all file types
  ipcMain.handle(CHANNELS.FILE_PICK, async (_event) => {
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    
    const fs = await import('fs/promises')
    const files = []
    for (const filePath of result.filePaths) {
      const name = filePath.split(/[\\/]/).pop() || filePath
      const ext = filePath.split('.').pop()?.toLowerCase() || ''
      const mime = getMime(ext)
      const { content, isBase64 } = await readFileContent(filePath, ext)
      files.push({ filePath, name, content, mime, isBase64 })
    }
    // Return first file for single selection, array for multi
    return files.length === 1 ? files[0] : { files }
  })

  // Open image picker dialog and return image as base64
  ipcMain.handle(CHANNELS.FILE_PICK_IMAGE, async (_event) => {
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const filePath = result.filePaths[0]
    const fs = await import('fs/promises')
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    const isSvg = ext === 'svg'
    
    const mime = getMime(ext)
    
    if (isSvg) {
      const content = await fs.readFile(filePath, 'utf-8')
      return { filePath, content, name: filePath.split(/[\\/]/).pop() || filePath, mime, isSvg: true }
    } else {
      const buffer = await fs.readFile(filePath)
      const content = buffer.toString('base64')
      return { filePath, content, name: filePath.split(/[\\/]/).pop() || filePath, mime, isSvg: false }
    }
  })
}