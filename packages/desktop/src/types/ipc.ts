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
  id: string
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
  // 桌面端附加 metadata (phase 2): core 不存这些, 桌面端在 sessions.json 持久化
  primaryWorkspaceId?: string          // 该会话直属的"当前目录"锚点(单挂载时 === workspaceIds[0])
  workspaceIds?: string[]               // 该会话可见的目录集(单挂载即 [primaryWorkspaceId])
  pinned?: boolean                      // 用户置顶
  options?: Record<string, unknown>     // SessionOptions 容器, phase 4 填充
}

export interface SessionUpdate {
  title?: string
  pinned?: boolean
  options?: Record<string, unknown>
  primaryWorkspaceId?: string
  workspaceIds?: string[]
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

// Phase 5: Skills & MCP types
export interface SkillInfo {
  name: string
  description?: string
  slash?: boolean
  location: string
  content: string
}

export interface MCPStatus {
  status: 'connected' | 'disabled' | 'failed' | 'needs_auth' | 'needs_client_registration'
  error?: string
}

export interface MCPAddPayload {
  name: string
  type: 'local' | 'remote'
  command?: string[]
  url?: string
  enabled?: boolean
  environment?: Record<string, string>
  timeout?: number
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
  SESSION_UPDATE: 'session:update',
  
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
  WORKSPACE_OPEN_FOLDER: 'workspace:openFolder',
  
  // Phase 5: Skills & MCP
  SKILL_LIST: 'skill:list',
  MCP_STATUS: 'mcp:status',
  MCP_ADD: 'mcp:add',
  MCP_CONNECT: 'mcp:connect',
  MCP_DISCONNECT: 'mcp:disconnect'
} as const

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]