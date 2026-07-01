/**
 * Shared summary helpers for ToolMeta rules.
 *
 * Extracted from the previous ToolCallBlock/selector logic so all tool rules
 * share one tool-agnostic summary extractor instead of re-implementing it.
 */
import type { ToolCall } from '../../types/ipc'

/** Truncate a string to maxLen, appending "..." if cut. */
export function truncate(str: string, maxLen: number = 50): string {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

/** First meaningful string value from args, walking a priority-ordered key list. */
export function firstArgString(args: Record<string, unknown>, priorityKeys: string[]): string {
  for (const key of priorityKeys) {
    const val = args[key]
    if (typeof val === 'string' && val.length > 0) {
      return val
    }
  }
  // Fallback: first string value found
  for (const val of Object.values(args)) {
    if (typeof val === 'string' && val.length > 0) {
      return val
    }
  }
  return ''
}

/** Common priority keys for path/command/pattern-style tools. */
export const PATH_KEYS = ['filePath', 'path', 'file']
export const COMMAND_KEYS = ['command', 'cmd']

/** Extract a path-like summary (read/write/edit). */
export function pathSummary(tool: ToolCall): string {
  return truncate(firstArgString(tool.args, PATH_KEYS))
}

/** Extract a command-like summary (bash/shell). */
export function commandSummary(tool: ToolCall): string {
  return truncate(firstArgString(tool.args, COMMAND_KEYS))
}

/** Extract a pattern/query-like summary (grep/glob/search). */
export function patternSummary(tool: ToolCall): string {
  return truncate(firstArgString(tool.args, ['pattern', 'query', 'symbol']))
}
