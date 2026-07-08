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

/** Tool category - determines how tools are grouped in timeline.
 *  - 'execution' : bash/edit/write/todo/task - inline expandable, show in flow
 *  - 'query'     : read/grep/glob/web_fetch/web_search - foldable group
 *  - 'default'   : unknown tools - fallback behavior */
export type ToolCategory = 'execution' | 'query' | 'default'

/** How a tool call's detail is primarily surfaced.
 *  - 'inline' : clicking the row expands the detail inline (edit/write/bash/todo/task)
 *  - 'panel'  : clicking the row opens the right-side ArtifactPanel (grep/glob/read/web_*)
 *  - 'none'   : no click response (for pure display tools) */
export type ToolInteraction = 'inline' | 'panel' | 'none'

/** How a tool is displayed in the timeline.
 *  - 'inline' : compact row + expandable detail (edit/write/bash/todo/task)
 *  - 'panel'  : compact row + right-side panel (grep/glob/read/web_*)
 *  - 'none'   : hidden from timeline (internal tools only) */
export type ToolDisplay = 'inline' | 'panel' | 'none'

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
  /** How the tool appears in timeline. */
  display?: ToolDisplay
  /** Tool category - determines grouping in timeline. */
  category: ToolCategory
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

/** Get the category for a tool name. Falls back to 'default' if not found. */
export function getToolCategory(name: string): ToolCategory {
  return registry.get(name)?.category ?? 'default'
}
