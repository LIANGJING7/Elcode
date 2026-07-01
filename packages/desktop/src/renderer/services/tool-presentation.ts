import type { ToolCall } from '../../types/ipc'
import type {
  FileTab,
  ReadFileModel,
  DiffModel,
  ImageModel,
  TextLine,
  DiffLine,
  HunkInfo,
} from '../types/presentation'

/** 生成稳定 id (Electron renderer 中 crypto.randomUUID 可用) */
function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** 从 filePath 拆分出 fileName 和 directory */
function splitPath(filePath: string): { fileName: string; directory?: string } {
  const parts = filePath.split('/')
  const fileName = parts.pop() ?? filePath
  const directory = parts.length > 0 ? parts.join('/') + '/' : undefined
  return { fileName, directory }
}

/** 从 ToolCall 提取 read content (V2 structured → V1 display → raw string) */
function extractReadContent(tool: ToolCall): { content: string; offset: number; truncated: boolean } {
  const structured = tool.output?.structured as
    | { content?: string; offset?: number; truncated?: boolean; type?: string }
    | undefined

  // V2: structured.content (TextPage / TextContent)
  if (typeof structured?.content === 'string') {
    return {
      content: structured.content,
      offset: Number(structured.offset ?? 1),
      truncated: Boolean(structured.truncated),
    }
  }

  // V1: result.display.text
  const resultObj = tool.output?.result as
    | { display?: { text?: string; lineStart?: number; truncated?: boolean }; output?: string }
    | undefined
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

/** 从 ToolCall 提取 diff (V2 structured → V1 result) */
function extractDiff(tool: ToolCall): string {
  const structured = tool.output?.structured as
    | { type?: string; diff?: string }
    | undefined
  if (structured?.diff) return structured.diff
  const resultObj = tool.output?.result as { diff?: string } | undefined
  return resultObj?.diff ?? ''
}

function buildReadFileModel(tool: ToolCall): ReadFileModel {
  const filePath = String(tool.args.filePath ?? tool.args.path ?? tool.args.file ?? '')
  const { content, offset, truncated } = extractReadContent(tool)
  const { fileName, directory } = splitPath(filePath)

  const lines: TextLine[] = content.split('\n').map((text, i) => ({
    id: genId(),
    lineNumber: offset + i,
    text,
  }))

  return {
    _kind: 'read',
    filePath,
    fileName,
    directory,
    lines,
    totalLines: lines.length,
    truncated,
    lineStart: offset,
    options: { wrap: false, showLineNumbers: true },
  }
}

function buildImageModel(tool: ToolCall): ImageModel {
  const filePath = String(tool.args.filePath ?? tool.args.path ?? tool.args.file ?? '')
  const { fileName, directory } = splitPath(filePath)

  const structured = tool.output?.structured as
    | { content?: string; mime?: string; type?: string }
    | undefined

  const mime = String(structured?.mime ?? 'image/png')
  const data = structured?.content ?? ''
  const dataUrl = `data:${mime};base64,${data}`

  return {
    _kind: 'image',
    filePath,
    fileName,
    directory,
    dataUrl,
  }
}

/** 检查 read tool 是否为 image variant */
function isReadImage(tool: ToolCall): boolean {
  const structured = tool.output?.structured as { type?: string } | undefined
  if (structured?.type === 'binary') return true
  const filePart = tool.output?.content?.find((c) => c.type === 'file')
  return Boolean(filePart)
}

function buildReadTab(tool: ToolCall): FileTab {
  const isImage = isReadImage(tool)
  const model = isImage ? buildImageModel(tool) : buildReadFileModel(tool)
  const { fileName, directory, filePath } = model

  return {
    id: tool.id,
    title: fileName,
    subtitle: directory,
    filePath,
    viewer: isImage ? 'image' : 'text',
    model,
    status: tool.status === 'running' ? 'loading' : 'ready',
  }
}

function buildDiffModel(tool: ToolCall): DiffModel {
  const filePath = String(tool.args.filePath ?? tool.args.file ?? tool.args.path ?? '')
  const diff = extractDiff(tool)
  const { fileName, directory } = splitPath(filePath)

  const rawLines = diff.split('\n')
  const diffLines: DiffLine[] = []
  const hunks: HunkInfo[] = []
  let currentHunk: HunkInfo | null = null
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
      currentHunk = { id: genId(), startLine: newLine, lines: [], collapsed: false }
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
      const line: DiffLine = { id, type: 'add', newLine, text: rawLine.slice(1) }
      diffLines.push(line)
      currentHunk?.lines.push(line)
      newLine++
      continue
    }

    // Remove line
    if (rawLine.startsWith('-')) {
      const line: DiffLine = { id, type: 'remove', oldLine, text: rawLine.slice(1) }
      diffLines.push(line)
      currentHunk?.lines.push(line)
      oldLine++
      continue
    }

    // Context line (may start with space or be empty)
    const line: DiffLine = {
      id,
      type: 'context',
      oldLine,
      newLine,
      text: rawLine,
    }
    diffLines.push(line)
    currentHunk?.lines.push(line)
    oldLine++
    newLine++
  }

  return {
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
}

function buildDiffTab(tool: ToolCall): FileTab {
  const model = buildDiffModel(tool)
  return {
    id: tool.id,
    title: model.fileName,
    subtitle: model.directory,
    filePath: model.filePath,
    viewer: 'diff',
    model,
    status: 'ready',
  }
}

export function toolToPresentationModel(tool: ToolCall): FileTab | null {
  switch (tool.name) {
    case 'read':
      return buildReadTab(tool)
    case 'edit':
    case 'write':
      return buildDiffTab(tool)
    default:
      return null
  }
}
