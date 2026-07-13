// packages/desktop/src/renderer/types/subagent.ts

import type { Component } from 'vue'
import type {
  FooterSubagentTab,
  StreamCommit,
  TabsPatch,
  DetailPatch,
  TabsUpdatedEvent,
  DetailUpdatedEvent,
  ConnectionState,
} from '../../types/subagent'
import type { Message, ToolCall } from '../../types/ipc'

export type {
  FooterSubagentTab,
  StreamCommit,
  TabsPatch,
  DetailPatch,
  TabsUpdatedEvent,
  DetailUpdatedEvent,
  ConnectionState,
}

export interface FooterSubagentDetail {
  sessionID: string
  commits: StreamCommit[]
  messages?: Message[]
  toolCalls?: ToolCall[]
  parentSessionId?: string
}

export interface SubagentSnapshot {
  tabs: FooterSubagentTab[]
  version: number
}

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

export type TimelineItem =
  | { type: 'part'; part: DisplayPart }
  | { type: 'divider'; label?: string }
  | { type: 'summary'; text: string }
  | { type: 'marker'; label: string }

export interface DisplayPart {
  type: 'text' | 'tool' | 'error' | 'reasoning'
  payload: unknown
}

export interface SubagentTab {
  id: string
  type: 'subagent'
  title: string
  subtitle?: string
  status: 'running' | 'completed' | 'cancelled' | 'error'
  component: Component
}