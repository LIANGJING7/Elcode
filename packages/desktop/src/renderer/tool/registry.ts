/**
 * Tool display registry — Presenter/Adapter architecture.
 *
 * ToolCall is the single business model (shared by IPC / Streaming / History).
 * ToolMeta only declares capabilities (icon, title, component, ViewModel creator)
 * — it does not carry complex business logic. ViewModel is local to each tool
 * (BashVM, DiffVM, ...), not a unified Snapshot union, so we avoid a second
 * business model.
 *
 * Registry is plugin-based: built-in tools call registerTool() at import time,
 * MCP tools can call registerTool() dynamically with the same API.
 */
import type { Component } from 'vue'
import type { ToolCall } from '../../types/ipc'

/** Marker interface for local ViewModels (each tool defines its own concrete type). */
export interface ToolViewModel {
  readonly _kind: string
}

/** How a tool call's detail is primarily surfaced.
 *  - 'inline'  : clicking the row expands the detail inline (edit/write/bash/todo/task)
 *  - 'inspect' : clicking the row opens the right-side Inspector panel (grep/glob/read/web_*) */
export type ToolInteraction = 'inline' | 'inspect'

/** ToolMeta — declares how a tool is displayed. The Presenter hook
 *  `createViewModel` converts a ToolCall into a local ViewModel for the
 *  paired Vue component. */
export interface ToolMeta<V extends ToolViewModel = ToolViewModel> {
  /** Tool names this meta matches (e.g. ['bash', 'shell']). */
  names: string[]
  /** Compact-row icon glyph. */
  icon: string
  /** Detail-panel title. */
  title: string
  /** Vue component that renders the expanded view (receives `vm` + `tool`). */
  component: Component
  /** Compact-row summary text (bold in UI). */
  summary: (tool: ToolCall) => string
  /** Presenter: ToolCall → local ViewModel. */
  createViewModel: (tool: ToolCall) => V
  /** Default interaction when the compact row is clicked. */
  defaultInteraction: ToolInteraction
}

// ============================================
// Plugin-based registry
// ============================================

const registry = new Map<string, ToolMeta>()

/** Register a tool meta for all its names. */
export function registerTool(meta: ToolMeta): void {
  for (const name of meta.names) registry.set(name, meta)
}

/** Register many tool metas at once. */
export function registerMany(metas: ToolMeta[]): void {
  for (const meta of metas) registerTool(meta)
}

/** Look up the ToolMeta for a tool name. */
export function getTool(name: string): ToolMeta | undefined {
  return registry.get(name)
}

/** Remove a tool meta (used by MCP disconnect / hot-reload). */
export function removeTool(name: string): void {
  registry.delete(name)
}

/** Remove all registered metas (for tests). */
export function clearTools(): void {
  registry.clear()
}
