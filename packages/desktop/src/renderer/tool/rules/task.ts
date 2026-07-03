/**
 * Task (subagent) tool display rule.
 *
 * ViewModel: subagentType + description + state + summary, derived from
 *   - tool.args.subagent_type / description
 *   - tool.output.structured       (typed { type:'task', subagentType, state, summary })
 *   - tool.output.result           (legacy task result)
 */
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../registry'
import { truncate } from '../summary'

export interface TaskViewModel extends ToolViewModel {
  _kind: 'task'
  subagentType: string
  description: string
  state: string
  summary: string
}

function titlecase(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function createTaskViewModel(tool: ToolCall): TaskViewModel {
  const structured = tool.output?.structured
  const taskStructured =
    structured && structured.type === 'task' ? structured : undefined

  const subagentType = titlecase(
    String(tool.args.subagent_type ?? tool.args.subagentType ?? taskStructured?.subagentType ?? 'general'),
  )
  const description = String(tool.args.description ?? '')
  const state =
    taskStructured?.state ??
    (tool.status === 'completed' ? 'completed' : tool.status === 'error' ? 'error' : 'running')

  return {
    _kind: 'task',
    subagentType,
    description,
    state,
    summary: taskStructured?.summary ?? '',
  }
}

export function makeTaskMeta(component: ToolMeta['component']): ToolMeta<TaskViewModel> {
  return {
    names: ['task'],
    icon: '#',
    title: 'Task',
    component,
    defaultInteraction: 'inline',
    summary: (tool) => truncate(createTaskViewModel(tool).description, 40),
    createViewModel: createTaskViewModel,
    category: 'execution',
  }
}
