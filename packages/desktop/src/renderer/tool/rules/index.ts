/**
 * Built-in tool rules — wires each ToolMeta to its Vue component and
 * registers them with the global registry.
 *
 * Interaction modes:
 *   - inline  : clicking the row expands detail inline (edit/write/bash/todo/task)
 *   - inspect : clicking the row opens the right-side Inspector (grep/glob/read/web_*)
 *
 * Import this module once at app startup (or from any entry that needs tool
 * display) to activate all built-in tool display rules.
 */
import { registerMany, getTool } from '../registry'
import { makeBashMeta } from './bash'
import { makeEditMeta } from './edit'
import { makeWriteMeta } from './write'
import { makeTaskMeta } from './task'
import { makeTodoMeta } from './todo'
import { makeGrepMeta } from './grep'
import { makeGlobMeta } from './glob'
import { makeReadMeta } from './read'
import { makeWebFetchMeta } from './webfetch'
import { makeWebSearchMeta } from './websearch'
import { makeSkillMeta } from './simple'
import BashView from '../../components/tool/views/BashView.vue'
import EditView from '../../components/tool/views/EditView.vue'
import WriteView from '../../components/tool/views/WriteView.vue'
import TaskView from '../../components/tool/views/TaskView.vue'
import TodoView from '../../components/tool/views/TodoView.vue'
import GrepView from '../../components/tool/views/GrepView.vue'
import GlobView from '../../components/tool/views/GlobView.vue'
import ReadView from '../../components/tool/views/ReadView.vue'
import WebFetchView from '../../components/tool/views/WebFetchView.vue'
import WebSearchView from '../../components/tool/views/WebSearchView.vue'
import GenericView from '../../components/tool/views/GenericView.vue'

/** All built-in tool metas, with components wired. */
export const builtinToolMetas = [
  // Mode A — inline expand
  makeBashMeta(BashView),
  makeEditMeta(EditView),
  makeWriteMeta(WriteView),
  makeTaskMeta(TaskView),
  makeTodoMeta(TodoView),
  // Mode B — right-side Inspector
  makeGrepMeta(GrepView),
  makeGlobMeta(GlobView),
  makeReadMeta(ReadView),
  makeWebFetchMeta(WebFetchView),
  makeWebSearchMeta(WebSearchView),
  // Simple — generic fallback
  makeSkillMeta(GenericView),
]

/** Register all built-in tool rules. Idempotent — safe to call multiple times,
 *  and re-activates after clearTools() since it checks the registry directly. */
export function activateBuiltinTools(): void {
  if (getTool('bash')) return
  registerMany(builtinToolMetas)
}

// Auto-activate on import so any module touching tool display gets the rules.
activateBuiltinTools()
