import path from 'path'
import { ipcMain } from 'electron'
import { CHANNELS } from './channels'
import { resolveWithinWorkspace } from './guards'

/**
 * Config file handlers - dedicated for project configuration files like lcode.jsonc.
 * These are handled directly in the main process using Node.js fs, separate from
 * general file operations which go through the backend API.
 * 
 * This separation ensures:
 * 1. Clear responsibility: config files are desktop-specific concern
 * 2. No dependency on backend HTTP API for config file writes (which doesn't exist)
 * 3. Faster config operations without HTTP roundtrip
 */

const ALLOWED_CONFIG_FILES = new Set(['lcode.jsonc', 'lcode.json', '.lcode.jsonc', '.lcode.json'])

function isAllowedConfigFile(filePath: string): boolean {
  const basename = path.basename(filePath)
  return ALLOWED_CONFIG_FILES.has(basename)
}

export function registerConfigFileHandlers() {
  ipcMain.handle(CHANNELS.CONFIG_FILE_READ, async (_event, filePath: string, directory?: string) => {
    const fs = await import('fs/promises')
    
    // Only allow specific config files
    if (!isAllowedConfigFile(filePath)) {
      throw new Error(`Config file not allowed: ${filePath}. Only lcode.jsonc/lcode.json are permitted.`)
    }
    
    // Resolve the file path relative to directory
    let resolvedPath: string
    if (path.isAbsolute(filePath)) {
      resolvedPath = resolveWithinWorkspace(filePath, directory)
    } else if (directory) {
      resolvedPath = path.resolve(directory, filePath)
      // Verify it stays within workspace
      resolveWithinWorkspace(resolvedPath, directory)
    } else {
      throw new Error('No directory provided for config file path')
    }
    
    console.log('[ConfigFileHandler] read: resolved path=', resolvedPath)
    
    try {
      const content = await fs.readFile(resolvedPath, 'utf-8')
      return { success: true, content }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      // File not found is a valid case - return empty config
      if (error.includes('ENOENT')) {
        return { success: true, content: '{}' }
      }
      return { success: false, error }
    }
  })

  ipcMain.handle(CHANNELS.CONFIG_FILE_WRITE, async (_event, filePath: string, content: string, directory?: string) => {
    const fs = await import('fs/promises')
    
    // Only allow specific config files
    if (!isAllowedConfigFile(filePath)) {
      throw new Error(`Config file not allowed: ${filePath}. Only lcode.jsonc/lcode.json are permitted.`)
    }
    
    // Resolve the file path relative to directory
    let resolvedPath: string
    if (path.isAbsolute(filePath)) {
      resolvedPath = resolveWithinWorkspace(filePath, directory)
    } else if (directory) {
      resolvedPath = path.resolve(directory, filePath)
      // Verify it stays within workspace
      resolveWithinWorkspace(resolvedPath, directory)
    } else {
      throw new Error('No directory provided for config file path')
    }
    
    console.log('[ConfigFileHandler] write: resolved path=', resolvedPath)
    
    try {
      await fs.writeFile(resolvedPath, content, 'utf-8')
      return { success: true }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      return { success: false, error }
    }
  })
}
