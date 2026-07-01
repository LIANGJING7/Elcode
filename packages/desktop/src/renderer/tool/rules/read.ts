/**
 * Read tool display rule.
 *
 * ViewModel: discriminated by content kind (file text / directory / image),
 * derived from
 *   - tool.args.filePath / path / offset / limit
 *   - tool.output.structured   (V2: TextContent | TextPage | ListPage | BinaryContent)
 *   - tool.output.content      (V2 image: file part with base64)
 *   - tool.output.result       (V1: {display:{type,path,text,lineStart,...}} or output string)
 *
 * Interaction: 'inspect' — file content / directory listing best in right panel.
 */
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../registry'
import { pathSummary } from '../summary'

export interface ReadFileViewModel extends ToolViewModel {
  _kind: 'read'
  variant: 'file'
  filePath: string
  content: string
  lineStart: number
  lineEnd: number
  totalLines: number | null
  truncated: boolean
}

export interface ReadDirViewModel extends ToolViewModel {
  _kind: 'read'
  variant: 'directory'
  path: string
  entries: string[]
  totalEntries: number | null
  truncated: boolean
}

export interface ReadImageViewModel extends ToolViewModel {
  _kind: 'read'
  variant: 'image'
  filePath: string
  dataUrl: string
  mime: string
}

export type ReadViewModel = ReadFileViewModel | ReadDirViewModel | ReadImageViewModel

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

export function createReadViewModel(tool: ToolCall): ReadViewModel {
  const filePath = String(tool.args.filePath ?? tool.args.path ?? tool.args.file ?? '')
  const structured = tool.output?.structured as ReadTextPage & ReadListPage & ReadBinary | undefined

  // V2 image: BinaryContent { type:'binary', content(base64), mime }
  if (structured?.type === 'binary') {
    const mime = String(structured.mime ?? 'image/png')
    const dataUrl = `data:${mime};base64,${structured.content ?? ''}`
    return { _kind: 'read', variant: 'image', filePath, dataUrl, mime }
  }
  // V2 image via content file part
  const filePart = tool.output?.content?.find((c) => c.type === 'file') as
    | { type: 'file'; mime?: string; source?: { data?: string } } | undefined
  if (filePart) {
    const mime = String(filePart.mime ?? 'image/png')
    const data = filePart.source?.data ?? ''
    return { _kind: 'read', variant: 'image', filePath, dataUrl: `data:${mime};base64,${data}`, mime }
  }

  // V2 directory: ListPage { entries[], truncated } — note: no `type` field
  if (Array.isArray(structured?.entries)) {
    const entries = (structured!.entries ?? [])
      .map((e) => String(e?.path ?? ''))
      .filter(Boolean)
    return {
      _kind: 'read',
      variant: 'directory',
      path: filePath,
      entries,
      totalEntries: entries.length,
      truncated: Boolean(structured!.truncated),
    }
  }

  // V2 text: TextPage { content, offset, truncated, next } or TextContent { content }
  if (typeof structured?.content === 'string') {
    const offset = Number(structured.offset ?? 1)
    const lines = structured.content.split('\n')
    return {
      _kind: 'read',
      variant: 'file',
      filePath,
      content: structured.content,
      lineStart: offset,
      lineEnd: offset + lines.length - 1,
      totalLines: null,
      truncated: Boolean(structured.truncated),
    }
  }

  // V1 fallback: result.display or result output string
  const resultObj = tool.output?.result as { display?: ReadV1Display; output?: string } | undefined
  const display = resultObj?.display
  if (display?.type === 'directory') {
    return {
      _kind: 'read',
      variant: 'directory',
      path: String(display.path ?? filePath),
      entries: display.entries ?? [],
      totalEntries: display.totalEntries ?? null,
      truncated: Boolean(display.truncated),
    }
  }
  if (display?.type === 'file' && typeof display.text === 'string') {
    return {
      _kind: 'read',
      variant: 'file',
      filePath: String(display.path ?? filePath),
      content: display.text,
      lineStart: display.lineStart ?? 1,
      lineEnd: display.lineEnd ?? display.lineStart ?? 1,
      totalLines: display.totalLines ?? null,
      truncated: Boolean(display.truncated),
    }
  }

  // Last resort: plain result string
  const raw = typeof resultObj?.output === 'string' ? resultObj.output : ''
  return {
    _kind: 'read',
    variant: 'file',
    filePath,
    content: raw,
    lineStart: 1,
    lineEnd: raw ? raw.split('\n').length : 1,
    totalLines: null,
    truncated: false,
  }
}

export function makeReadMeta(component: ToolMeta['component']): ToolMeta<ReadViewModel> {
  return {
    names: ['read', 'read_file'],
    icon: '→',
    title: 'Read',
    component,
    defaultInteraction: 'inspect',
    summary: pathSummary,
    createViewModel: createReadViewModel,
  }
}
