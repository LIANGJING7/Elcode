// packages/desktop/src/renderer/types/subagent.ts

import type { Component } from 'vue'

// Re-export from core (TUI types)
export interface FooterSubagentTab {
  sessionID: string
  partID: string
  callID: string
  label: string
  description: string
  status: 'running' | 'completed' | 'cancelled' | 'error'
  background?: boolean
  title?: string
  toolCalls?: number
  lastUpdatedAt: number
}

export interface FooterSubagentDetail {
  sessionID: string
  commits: StreamCommit[]
}

export interface StreamCommit {
  kind: 'text' | 'tool' | 'error' | 'reasoning'
  text: string
  phase: 'start' | 'progress' | 'final'
  source: 'assistant' | 'reasoning' | 'tool' | 'system'
  tool?: string
  toolState?: 'running' | 'completed' | 'error'
  messageID?: string
  partID?: string
}

// Patch types for incremental updates
export interface TabsPatch {
  added: FooterSubagentTab[]
  updated: FooterSubagentTab[]
  removed: string[]
}

export interface DetailPatch {
  type: 'append' | 'replace'
  commits?: StreamCommit[]
  data?: Partial<FooterSubagentDetail>
}

// IPC event payloads
export interface TabsUpdatedEvent {
  sessionId: string
  patch: TabsPatch
  version: number
}

export interface DetailUpdatedEvent {
  sessionId: string
  targetSessionId: string
  patches: DetailPatch[]
  version: number
}

// Connection state
export type ConnectionState = 'idle' | 'connecting' | 'watching' | 'error'

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