/**
 * Simple tools with no structured ViewModel — they only declare icon + summary.
 *
 * Tools like `skill` have minimal display needs: a compact row with icon +
 * summary. The expanded view falls back to the generic JSON detail
 * (ToolCallExpanded handles the no-meta case). It still registers a ToolMeta
 * so ToolCallRow can use the right icon/summary, but `component` points at a
 * generic fallback and createViewModel returns a minimal VM.
 */
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../registry'
import { firstArgString, truncate } from '../summary'

export interface SimpleViewModel extends ToolViewModel {
  _kind: 'simple'
  summary: string
}

/** Build a SimpleViewModel carrying just the summary text. */
function makeSimpleVm(summaryFn: (tool: ToolCall) => string) {
  return (tool: ToolCall): SimpleViewModel => ({
    _kind: 'simple',
    summary: summaryFn(tool),
  })
}

/** A generic fallback component placeholder; real wiring happens in index.ts. */
export function makeSimpleMeta(
  input: {
    names: string[]
    icon: string
    title: string
    summary: (tool: ToolCall) => string
    component: ToolMeta['component']
    defaultInteraction?: 'inline' | 'inspect'
  },
): ToolMeta<SimpleViewModel> {
  return {
    names: input.names,
    icon: input.icon,
    title: input.title,
    component: input.component,
    defaultInteraction: input.defaultInteraction ?? 'inline',
    summary: input.summary,
    createViewModel: makeSimpleVm(input.summary),
  }
}

export function makeSkillMeta(component: ToolMeta['component']): ToolMeta<SimpleViewModel> {
  return makeSimpleMeta({
    names: ['skill'],
    icon: '→',
    title: 'Skill',
    summary: (tool) => truncate(firstArgString(tool.args, ['skill', 'name'])),
    component,
  })
}
