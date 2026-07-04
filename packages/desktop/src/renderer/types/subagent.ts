// packages/desktop/src/renderer/types/subagent.ts

import type { Component } from 'vue'
import type {
  FooterSubagentTab,
  FooterSubagentDetail,
  StreamCommit,
  TabsPatch,
  DetailPatch,
  TabsUpdatedEvent,
  DetailUpdatedEvent,
  ConnectionState,
} from '../../types/subagent'

// Re-export shared types for convenience
export type {
  FooterSubagentTab,
  FooterSubagentDetail,
  StreamCommit,
  TabsPatch,
  DetailPatch,
  TabsUpdatedEvent,
  DetailUpdatedEvent,
  ConnectionState,
}

// Snapshot returned by watch()
export interface SubagentSnapshot {
  tabs: FooterSubagentTab[]
  version: number
}

// ViewModel types
export interface SubagentHeaderVM {
  title: string
  icon: string
  duration?: string
  status: 'running' | 'completed' | 'cancelled' | 'error'
  toolCount?: number
  commitCount?: number
}

export interface SubagentViewerVM {
  header: SubagentHeaderVM
  timeline: TimelineItem[]
  autoScroll: boolean
}

// Timeline item types
export type TimelineItem =
  | { type: 'part'; part: DisplayPart }
  | { type: 'divider'; label?: string }
  | { type: 'summary'; text: string }
  | { type: 'marker'; label: string }

// DisplayPart (unified rendering)
export interface DisplayPart {
  type: 'text' | 'tool' | 'error' | 'reasoning'
  payload: unknown
}

// PanelTab type extension
export interface SubagentTab {
  id: string
  type: 'subagent'
  title: string
  subtitle?: string
  status: 'running' | 'completed' | 'cancelled' | 'error'
  component: Component
}