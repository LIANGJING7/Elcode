import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../types/ipc'
import { backend } from '../backend-client'
import type { SkillInfo } from '../../types/ipc'

/**
 * Skill IPC handlers - Phase 5
 * Core provides GET /api/skill endpoint, no create/update routes.
 * Desktop UI can only list skills; enable/disable is UI soft-block only.
 */
export function registerSkillHandlers() {
  // SKILL_LIST: forward to backend GET /api/skill
  ipcMain.handle(IPC_CHANNELS.SKILL_LIST, async (_, directory?: string) => {
    try {
      const skills = await backend.skill.list(directory)
      return skills as SkillInfo[]
    } catch (err) {
      console.error('[SkillHandler] list error:', err)
      return []
    }
  })
}