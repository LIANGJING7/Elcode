/**
 * ToolMeta Registry — lookup metadata for any tool.
 *
 * Renderer calls getToolMeta(toolName) to get display metadata.
 * No display mapping here — that's in ToolDisplay.vue.
 */
import type { ToolMeta } from './meta'

/** Registry map — tool name → ToolMeta */
const registry = new Map<string, ToolMeta>()

/** Register a tool's metadata */
export function registerTool(name: string, meta: ToolMeta): void {
  registry.set(name, meta)
}

/** Get metadata for a tool name */
export function getToolMeta(name: string): ToolMeta {
  const meta = registry.get(name)
  if (meta) return meta
  
  // Fallback: generic tool
  return {
    display: 'generic',
    icon: '⚙',
    pending: 'Executing...',
    summary: (tool) => `${tool.name}`,
    title: (tool) => `# ${tool.name}`,
    detail: (tool) => {
      const args = Object.entries(tool.args)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
      const output = tool.output?.result
        ? JSON.stringify(tool.output.result, null, 2)
        : ''
      return args ? `[${args}]\n${output}` : output
    }
  }
}

/** Check if a tool is registered */
export function hasToolMeta(name: string): boolean {
  return registry.has(name)
}

/** Get all registered tool names */
export function getRegisteredTools(): string[] {
  return Array.from(registry.keys())
}

/** Clear registry (for tests) */
export function clearRegistry(): void {
  registry.clear()
}