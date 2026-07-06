/**
 * Bash / shell tool display rule.
 *
 * ViewModel: command + stdout + exitCode + duration, derived from
 *   - tool.args.command        (the command string)
 *   - tool.output.content      (ToolOutput.Content[] — the streamed stdout)
 *   - tool.output.structured   (typed { type:'bash', exitCode, duration, truncated })
 *   - tool.output.result       (fallback raw output object)
 */
import type { ToolCall } from '../../../types/ipc'
import type { ToolMeta, ToolViewModel } from '../registry'
import { commandSummary } from '../summary'

export interface BashViewModel extends ToolViewModel {
  _kind: 'bash'
  command: string
  stdout: string
  stderr: string | null
  exitCode: number | null
  duration: number | null
  truncated: boolean
  timedOut: boolean
}

/** Join text-type content entries into a single stdout string. */
function joinTextContent(content: unknown): string {
  if (!content || !Array.isArray(content)) return ''
  return content
    .filter((c): c is { type: 'text'; text: string } =>
      typeof c === 'object' && c !== null && (c as { type?: string }).type === 'text' &&
      typeof (c as { text?: unknown }).text === 'string')
    .map((c) => c.text)
    .join('\n')
}

export function createBashViewModel(tool: ToolCall): BashViewModel {
  const structured = tool.output?.structured
  const bashStructured =
    structured && structured.type === 'bash' ? structured : undefined

  const fromContent = joinTextContent(tool.output?.content)
  const resultObj = tool.output?.result as { output?: string; stdout?: string; stderr?: string; exitCode?: number } | undefined
  const stdout = fromContent || resultObj?.output || resultObj?.stdout || ''
  const stderr = resultObj?.stderr ?? (tool.error || null)

  return {
    _kind: 'bash',
    command: String(tool.args.command ?? tool.args.cmd ?? ''),
    stdout,
    stderr,
    exitCode: bashStructured?.exitCode ?? resultObj?.exitCode ?? (tool.error ? 1 : null),
    duration: bashStructured?.duration ?? tool.duration ?? null,
    truncated: bashStructured?.truncated ?? false,
    timedOut: bashStructured?.timedOut ?? false,
  }
}

/** Bash tool meta — component is wired in rules/index.ts to avoid a cycle. */
export function makeBashMeta(component: ToolMeta['component']): ToolMeta<BashViewModel> {
  return {
    names: ['bash', 'shell'],
    icon: '$',
    title: 'Shell',
    component,
    defaultInteraction: 'inline',
    summary: commandSummary,
    createViewModel: createBashViewModel,
    category: 'execution',
  }
}
