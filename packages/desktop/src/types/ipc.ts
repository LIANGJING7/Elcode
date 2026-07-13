export interface LocationRef {
  directory: string
  workspaceID?: string
}


export interface TextPromptInput {
  type: 'text'
  text: string
}

export interface FilePromptInput {
  type: 'file'
  mime: string
  filename?: string
  url: string
  source?: {
    type: 'file' | 'resource'
    path?: string
    text?: { start: number; end: number; value: string }
    clientName?: string
    uri?: string
  }
}

export interface ToolResultPromptInput {
  type: 'tool_result'
  toolResult?: unknown
  // file part
  url?: string
  filename?: string
  mime?: string
  source?: {
    type: 'file' | 'resource'
    path?: string
    text?: { start: number; end: number; value: string }
    clientName?: string
    uri?: string
  }
  // agent part
  name?: string
}

export interface AgentPromptInput {
  type: 'agent'
  name: string
  source?: {
    value: string
    start: number
    end: number
  }
}

export type PromptInput = TextPromptInput | FilePromptInput | ToolResultPromptInput | AgentPromptInput

// Model reference matching backend's ModelRef
export interface ModelRef {
  providerID: string
  modelID: string
}

// Prompt options for session.prompt (matching backend PromptInput)
export interface PromptOptions {
  model?: ModelRef
  agent?: string
  variant?: string
}

export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}

export interface Session {
  id: string
  workspacePath: string
  createdAt: Date
}

export interface FilePart {
  type: 'file'
  mime: string
  name?: string
  url: string
}

export interface AgentPart {
  type: 'agent'
  name: string
  source?: {
    value: string
    start: number
    end: number
  }
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
  reasoning?: string
  /** File attachments (images, PDFs, etc.) */
  files?: FilePart[]
  /** Agent mentions in the message */
  agents?: AgentPart[]
  /** Response duration in milliseconds (for assistant messages) */
  duration?: number
  /** Reasoning duration in milliseconds */
  reasoningDuration?: number
}

// ============================================
// Tool call unified model (IPC / Streaming / History shared)
// ============================================

/** 类型化的 structured 元数据（按工具区分，TS 自动推导）。后端发送的是
 *  `Record<string, unknown>`，桌面端在 createViewModel 内部按 tool.name
 * 推导出对应的判别分支，不污染数据层。 */
export type ToolStructured =
  | { type: 'bash'; exitCode?: number; duration?: number; truncated?: boolean; timedOut?: boolean }
  | { type: 'edit'; diff?: string; additions?: number; deletions?: number }
  | { type: 'write'; existed?: boolean }
  | { type: 'task'; subagentType?: string; state?: string; summary?: string; sessionId?: string; sessionID?: string; toolCalls?: number }
  | { type: 'todo'; todos?: Array<{ status: string; content: string }> }
  | { type: 'unknown'; [key: string]: unknown }

/** 收口的工具输出。result/structured/content 归入 output，后续扩展
 *  stderr/附件/文件列表等字段时不污染顶层 ToolCall 结构。 */
export interface ToolOutput {
  result?: unknown
  structured?: ToolStructured
  content?: Array<{ type: 'text'; text: string } | { type: 'file'; mime: string; name?: string }>
}

/** 统一业务模型：IPC、Streaming、History 共用，不再三份漂移。
 *  - StreamingToolCall extends ToolCall 增量缓冲字段
 *  - History Message.toolCalls: ToolCall[] */
export interface ToolCall {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  args: Record<string, unknown>
  output?: ToolOutput
  error?: string
  /** 执行时长 (ms)，流式和历史都填充 */
  duration?: number
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  directory: string                     // 会话所属目录 (用于匹配 workspace)
  parentID?: string                     // 父会话ID (子智能体会话有此字段)
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
  status: 'connected' | 'disabled' | 'failed' | 'needs_auth' | 'needs_client_registration' | 'disconnected'
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

// Extended MCP types for settings page
export interface McpRuntimeState {
  connection: ConnectionState
  latency?: number
  protocolVersion?: string
  sessionId?: string
  reconnectCount?: number
  lastConnected?: string
  lastError?: string
}

export interface AuthenticationState {
  state: 'disabled' | 'required' | 'opening' | 'waiting' | 'authenticated' | 'failed'
  account?: string
  expiresAt?: string
  authorizationUrl?: string
  error?: string
}

export interface McpServerStatus {
  status: 'connected' | 'disabled' | 'failed' | 'auth_required' | 'auth_failed' | 'testing'
  error?: string
  // Extended fields - may be empty if backend doesn't support yet
  runtime?: McpRuntimeState
  authentication?: AuthenticationState
  capabilities?: Record<string, boolean>
  tools?: ToolInfo[]
  resources?: ResourceInfo[]
  prompts?: PromptInfo[]
}

export interface ToolInfo {
  name: string
  description?: string
}

export interface ResourceInfo {
  uri: string
  name?: string
  description?: string
}

export interface PromptInfo {
  name: string
  description?: string
}

export interface McpConfig {
  name: string
  type: 'local' | 'remote'
  enabled?: boolean
  
  // Command type
  command?: string
  args?: string[]
  cwd?: string
  environment?: Record<string, string>
  
  // HTTP/SSE type
  url?: string
  headers?: Record<string, string>
  oauth?: {
    clientId?: string
    clientSecret?: string
    scope?: string
  } | false
  
  timeout?: number
}

export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error'

export interface AuthMethodPrompt {
  type: 'text' | 'select'
  key: string
  message: string
  placeholder?: string
  options?: { label: string; value: string; hint?: string }[]
}

export interface AuthMethod {
  type: 'oauth' | 'api'
  label: string
  prompts?: AuthMethodPrompt[]
}

export interface AuthorizationResult {
  url?: string
  method: 'auto' | 'code'
  instructions?: string
}

export interface ConsoleState {
  consoleManagedProviders: string[]
  activeOrgName?: string
  switchableOrgCount: number
}

// Re-export config types
export type { LCodeGlobalConfig, McpServerConfig, ConfigPatch, ResultP, CustomProviderConfig } from './config'

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
  SESSION_UPDATE: 'session:update',    // 更新 title (后端支持)
  SESSION_TODO: 'session:todo',
  SESSION_AGENTS: 'session:agents',

  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_LIST: 'file:list',
  FILE_PICK: 'file:pick',
  FILE_PICK_IMAGE: 'file:pick-image',
  FILE_SEARCH: 'file:search',

  TOOL_EXECUTE: 'tool:execute',
  TOOL_LIST: 'tool:list',
  
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_MODELS: 'config:models',

  // LCode config - domain-based naming
  LCODE_CONFIG_READ: 'lcode:config:read',
  LCODE_CONFIG_PATCH: 'lcode:config:patch',
  
  // MCP server - semantic operations
  LCODE_MCP_SERVER_ADD: 'lcode:mcp-server:add',
  LCODE_MCP_SERVER_UPDATE: 'lcode:mcp-server:update',
  LCODE_MCP_SERVER_DELETE: 'lcode:mcp-server:delete',

  // Model - semantic operations (provider-level models)
  LCODE_MODEL_ADD: 'lcode:model:add',
  LCODE_MODEL_DELETE: 'lcode:model:delete',

  // Custom Provider - semantic operations
  LCODE_CUSTOM_PROVIDER_ADD: 'lcode:custom-provider:add',
  LCODE_CUSTOM_PROVIDER_DELETE: 'lcode:custom-provider:delete',

  PROVIDER_AUTH_METHODS: 'provider:auth-methods',
  PROVIDER_AUTHORIZE: 'provider:authorize',
  PROVIDER_AUTH_CALLBACK: 'provider:auth-callback',
  PROVIDER_ADD: 'provider:add',
  PROVIDER_UPDATE: 'provider:update',
  PROVIDER_DELETE: 'provider:delete',
  PROVIDER_TEST: 'provider:test',
  PROVIDER_REFRESH_MODELS: 'provider:refresh-models',
  PROVIDER_DELETE_MODEL: 'provider:delete-model',
  PROVIDER_REFRESH_ALL: 'provider:refresh-all',

  CONSOLE_GET: 'console:get',
  
  WORKSPACE_GET_CWD: 'workspace:getCwd',
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_ADD: 'workspace:add',
  WORKSPACE_REMOVE: 'workspace:remove',
  WORKSPACE_SELECT: 'workspace:select',
  WORKSPACE_OPEN_FOLDER: 'workspace:openFolder',
  
  // Phase 5: Skills & MCP
  SKILL_LIST: 'skill:list',
  SKILL_WRITE: 'skill:write',
  MCP_STATUS: 'mcp:status',
  MCP_CONFIG: 'mcp:config',
  MCP_ADD: 'mcp:add',
  MCP_REMOVE: 'mcp:remove',
  MCP_CONNECT: 'mcp:connect',
  MCP_DISCONNECT: 'mcp:disconnect',
  MCP_TOOLS: 'mcp:tools',
  MCP_PROMPTS: 'mcp:prompts',
  MCP_RESOURCES: 'mcp:resources',
  MCP_SERVER_TOOLS: 'mcp:serverTools',

  // Window
  WINDOW_SET_TITLE_BAR_OVERLAY: 'window:set-title-bar-overlay',
  WINDOW_READY: 'window:ready',

  // Global state (lcode.json - cross-project UI preferences)
  GLOBAL_STATE_GET: 'global-state:get',
  GLOBAL_STATE_SET: 'global-state:set',

  // Subagent panel
  SUBAGENT_WATCH: 'subagent:watch',
  SUBAGENT_UNWATCH: 'subagent:unwatch',
} as const

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]

export interface Agent {
  name: string
  description?: string
  mode: 'subagent' | 'primary' | 'all'
  builtIn: boolean
}

export interface FileMatch {
  path: string
  relativePath: string
  isDirectory: boolean
  url: string
  mimeType: string
}