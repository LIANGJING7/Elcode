import * as path from 'path'
import { getActiveWorkspaceRoot } from './handlers-workspace'

/**
 * Electron renderer is treated as untrusted. These guards confine file/config
 * IPC to the active workspace directory so that a compromised renderer (XSS,
 * malicious dependency, remote content) cannot read or write arbitrary paths
 * on disk. They are a second line of defense behind the backend's own checks.
 */

// Handle the common directory-traversal / absolute-escape attempts. We resolve
// the target against the workspace root and require the result to stay inside.
export function resolveWithinWorkspace(target: string): string {
  const root = getActiveWorkspaceRoot()
  if (!root) {
    throw new Error('No active workspace: file access denied')
  }

  const rootNormalized = path.resolve(root)
  const resolved = path.isAbsolute(target)
    ? path.resolve(target)
    : path.resolve(rootNormalized, target)

  const rel = path.relative(rootNormalized, resolved)
  const escaped = rel === '' ? false : rel.startsWith('..') || path.isAbsolute(rel)
  if (escaped) {
    throw new Error(`Path outside workspace: ${target}`)
  }
  return resolved
}

// Keys the UI is allowed to read/write through the generic config channel.
// Anything else must go through dedicated, validated IPC. This is deliberately
// a small allowlist; widen it only when a concrete UI need appears.
// Note: recentModels is now stored in global state (lcode.json), accessed via globalState API.
export const ALLOWED_CONFIG_KEYS = new Set<string>([
  'theme',
  'codeTheme',
  'fontSize',
  'fontFamily',
  'monoFontFamily',
  'defaultModel',
  'model',  // 当前选中的模型，格式为 provider/modelId (project-level config)
])

export function assertConfigKeyAllowed(key: string): void {
  if (!ALLOWED_CONFIG_KEYS.has(key)) {
    throw new Error(`Config key not exposed to renderer: ${key}`)
  }
}