/**
 * Todo tool display rule.
 *
 * ViewModel: todos list, derived from
 *   - tool.output.structured       (typed { type:'todo', todos })
 *   - tool.output.result.todos     (legacy fallback)
 *   - tool.args.todos              (input fallback)
 */
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../registry'

export interface TodoItem {
  status: string
  content: string
}

export interface TodoViewModel extends ToolViewModel {
  _kind: 'todo'
  todos: TodoItem[]
}

function normalizeTodos(raw: unknown): TodoItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is { status?: string; content?: string } =>
      typeof item === 'object' && item !== null)
    .map((item) => ({
      status: typeof item.status === 'string' ? item.status : 'pending',
      content: typeof item.content === 'string' ? item.content : '',
    }))
    .filter((item) => item.content.length > 0)
}

export function createTodoViewModel(tool: ToolCall): TodoViewModel {
  const structured = tool.output?.structured
  const todoStructured =
    structured && structured.type === 'todo' ? structured : undefined

  const resultObj = tool.output?.result as { todos?: unknown } | undefined

  const todos =
    todoStructured?.todos ??
    resultObj?.todos ??
    (tool.args.todos as unknown)

  return {
    _kind: 'todo',
    todos: normalizeTodos(todos),
  }
}

export function makeTodoMeta(component: ToolMeta['component']): ToolMeta<TodoViewModel> {
  return {
    names: ['todo_write', 'todowrite', 'todo_update'],
    icon: '#',
    title: 'Todos',
    component,
    defaultInteraction: 'inline',
    summary: () => 'Update todo list',
    createViewModel: createTodoViewModel,
  }
}
