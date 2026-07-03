/**
 * Timeline Types.
 *
 * TimelineItem is the final UI data model.
 * TimelineRenderer is a dumb component that only renders these items.
 * All business logic (parsing, classification, aggregation) happens
 * in the TimelineBuilder (services/timeline-builder.ts).
 */

import type { ToolCall } from '../../types/ipc'

/** Tool summary - pre-generated in Builder, not in Renderer */
export interface ToolSummary {
  /** Icon glyph (e.g., '$', '→', '✱') */
  icon: string
  /** Primary text (e.g., command, file path, search pattern) */
  title: string
  /** Secondary text (e.g., "12 matches", "+3 -1", "exit 0") */
  subtitle?: string
  /** Tool category */
  category: 'execution' | 'query' | 'default'
}

/** A tool call with its pre-generated summary */
export interface ToolWithSummary extends ToolCall {
  summary: ToolSummary
}

/**
 * Timeline item - discriminated union by `type`.
 * Each variant maps to a specific renderer component.
 */
export type TimelineItem =
  | ReasoningItem
  | TextItem
  | CodeItem
  | ExecutionToolItem
  | QueryGroupItem
  | SystemItem

/** Reasoning/thinking block */
export interface ReasoningItem {
  id: string
  type: 'reasoning'
  content: string
  status: 'idle' | 'thinking' | 'done'
  duration: string | null
}

/** Plain text content (assistant response) */
export interface TextItem {
  id: string
  type: 'text'
  content: string
}

/** Code block extracted from text */
export interface CodeItem {
  id: string
  type: 'code'
  lang: string
  code: string
}

/** Execution tool (bash/edit/write/todo/task) - inline expandable */
export interface ExecutionToolItem {
  id: string
  type: 'executionTool'
  tool: ToolCall
  summary: ToolSummary
}

/** Query tool group (read/grep/glob/web) - foldable */
export interface QueryGroupItem {
  id: string
  type: 'queryGroup'
  tools: ToolWithSummary[]
}

/** System message (errors, warnings) */
export interface SystemItem {
  id: string
  type: 'system'
  content: string
  variant: 'error' | 'warning' | 'info'
}