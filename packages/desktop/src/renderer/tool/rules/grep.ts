/**
 * Grep tool display rule.
 *
 * ViewModel: pattern + match list (resource:line:content), derived from
 *   - tool.args.pattern / path
 *   - tool.output.structured.items[]   (V2: {resource, line, lines, submatches})
 *   - tool.output.content[0].text      (fallback: parse "Found N matches" blob)
 *   - tool.output.result               (V1: {matches, truncated} + output string)
 *
 * Interaction: 'panel' — matches are a list, best viewed in the right panel.
 */
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../registry'
import { truncate, firstArgString } from '../summary'

export interface GrepMatch {
  resource: string
  line: number
  content: string
  truncated: boolean
}

export interface GrepViewModel extends ToolViewModel {
  _kind: 'grep'
  pattern: string
  path: string
  matches: GrepMatch[]
  total: number
  truncated: boolean
}

interface GrepStructured {
  items?: Array<{ resource?: string; line?: number; lines?: string; linePreviewTruncated?: boolean }>
  truncated?: boolean
  partial?: boolean
}

/** Parse the V2 toModelOutput text blob as a fallback when structured.items is absent. */
function parseMatchesFromText(text: string): GrepMatch[] {
  if (!text) return []
  const out: GrepMatch[] = []
  let currentResource = ''
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    // "Found N matches" / "No files found" / trailer lines — skip
    if (/^(Found |No files|Results |Showing |truncated|partial)/i.test(line)) continue
    // "<resource>:" header
    const header = line.match(/^([^:\s]+):\s*$/)
    if (header) {
      currentResource = header[1]
      continue
    }
    // "  Line N: content"
    const m = line.match(/^\s*Line\s+(\d+):\s*(.*)$/)
    if (m) {
      out.push({
        resource: currentResource,
        line: Number(m[1]),
        content: m[2],
        truncated: false,
      })
    }
  }
  return out
}

export function createGrepViewModel(tool: ToolCall): GrepViewModel {
  const pattern = firstArgString(tool.args, ['pattern'])
  const path = firstArgString(tool.args, ['path'])
  const structured = tool.output?.structured as GrepStructured | undefined

  let matches: GrepMatch[] = []
  let truncated = false

  if (structured?.items && Array.isArray(structured.items)) {
    matches = structured.items.map((it) => ({
      resource: String(it.resource ?? ''),
      line: Number(it.line ?? 0),
      content: String(it.lines ?? ''),
      truncated: Boolean(it.linePreviewTruncated),
    }))
    truncated = Boolean(structured.truncated || structured.partial)
  } else {
    // Fallback: parse the formatted text (V2 content or V1 result output)
    const text =
      (tool.output?.content?.find((c) => c.type === 'text') as { text?: string } | undefined)?.text ??
      (typeof tool.output?.result === 'string' ? tool.output.result : '')
    matches = parseMatchesFromText(text)
    const resultObj = tool.output?.result as { matches?: number; truncated?: boolean } | undefined
    truncated = Boolean(resultObj?.truncated)
  }

  return {
    _kind: 'grep',
    pattern,
    path,
    matches,
    total: matches.length,
    truncated,
  }
}

export function makeGrepMeta(component: ToolMeta['component']): ToolMeta<GrepViewModel> {
  return {
    names: ['grep'],
    icon: '✱',
    title: 'Grep',
    component,
    defaultInteraction: 'panel',
    summary: (tool) => `"${truncate(firstArgString(tool.args, ['pattern']))}"`,
    createViewModel: createGrepViewModel,
  }
}
