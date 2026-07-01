import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../types/ipc'
import { backend } from '../backend-client'
import type { SkillInfo } from '../../types/ipc'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

/**
 * Skill IPC handlers - Phase 5
 * Core provides GET /api/skill endpoint, no create/update routes.
 * Desktop UI can only list skills; enable/disable is UI soft-block only.
 */

// Get the skills directory path
function getSkillsDirectory(): string {
  // Use the same pattern as core: ~/.config/lcode/skills/ or equivalent
  const configDir = path.join(app.getPath('userData'), 'skills')
  return configDir
}

// Validate that a path is within the skills directory (security check)
function isWithinSkillsDir(filePath: string): boolean {
  const skillsDir = path.resolve(getSkillsDirectory())
  const resolved = path.resolve(filePath)
  const rel = path.relative(skillsDir, resolved)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

export function registerSkillHandlers() {
  // SKILL_LIST: forward to backend GET /api/skill
  ipcMain.handle(IPC_CHANNELS.SKILL_LIST, async (_, directory?: string) => {
    try {
      const result = await backend.skill.list(directory)
      // Backend returns { location: {...}, data: SkillInfo[] }
      // Extract the data field which contains the actual skill array
      const skills = (result as { data: SkillInfo[] }).data || []
      return skills as SkillInfo[]
    } catch (err) {
      console.error('[SkillHandler] list error:', err)
      return []
    }
  })

  // SKILL_WRITE: write skill content directly to file
  ipcMain.handle(IPC_CHANNELS.SKILL_WRITE, async (_, location: string, content: string) => {
    try {
      // Reject built-in/embedded skills - they cannot be modified
      // These are virtual paths that don't correspond to real files:
      // - '<built-in>' - legacy marker
      // - '/builtin/...' - embedded skills from plugins (e.g., /builtin/customize-opencode.md)
      if (location === '<built-in>' || location.startsWith('/builtin/')) {
        throw new Error('Cannot modify built-in skills')
      }
      
      // Security check: ensure the path looks like a valid skill file
      const normalizedPath = path.resolve(location)
      
      // Must be an absolute path to a real file
      if (!path.isAbsolute(normalizedPath)) {
        throw new Error('Skill location must be an absolute path')
      }
      
      // Check if it's a skill file (has .md extension)
      if (!normalizedPath.toLowerCase().endsWith('.md')) {
        throw new Error('Invalid skill file - must be a .md file')
      }
      
      // Check if file exists - allow modifying existing skill files anywhere
      // (they were loaded from core's skill list, so they should be legitimate)
      const fileExists = await fs.access(normalizedPath).then(() => true).catch(() => false)
      
      if (!fileExists) {
        // For new files, only allow creating within safe directories
        const skillsDir = getSkillsDirectory()
        const userDataDir = app.getPath('userData')
        const isWithinSafeDir = normalizedPath.startsWith(path.resolve(skillsDir)) ||
                                normalizedPath.startsWith(path.resolve(userDataDir))
        
        if (!isWithinSafeDir) {
          throw new Error('Cannot create new skill files outside of skills directory')
        }
        
        // Ensure the parent directory exists before creating new file
        const parentDir = path.dirname(normalizedPath)
        await fs.mkdir(parentDir, { recursive: true })
      }
      
      // Write directly to the file
      await fs.writeFile(normalizedPath, content, 'utf-8')
      return true
    } catch (err) {
      console.error('[SkillHandler] write error:', err)
      throw err
    }
  })
}