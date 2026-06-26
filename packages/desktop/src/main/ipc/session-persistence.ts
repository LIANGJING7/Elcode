import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

// core 不持久化桌面端附加 metadata(pin/options/workspace 锚点), 所以桌面在这里补.
// 文件落在 app.getPath('userData')/sessions.json, 形如:
//   { "<sessionId>": { title?, pinned, primaryWorkspaceId, workspaceIds, options } }

const file = (): string => join(app.getPath('userData'), 'sessions.json')

export interface SessionRecord {
  title?: string
  pinned?: boolean
  options?: Record<string, unknown>
  primaryWorkspaceId?: string
  workspaceIds?: string[]
}

export async function readSessionMeta(): Promise<Record<string, SessionRecord>> {
  try {
    return JSON.parse(await fs.readFile(file(), 'utf-8'))
  } catch {
    return {}
  }
}

export async function mergeSessionMeta(id: string, patch: SessionRecord): Promise<void> {
  const all = await readSessionMeta()
  all[id] = { ...(all[id] ?? {}), ...patch }
  await fs.writeFile(file(), JSON.stringify(all, null, 2))
}

export async function removeSessionMeta(id: string): Promise<void> {
  const all = await readSessionMeta()
  delete all[id]
  await fs.writeFile(file(), JSON.stringify(all, null, 2))
}