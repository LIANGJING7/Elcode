/**
 * Tool to Presentation Model transformer.
 *
 * Converts ToolCall → FileTab for display in FileTabsPanel.
 * Uses a registry pattern (TOOL_BUILDERS) for extensibility.
 *
 * To add a new tool:
 *   1. Create (or reuse) a Viewer component
 *   2. Create a buildXxxTab function
 *   3. Register in TOOL_BUILDERS
 *
 * No need to modify FileTabsPanel or presentation.ts types.
 */
import { markRaw } from 'vue'
import type { ToolCall } from '../../types/ipc'
import type { FileTab, FileTabStatus, ReadFileModel, DiffModel, ImageModel, UnknownToolModel } from '../types/presentation'
import { detectLanguage } from '../utils/language'

// Viewer components - markRaw 防止 Vue 响应式追踪
import TextViewer from '../components/file-tabs/TextViewer.vue'
import DiffViewer from '../components/file-tabs/DiffViewer.vue'
import ImageViewer from '../components/file-tabs/ImageViewer.vue'
import GrepView from '../components/tool/views/GrepView.vue'
import GlobView from '../components/tool/views/GlobView.vue'
import WebFetchView from '../components/tool/views/WebFetchView.vue'
import WebSearchView from '../components/tool/views/WebSearchView.vue'
import UnknownViewer from '../components/file-tabs/UnknownViewer.vue'

// 用 markRaw 包装组件，避免响应式追踪
const TextViewerRaw = markRaw(TextViewer)
const DiffViewerRaw = markRaw(DiffViewer)
const ImageViewerRaw = markRaw(ImageViewer)
const GrepViewRaw = markRaw(GrepView)
const GlobViewRaw = markRaw(GlobView)
const WebFetchViewRaw = markRaw(WebFetchView)
const WebSearchViewRaw = markRaw(WebSearchView)
const UnknownViewerRaw = markRaw(UnknownViewer)

// ViewModel creators
import { createGrepViewModel, type GrepViewModel } from '../tool/rules/grep'
import { createGlobViewModel, type GlobViewModel } from '../tool/rules/glob'
import { createWebFetchViewModel, type WebFetchViewModel } from '../tool/rules/webfetch'
import { createWebSearchViewModel, type WebSearchViewModel } from '../tool/rules/websearch'

// ============================================
// Helpers
// ============================================

/** Generate stable id (Electron renderer has crypto.randomUUID) */
function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Split filePath into fileName and directory */
function splitPath(filePath: string): { fileName: string; directory?: string } {
  const parts = filePath.split('/')
  const fileName = parts.pop() ?? filePath
  const directory = parts.length > 0 ? parts.join('/') + '/' : undefined
  return { fileName, directory }
}

/** Truncate string with ellipsis */
function truncate(str: string, maxLen: number = 30): string {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

/** Derive FileTabStatus from ToolCall.status */
function deriveStatus(toolStatus: string): FileTabStatus {
  if (toolStatus === 'running') return 'loading'
  if (toolStatus === 'error') return 'error'
  return 'ready'
}

// ============================================
// Extract content helpers (for read/edit/write)
// ============================================

interface ReadTextPage {
  type?: string
  content?: string
  offset?: number
  truncated?: boolean
  next?: number
  mime?: string
}

interface ReadListPage {
  entries?: Array<{ path?: string; type?: string; mime?: string }>
  truncated?: boolean
  next?: number
}

interface ReadBinary {
  type?: string
  content?: string
  mime?: string
}

interface ReadV1Display {
  type?: string
  path?: string
  text?: string
  lineStart?: number
  lineEnd?: number
  totalLines?: number
  entries?: string[]
  offset?: number
  totalEntries?: number
  truncated?: boolean
}

/** Extract read content from ToolCall output */
function extractReadContent(tool: ToolCall): { content: string; offset: number; truncated: boolean } {
  const structured = tool.output?.structured as ReadTextPage | undefined

  // V2: structured.content
  if (typeof structured?.content === 'string') {
    return {
      content: structured.content,
      offset: Number(structured.offset ?? 1),
      truncated: Boolean(structured.truncated),
    }
  }

  // V1: result.display.text
  const resultObj = tool.output?.result as { display?: ReadV1Display; output?: string } | undefined
  if (resultObj?.display?.text) {
    return {
      content: resultObj.display.text,
      offset: resultObj.display.lineStart ?? 1,
      truncated: Boolean(resultObj.display.truncated),
    }
  }

  // Last resort: raw output string
  const raw = typeof resultObj?.output === 'string' ? resultObj.output : ''
  return { content: raw, offset: 1, truncated: false }
}

/** Check if read tool output is an image */
function isReadImage(tool: ToolCall): boolean {
  const structured = tool.output?.structured as { type?: string } | undefined
  if (structured?.type === 'binary') return true
  const filePart = tool.output?.content?.find((c) => c.type === 'file')
  return Boolean(filePart)
}

/** Extract diff content from ToolCall output */
function extractDiff(tool: ToolCall): string {
  const structured = tool.output?.structured as { type?: string; diff?: string } | undefined
  if (structured?.diff) return structured.diff
  const resultObj = tool.output?.result as { diff?: string } | undefined
  return resultObj?.diff ?? ''
}

// ============================================
// Tab Builders
// ============================================

type TabBuilder = (tool: ToolCall) => FileTab

function buildReadTab(tool: ToolCall): FileTab {
  const filePath = String(tool.args.filePath ?? tool.args.path ?? tool.args.file ?? '')
  const isImage = isReadImage(tool)
  const { fileName, directory } = splitPath(filePath)

  if (isImage) {
    // Build ImageModel
    const structured = tool.output?.structured as { content?: string; mime?: string } | undefined
    const mime = String(structured?.mime ?? 'image/png')
    const data = structured?.content ?? ''
    const dataUrl = `data:${mime};base64,${data}`

    const model: ImageModel = {
      _kind: 'image',
      filePath,
      fileName,
      directory,
      dataUrl,
    }

    return {
      type: 'file',
      id: tool.id,
      title: fileName,
      subtitle: directory,
      filePath,
      component: ImageViewerRaw,
      model,
      status: deriveStatus(tool.status),
    }
  }

  // Build ReadFileModel (FileRenderModel)
  const { content, offset, truncated } = extractReadContent(tool)
  
  // Import language detection
  const lang = detectLanguage(filePath)
  
  // Create RenderLine[] (without tokens - will be highlighted in TextViewer)
  const lines = content.split('\n').map((text, i) => ({
    id: genId(),
    number: offset + i,
    text,
    tokens: undefined, // Will be filled by code-renderer
  }))

  const model: ReadFileModel = {
    _kind: 'read',
    filePath,
    fileName,
    directory,
    lang,
    lines,
    totalLines: lines.length,
    truncated,
    lineStart: offset,
    options: { wrap: false, showLineNumbers: true },
  }

  return {
    type: 'file',
    id: tool.id,
    title: fileName,
    subtitle: directory,
    filePath,
    component: TextViewerRaw,
    model,
    status: deriveStatus(tool.status),
  }
}

function buildDiffTab(tool: ToolCall): FileTab {
  const filePath = String(tool.args.filePath ?? tool.args.file ?? tool.args.path ?? '')
  const diff = extractDiff(tool)
  const { fileName, directory } = splitPath(filePath)

  // Parse diff into lines
  const rawLines = diff.split('\n')
  const diffLines: Array<{ id: string; type: 'context' | 'add' | 'remove' | 'hunk' | 'meta'; oldLine?: number; newLine?: number; text: string }> = []
  const hunks: Array<{ id: string; startLine: number; lines: typeof diffLines }> = []
  let currentHunk: typeof hunks[0] | null = null
  let oldLine = 0
  let newLine = 0

  for (const rawLine of rawLines) {
    const id = genId()

    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    if (rawLine.startsWith('@@')) {
      const match = rawLine.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
      if (match) {
        oldLine = parseInt(match[1], 10)
        newLine = parseInt(match[2], 10)
      }
      currentHunk = { id: genId(), startLine: newLine, lines: [] }
      hunks.push(currentHunk)
      diffLines.push({ id, type: 'hunk', text: rawLine })
      continue
    }

    // Meta: --- a/ +++ b/
    if (rawLine.startsWith('---') || rawLine.startsWith('+++')) {
      diffLines.push({ id, type: 'meta', text: rawLine })
      continue
    }

    // Add line
    if (rawLine.startsWith('+')) {
      const line = { id, type: 'add' as const, newLine, text: rawLine.slice(1) }
      diffLines.push(line)
      currentHunk?.lines.push(line)
      newLine++
      continue
    }

    // Remove line
    if (rawLine.startsWith('-')) {
      const line = { id, type: 'remove' as const, oldLine, text: rawLine.slice(1) }
      diffLines.push(line)
      currentHunk?.lines.push(line)
      oldLine++
      continue
    }

    // Context line
    const line = { id, type: 'context' as const, oldLine, newLine, text: rawLine }
    diffLines.push(line)
    currentHunk?.lines.push(line)
    oldLine++
    newLine++
  }

  const model: DiffModel = {
    _kind: 'diff',
    filePath,
    fileName,
    directory,
    hunks,
    lines: diffLines,
    statistics: {
      additions: diffLines.filter((l) => l.type === 'add').length,
      deletions: diffLines.filter((l) => l.type === 'remove').length,
    },
    options: { mode: 'unified', showMeta: true, wrap: false },
  }

  return {
    type: 'file',
    id: tool.id,
    title: fileName,
    subtitle: directory,
    filePath,
    component: DiffViewerRaw,
    model,
    status: deriveStatus(tool.status),
  }
}

function buildGrepTab(tool: ToolCall): FileTab {
  const model = createGrepViewModel(tool)
  return {
    type: 'file',
    id: tool.id,
    title: `grep "${truncate(model.pattern, 20)}"`,
    subtitle: model.path,
    component: GrepViewRaw,
    model,
    status: deriveStatus(tool.status),
  }
}

function buildGlobTab(tool: ToolCall): FileTab {
  const model = createGlobViewModel(tool)
  return {
    type: 'file',
    id: tool.id,
    title: `glob "${truncate(model.pattern, 20)}"`,
    subtitle: model.path,
    component: GlobViewRaw,
    model,
    status: deriveStatus(tool.status),
  }
}

function buildWebFetchTab(tool: ToolCall): FileTab {
  const model = createWebFetchViewModel(tool)
  return {
    type: 'file',
    id: tool.id,
    title: `webfetch ${truncate(model.url, 25)}`,
    subtitle: model.contentType,
    component: WebFetchViewRaw,
    model,
    status: deriveStatus(tool.status),
  }
}

function buildWebSearchTab(tool: ToolCall): FileTab {
  const model = createWebSearchViewModel(tool)
  return {
    type: 'file',
    id: tool.id,
    title: `search "${truncate(model.query, 20)}"`,
    subtitle: model.provider,
    component: WebSearchViewRaw,
    model,
    status: deriveStatus(tool.status),
  }
}

function buildUnknownTab(tool: ToolCall): FileTab {
  const model: UnknownToolModel = {
    _kind: 'unknown',
    toolName: tool.name,
    args: tool.args ?? {},
    result: tool.output?.result,
  }
  return {
    type: 'file',
    id: tool.id,
    title: tool.name,
    subtitle: 'unknown tool',
    component: UnknownViewerRaw,
    model,
    status: deriveStatus(tool.status),
  }
}

// ============================================
// Registry
// ============================================

const TOOL_BUILDERS: Record<string, TabBuilder> = {
  read: buildReadTab,
  read_file: buildReadTab,
  edit: buildDiffTab,
  edit_file: buildDiffTab,
  write: buildDiffTab,
  write_file: buildDiffTab,
  grep: buildGrepTab,
  glob: buildGlobTab,
  webfetch: buildWebFetchTab,
  web_search: buildWebSearchTab,
  websearch: buildWebSearchTab,
}

// ============================================
// Main Entry
// ============================================

/**
 * Convert a ToolCall to a FileTab for display in FileTabsPanel.
 *
 * Returns a FileTab with the appropriate Viewer component and model.
 * Falls back to UnknownViewer for unregistered tools (debug-friendly).
 */
export function toolToPresentationModel(tool: ToolCall): FileTab {
  const builder = TOOL_BUILDERS[tool.name]
  if (builder) return builder(tool)

  // Fallback: UnknownViewer for debugging
  return buildUnknownTab(tool)
}

/**
 * Register a custom tab builder for a tool name.
 * Use this to extend FileTabsPanel support for new tools.
 */
export function registerTabBuilder(toolName: string, builder: TabBuilder): void {
  TOOL_BUILDERS[toolName] = builder
}