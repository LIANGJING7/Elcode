/**
 * Write tool display rule.
 *
 * ViewModel: filePath + content + existed flag, derived from
 *   - tool.args.filePath / content  (target file + written content)
 *   - tool.output.structured        (typed { type:'write', existed })
 *   - tool.output.result            (legacy { existed, resource })
 */
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../registry'
import { pathSummary } from '../summary'

export interface WriteViewModel extends ToolViewModel {
  _kind: 'write'
  filePath: string
  content: string
  existed: boolean
}

export function createWriteViewModel(tool: ToolCall): WriteViewModel {
  const structured = tool.output?.structured
  const writeStructured =
    structured && structured.type === 'write' ? structured : undefined

  const resultObj = tool.output?.result as { existed?: boolean; resource?: string } | undefined
  const filePath = String(tool.args.filePath ?? tool.args.file ?? tool.args.path ?? '')

  return {
    _kind: 'write',
    filePath,
    content: String(tool.args.content ?? ''),
    existed: writeStructured?.existed ?? resultObj?.existed ?? false,
  }
}

export function makeWriteMeta(component: ToolMeta['component']): ToolMeta<WriteViewModel> {
  return {
    names: ['write', 'write_file'],
    icon: '←',
    title: 'Write',
    component,
    defaultInteraction: 'inline',
    summary: pathSummary,
    createViewModel: createWriteViewModel,
  }
}
