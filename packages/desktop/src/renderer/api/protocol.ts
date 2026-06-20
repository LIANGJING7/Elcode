export interface WSRequest {
  type: 'request'
  id: string
  route: string
  payload: unknown
}

export interface WSResponse {
  type: 'response'
  id: string
  success: boolean
  data?: unknown
  error?: string
}

export interface WSStreamEvent {
  type: 'stream'
  sessionId: string
  event: 'message' | 'partial' | 'complete' | 'error'
  data: {
    content?: string
    messageId?: string
    role?: 'user' | 'assistant'
  }
}

export type WSMessage = WSResponse | WSStreamEvent

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isPartial?: boolean
}

export interface Session {
  id: string
  title?: string
  createdAt: number
}

export interface FileInfo {
  path: string
  type: 'file' | 'directory'
  name: string
}