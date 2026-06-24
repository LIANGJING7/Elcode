export interface LocationRef {
  directory: string
  workspaceID?: string
}

export interface PromptInput {
  type: 'text' | 'tool_result'
  text?: string
  toolResult?: unknown
}

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
  lastAccessed: Date
}

export interface WorkspacePersistence {
  workspaces: Workspace[]
  currentWorkspacePath: string | null
}

export const IPC_CHANNELS = {
  SESSION_CREATE: 'session:create',
  SESSION_GET: 'session:get',
  SESSION_LIST: 'session:list',
  SESSION_MESSAGES: 'session:messages',
  SESSION_PROMPT: 'session:prompt',
  SESSION_INTERRUPT: 'session:interrupt',
  SESSION_RESUME: 'session:resume',
  SESSION_STREAM_EVENT: 'session:stream:event',
  SESSION_DELETE: 'session:delete',
  
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_LIST: 'file:list',
  
  TOOL_EXECUTE: 'tool:execute',
  TOOL_LIST: 'tool:list',
  
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_MODELS: 'config:models',
  
  WORKSPACE_GET_CWD: 'workspace:getCwd',
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_ADD: 'workspace:add',
  WORKSPACE_REMOVE: 'workspace:remove',
  WORKSPACE_SELECT: 'workspace:select',
  WORKSPACE_OPEN_FOLDER: 'workspace:openFolder'
} as const

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]