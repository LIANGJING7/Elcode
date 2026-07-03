/**
 * Code Rendering Types.
 *
 * These types define the data model for code/text rendering.
 * RenderLine is the core unit that supports:
 *   - Syntax highlighting via tokens
 *   - Virtual scrolling (Phase 2.2)
 *   - Search (Phase 2.3)
 *   - Selection, folding, diagnostics (future)
 */

/** Single syntax highlighting token from Shiki */
export interface RenderToken {
  content: string
  color?: string // Shiki color value (e.g., '#FF79C6')
  fontStyle?: number // 0: normal, 1: italic, 2: bold, 4: underline
}

/** A renderable line with optional syntax highlighting */
export interface RenderLine {
  id: string
  number: number // Line number (starting from lineStart)
  text: string // Original text content (for search)
  tokens?: RenderToken[] // Optional syntax tokens
}

/** File rendering model for TextViewer */
export interface FileRenderModel {
  _kind: 'read'
  filePath: string
  fileName: string
  directory?: string
  lang?: string // Detected language
  lines: RenderLine[]
  totalLines: number
  truncated: boolean
  lineStart: number
  options: {
    wrap: boolean
    showLineNumbers: boolean
  }
}

/** Diff rendering model for DiffViewer */
export interface DiffRenderModel {
  _kind: 'diff'
  filePath: string
  fileName: string
  directory?: string
  hunks: DiffHunk[]
  lines: DiffLine[]
  statistics: {
    additions: number
    deletions: number
  }
  options: {
    mode: 'unified' | 'split'
    showMeta: boolean
    wrap: boolean
  }
}

/** Diff hunk (a section of changes) */
export interface DiffHunk {
  id: string
  startLine: number
  oldStart: number
  newStart: number
  lineCount: number
  folded: boolean
  lines: DiffLine[]
}

/** Diff line */
export interface DiffLine {
  id: string
  type: 'context' | 'add' | 'remove' | 'hunk' | 'meta'
  oldLine?: number
  newLine?: number
  text: string
  tokens?: RenderToken[] // Optional syntax highlighting
}

/**
 * DiffRow - Row-pair model for split diff view.
 *
 * Each row represents a pair of lines (old and new) that should be
 * displayed together. This model enables:
 * - Single scroll container (no sync needed)
 * - Natural equal-height sides
 * - Simple folding and selection
 * - Easy virtual scroll integration
 *
 * Example conversion:
 *   -old A    → { old: { text: 'A' }, new: undefined }
 *   +new B    → { old: undefined, new: { text: 'B' } }
 *   -old B    → { old: { text: 'B' }, new: { text: 'B' } }
 *   +new B
 *   context   → { old: { text: 'ctx' }, new: { text: 'ctx' } }
 */
export interface DiffRow {
  id: string
  hunkId: string
  type: 'context' | 'change' | 'hunk-header'
  /** Old version line (deletion side) */
  old?: RenderLine
  /** New version line (addition side) */
  new?: RenderLine
  /** For hunk-header: how many lines in this hunk */
  lineCount?: number
  /** Whether this hunk is collapsed */
  folded?: boolean
}