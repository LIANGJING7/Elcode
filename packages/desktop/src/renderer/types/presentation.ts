// packages/desktop/src/renderer/types/presentation.ts

// ===== Base Line Types =====
interface BaseLine {
  id: string
}

export interface TextLine extends BaseLine {
  lineNumber: number
  text: string
  highlights?: HighlightRange[]
}

export interface DiffLine extends BaseLine {
  type: 'context' | 'add' | 'remove' | 'hunk' | 'meta'
  oldLine?: number
  newLine?: number
  text: string
}

export interface HunkInfo {
  id: string
  startLine: number
  lines: DiffLine[]
  collapsed?: boolean
}

export interface HighlightRange {
  start: number
  end: number
  type: 'search' | 'syntax' | 'error' | 'warning'
}

// ===== FileModel (Domain) =====
export interface ReadFileModel {
  _kind: 'read'
  filePath: string
  fileName: string
  directory?: string
  lines: TextLine[]
  totalLines?: number
  truncated?: boolean
  lineStart?: number
  options: {
    wrap?: boolean
    showLineNumbers?: boolean
  }
}

export interface DiffModel {
  _kind: 'diff'
  filePath: string
  fileName: string
  directory?: string
  hunks: HunkInfo[]
  lines: DiffLine[]
  statistics: {
    additions: number
    deletions: number
    filesChanged?: number
  }
  options: {
    mode: 'unified' | 'split'
    showMeta?: boolean
    wrap?: boolean
  }
}

export interface ImageModel {
  _kind: 'image'
  filePath: string
  fileName: string
  directory?: string
  dataUrl: string
  metadata?: {
    width?: number
    height?: number
    size?: number
  }
}

export type FileModel = ReadFileModel | DiffModel | ImageModel

// ===== FileTab (UI State) =====
export type FileViewerType = 'text' | 'diff' | 'image'
export type FileTabStatus = 'loading' | 'ready' | 'error'

export interface FileTab {
  id: string
  title: string
  subtitle?: string
  filePath: string
  viewer: FileViewerType
  model: FileModel
  status: FileTabStatus
  dirty?: boolean
  viewerState?: {
    scrollTop?: number
    cursorLine?: number
    foldedHunks?: string[]
  }
}
