/**
 * ToolMeta — Metadata for tool display.
 *
 * Renderer components call these methods to get display data.
 * Renderer never knows tool names, only knows display mode.
 */
import type { ToolCall } from '../../types/ipc'

/** Display mode — determines which renderer component to use */
export type ToolDisplayMode = 'inline' | 'block' | 'shell' | 'subagent' | 'generic' | 'none'

/** Display context — for future multi-device support */
export interface DisplayContext {
  mode?: 'desktop' | 'mobile' | 'tui'
  width?: number
}

/** ToolMeta — all tool-specific display logic lives here */
export interface ToolMeta {
  /** Display mode */
  display: ToolDisplayMode
  
  /** Icon glyph (e.g., '$', '→', '✱', '◈') */
  icon: string
  
  /** Pending text while running */
  pending: string
  
  /** Summary for inline display */
  summary: (tool: ToolCall, ctx?: DisplayContext) => string
  
  /** Title for block display */
  title: (tool: ToolCall, ctx?: DisplayContext) => string
  
  /** Detail/body for block display */
  detail: (tool: ToolCall, ctx?: DisplayContext) => string
  
  /** Optional error formatter */
  error?: (tool: ToolCall) => string
  
  /** Hide the status icon (✓/✗) for clean inline display */
  hideStatusIcon?: boolean
}

/** Diagnostic for code errors */
export interface Diagnostic {
  line: number
  character: number
  message: string
}