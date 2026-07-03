/**
 * Edit tool display rule.
 *
 * ViewModel: filePath + unified diff + additions/deletions, derived from
 *   - tool.args.filePath           (target file)
 *   - tool.output.structured       (typed { type:'edit', diff, additions, deletions })
 *   - tool.output.result.diff      (legacy fallback)
 */
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../registry'
import { pathSummary } from '../summary'

export interface EditViewModel extends ToolViewModel {
  _kind: 'edit'
  filePath: string
  diff: string
  additions: number | null
  deletions: number | null
}

export function createEditViewModel(tool: ToolCall): EditViewModel {
  const structured = tool.output?.structured
  const editStructured =
    structured && structured.type === 'edit' ? structured : undefined

  const resultObj = tool.output?.result as { diff?: string; additions?: number; deletions?: number } | undefined
  const filePath = String(tool.args.filePath ?? tool.args.file ?? tool.args.path ?? '')

  return {
    _kind: 'edit',
    filePath,
    diff: editStructured?.diff ?? resultObj?.diff ?? '',
    additions: editStructured?.additions ?? resultObj?.additions ?? null,
    deletions: editStructured?.deletions ?? resultObj?.deletions ?? null,
  }
}

export function makeEditMeta(component: ToolMeta['component']): ToolMeta<EditViewModel> {
  return {
    names: ['edit', 'edit_file', 'apply_patch'],
    icon: '←',
    title: 'Edit',
    component,
    defaultInteraction: 'inline',
    summary: pathSummary,
    createViewModel: createEditViewModel,
    category: 'execution',
  }
}
