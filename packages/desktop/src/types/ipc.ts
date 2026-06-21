export interface Session {
  id: string
  workspacePath: string
  createdAt: Date
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
  reasoning?: string
}

export interface ToolCall {
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'error'
  result?: unknown
  error?: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface Workspace {
  id: string
  name: string
  path: string
}

export const IPC_CHANNELS = {
  SESSION_CREATE: 'session:create',
  SESSION_SEND_MESSAGE: 'session:sendMessage',
  SESSION_STREAM_DATA: 'session:stream:data',
  SESSION_STREAM_END: 'session:stream:end',
  SESSION_LIST: 'session:list',
  SESSION_DELETE: 'session:delete',
  
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_LIST: 'file:list',
  
  TOOL_EXECUTE: 'tool:execute',
  TOOL_LIST: 'tool:list',
  
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set'
} as const

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]