// packages/desktop/src/types/subagent.ts
// Shared types for IPC (preload <-> main <-> renderer)

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

export type ConnectionState = 'idle' | 'connecting' | 'watching' | 'error'

export interface SubagentSnapshot {
  tabs: FooterSubagentTab[]
  version: number
}