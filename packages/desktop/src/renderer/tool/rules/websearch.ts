/**
 * Web search tool display rule.
 *
 * ViewModel: query + provider + result text blob, derived from
 *   - tool.args.query
 *   - tool.output.structured   (V2: { provider, text })
 *   - tool.output.content[0].text / tool.output.result (fallback text)
 *
 * Note: the backend does NOT return a parsed {title,url,snippet}[] list —
 * only a provider-formatted text blob. The view renders it as preformatted
 * text; a future enhancement could parse it into structured results.
 *
 * Interaction: 'panel' — result text best viewed in the right panel.
 */
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../registry'
import { truncate, firstArgString } from '../summary'

export interface WebSearchViewModel extends ToolViewModel {
  _kind: 'web_search'
  query: string
  provider: string
  text: string
  hasResults: boolean
}

interface WebSearchStructured {
  provider?: string
  text?: string
}

const NO_RESULTS_RE = /^No search results found/i

export function createWebSearchViewModel(tool: ToolCall): WebSearchViewModel {
  const structured = tool.output?.structured as WebSearchStructured | undefined

  const text =
    structured?.text ??
    (tool.output?.content?.find((c) => c.type === 'text') as { text?: string } | undefined)?.text ??
    (typeof tool.output?.result === 'string' ? tool.output.result : '')

  return {
    _kind: 'web_search',
    query: firstArgString(tool.args, ['query']),
    provider: String(structured?.provider ?? ''),
    text,
    hasResults: Boolean(text) && !NO_RESULTS_RE.test(text.trim()),
  }
}

export function makeWebSearchMeta(component: ToolMeta['component']): ToolMeta<WebSearchViewModel> {
  return {
    names: ['web_search', 'websearch'],
    icon: '◈',
    title: 'Search',
    component,
    defaultInteraction: 'panel',
    summary: (tool) => truncate(firstArgString(tool.args, ['query'])),
    createViewModel: createWebSearchViewModel,
    category: 'query',
  }
}
