/**
 * Web fetch tool display rule.
 *
 * ViewModel: url + fetched content + format, derived from
 *   - tool.args.url / format
 *   - tool.output.structured   (V2: { url, contentType, format, output })
 *   - tool.output.content[0].text / tool.output.result (fallback content string)
 *
 * Interaction: 'panel' — fetched content best viewed in the right panel.
 */
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../registry'
import { truncate, firstArgString } from '../summary'

export interface WebFetchViewModel extends ToolViewModel {
  _kind: 'web_fetch'
  url: string
  contentType: string
  format: string
  content: string
}

interface WebFetchStructured {
  url?: string
  contentType?: string
  format?: string
  output?: string
}

export function createWebFetchViewModel(tool: ToolCall): WebFetchViewModel {
  const structured = tool.output?.structured as WebFetchStructured | undefined
  const url = String(structured?.url ?? tool.args.url ?? '')

  const content =
    structured?.output ??
    (tool.output?.content?.find((c) => c.type === 'text') as { text?: string } | undefined)?.text ??
    (typeof tool.output?.result === 'string' ? tool.output.result : '')

  return {
    _kind: 'web_fetch',
    url,
    contentType: String(structured?.contentType ?? ''),
    format: String(structured?.format ?? tool.args.format ?? 'markdown'),
    content,
  }
}

export function makeWebFetchMeta(component: ToolMeta['component']): ToolMeta<WebFetchViewModel> {
  return {
    names: ['web_fetch', 'webfetch'],
    icon: '%',
    title: 'WebFetch',
    component,
    defaultInteraction: 'panel',
    summary: (tool) => truncate(firstArgString(tool.args, ['url'])),
    createViewModel: createWebFetchViewModel,
  }
}
