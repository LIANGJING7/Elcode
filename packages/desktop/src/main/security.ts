import { app } from 'electron'
import { join, resolve, normalize } from 'path'

const ALLOWED_BASE_DIRS = [
  app.getPath('userData'),
  app.getPath('temp'),
  app.getPath('home')
]

export function sandboxPath(basePath: string, targetPath: string): string {
  const normalizedBase = normalize(basePath)
  const normalizedTarget = normalize(join(basePath, targetPath))
  const resolvedTarget = resolve(normalizedBase, normalizedTarget)

  const isAllowed = ALLOWED_BASE_DIRS.some(allowedDir => 
    resolvedTarget.startsWith(normalize(allowedDir))
  )

  if (!isAllowed && basePath !== normalizedBase) {
    const baseIsAllowed = ALLOWED_BASE_DIRS.some(allowedDir =>
      normalizedBase.startsWith(normalize(allowedDir))
    )
    if (!baseIsAllowed) {
      throw new Error(`Access denied: path outside allowed directories`)
    }
  }

  return resolvedTarget
}

export function validateFileArgs(basePath: unknown, targetPath: unknown): { basePath: string; targetPath: string } {
  if (typeof basePath !== 'string' || typeof targetPath !== 'string') {
    throw new Error('Invalid arguments: basePath and targetPath must be strings')
  }
  
  if (basePath.length === 0 || targetPath.length === 0) {
    throw new Error('Invalid arguments: paths cannot be empty')
  }

  return { basePath, targetPath }
}

export function validateSessionId(sessionId: unknown): string {
  if (typeof sessionId !== 'string') {
    throw new Error('Invalid sessionId: must be string')
  }
  
  if (!sessionId.startsWith('session-')) {
    throw new Error('Invalid sessionId: malformed format')
  }

  return sessionId
}