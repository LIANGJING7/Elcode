/**
 * Glob tool display rule.
 *
 * ViewModel: pattern + matched file list, derived from
 *   - tool.args.pattern / path
 *   - tool.output.structured.items[].resource   (V2 file list)
 *   - tool.output.content[0].text               (fallback: newline-joined paths)
 *   - tool.output.result                        (V1: {count, truncated} + output string)
 *
 * Interaction: 'panel' — file list best viewed in the right panel.
 */
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../registry'
import { firstArgString, truncate } from '../summary'
import { getErrorMessage } from '../../utils/error-utils'

export interface GlobViewModel extends ToolViewModel {
  _kind: 'glob'
  pattern: string
  path: string
  files: string[]
  total: number
  truncated: boolean
  error: string | null
}

interface GlobStructured {
  items?: Array<{ resource?: string; path?: string }>
  truncated?: boolean
  partial?: boolean
}

export function createGlobViewModel(tool: ToolCall): GlobViewModel {
  const pattern = firstArgString(tool.args, ['pattern'])
  const path = firstArgString(tool.args, ['path'])
  const structured = tool.output?.structured as GlobStructured | undefined

  let files: string[] = []
  let truncated = false

  if (structured?.items && Array.isArray(structured.items)) {
    files = structured.items.map((it) => String(it.resource ?? it.path ?? '')).filter(Boolean)
    truncated = Boolean(structured.truncated || structured.partial)
  } else {
    const text =
      (tool.output?.content?.find((c) => c.type === 'text') as { text?: string } | undefined)?.text ??
      (typeof tool.output?.result === 'string' ? tool.output.result : '')
    files = text.split('\n').map((s) => s.trim()).filter((s) => s && !/^(No files|truncated|partial)/i.test(s))
    const resultObj = tool.output?.result as { truncated?: boolean } | undefined
    truncated = Boolean(resultObj?.truncated)
  }

  return {
    _kind: 'glob',
    pattern,
    path,
    files,
    total: files.length,
    truncated,
    error: getErrorMessage(tool.error) ?? null,
  }
}

export function makeGlobMeta(component: ToolMeta['component']): ToolMeta<GlobViewModel> {
  return {
    names: ['glob'],
    icon: '✱',
    title: 'Glob',
    component,
    defaultInteraction: 'panel',
    summary: (tool) => truncate(firstArgString(tool.args, ['pattern'])),
    createViewModel: createGlobViewModel,
    category: 'query',
  }
}
