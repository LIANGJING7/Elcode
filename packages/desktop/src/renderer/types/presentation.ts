// packages/desktop/src/renderer/types/presentation.ts

import type { Component } from 'vue'
import type { GrepViewModel } from '../tool/rules/grep'
import type { GlobViewModel } from '../tool/rules/glob'
import type { WebFetchViewModel } from '../tool/rules/webfetch'
import type { WebSearchViewModel } from '../tool/rules/websearch'

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

// 扩展 FileModel：直接引用现有 ViewModel 类型
export type FileModel =
  | ReadFileModel
  | DiffModel
  | ImageModel
  | GrepViewModel
  | GlobViewModel
  | WebFetchViewModel
  | WebSearchViewModel

// ===== UnknownToolModel (兜底) =====
export interface UnknownToolModel {
  _kind: 'unknown'
  toolName: string
  args: Record<string, unknown>
  result?: unknown
}

// ===== FileTab (UI State) =====
export type FileTabStatus = 'loading' | 'ready' | 'error'

export interface FileTab {
  id: string
  title: string
  subtitle?: string
  filePath?: string  // 仅文件类工具需要
  component: Component  // 直接存储 Vue 组件
  model: FileModel | UnknownToolModel
  status: FileTabStatus
  dirty?: boolean
  viewerState?: {
    scrollTop?: number
    cursorLine?: number
    foldedHunks?: string[]
  }
}