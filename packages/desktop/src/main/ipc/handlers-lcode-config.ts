import { ipcMain } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { xdgConfig, xdgCache } from 'xdg-basedir'
import { parse, modify, applyEdits, JSONPath } from 'jsonc-parser'
import { Mutex } from 'async-mutex'
import { IPC_CHANNELS } from '../../types/ipc'
import type { McpServerConfig } from '../../types/config'
import { 
  CustomProviderConfig, 
  PROVIDER_TYPE_TO_NPM, 
  generateDisplayNameFromId,
  validateProviderId,
  validateBaseUrl
} from '../../types/custom-provider'
import { backend } from '../backend-client'

const CONFIG_DIR = path.join(xdgConfig ?? '', 'lcode')
const MODELS_CACHE_FILE = path.join(xdgCache ?? '', 'lcode', 'models.json')
const CONFIG_FILE = path.join(CONFIG_DIR, 'lcode.jsonc')

console.log('[LCodeConfig] Config file path:', CONFIG_FILE)

const configMutex = new Mutex()

const ALLOWED_TOP_LEVEL_KEYS = new Set(['mcp', 'tools', 'agent', 'provider', '$schema'])

const DEFAULT_CONFIG = `{
  "$schema": "https://raw.githubusercontent.com/anomalyco/opencode/main/packages/desktop/src/main/schemas/lcode.schema.json",
  "mcp": {},
  "tools": {},
  "agent": {}
}`

interface ConfigPatch {
  path: JSONPath
  op: 'set' | 'delete'
  value?: unknown
}

interface ResultP<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

async function invalidateModelsCache(directory?: string): Promise<void> {
  try {
    await fs.unlink(MODELS_CACHE_FILE)
    console.log('[LCodeConfig] Models disk cache invalidated')
  } catch {
    // File doesn't exist or already deleted - ignore
  }
  // Also invalidate memory cache via HTTP API
  try {
    await backend.provider.refreshAll(directory)
    console.log('[LCodeConfig] Models memory cache refreshed for directory:', directory)
  } catch (e) {
    console.error('[LCodeConfig] Failed to refresh memory cache:', e)
  }
}

function validateWhitelist(config: unknown): void {
  if (typeof config !== 'object' || config === null) return
  const keys = Object.keys(config as Record<string, unknown>)
  for (const key of keys) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      throw new Error(`Config key not allowed: ${key}. Only mcp, tools, agent, $schema are permitted.`)
    }
  }
}

function validateMcpServerName(name: string): void {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error('MCP server name is required')
  }
  if (name.includes('/') || name.includes('\\') || name.includes(':')) {
    throw new Error('MCP server name cannot contain path separators')
  }
}

function validateMcpServerConfig(config: McpServerConfig): void {
  if (config.type === 'local') {
    if (!config.command || !Array.isArray(config.command) || config.command.length === 0) {
      throw new Error('Local MCP server requires command array')
    }
    if (typeof config.command[0] !== 'string' || config.command[0].trim() === '') {
      throw new Error('Local MCP server command[0] (executable) is required')
    }
  }

  if (config.type === 'remote') {
    if (!config.url || typeof config.url !== 'string') {
      throw new Error('Remote MCP server requires url')
    }
    try {
      new URL(config.url)
    } catch {
      throw new Error('Remote MCP server url must be a valid URL')
    }
    const protocol = new URL(config.url).protocol
    if (protocol !== 'http:' && protocol !== 'https:') {
      throw new Error('Remote MCP server url must use http or https protocol')
    }
  }
}

async function ensureConfigDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    throw new Error(`Failed to create config directory: ${error}`)
  }
}

async function readFileOrDefault(): Promise<string> {
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf-8')
    console.log('[LCodeConfig] Read existing config, size:', content.length)
    return content
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    if (error.includes('ENOENT')) {
      console.log('[LCodeConfig] Config file not found, using default')
      await ensureConfigDir()
      return DEFAULT_CONFIG
    }
    console.error('[LCodeConfig] Read error:', error)
    throw new Error(`Failed to read config file: ${error}`)
  }
}

async function writeFile(content: string): Promise<void> {
  await ensureConfigDir()
  await fs.writeFile(CONFIG_FILE, content, 'utf-8')
  console.log('[LCodeConfig] Wrote config file, size:', content.length)
}

export function registerLcodeConfigHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.LCODE_CONFIG_READ, async (): Promise<ResultP<unknown>> => {
    console.log('[LCodeConfig] READ called')
    try {
      const content = await readFileOrDefault()
      const config = parse(content, [], { allowTrailingComma: true, disallowComments: false })
      // Don't validate whitelist on read - allow legacy fields
      console.log('[LCodeConfig] READ success, keys:', Object.keys(config as Record<string, unknown>))
      return { success: true, data: config }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      console.error('[LCodeConfig] READ error:', error)
      return { success: false, error }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.LCODE_CONFIG_PATCH,
    async (_event, patches: ConfigPatch[]): Promise<ResultP<unknown>> => {
      console.log('[LCodeConfig] PATCH called, patches:', JSON.stringify(patches))
      return configMutex.runExclusive(async () => {
        try {
          let content = await readFileOrDefault()
          const formattingOptions = { insertSpaces: true, tabSize: 2, eol: '\n' }

          // Validate patch paths before applying
          for (const patch of patches) {
            if (patch.path.length > 0 && !ALLOWED_TOP_LEVEL_KEYS.has(patch.path[0] as string)) {
              throw new Error(`Config path not allowed: ${patch.path[0]}. Only mcp, tools, agent, $schema are permitted.`)
            }
          }

          for (const patch of patches) {
            const value = patch.op === 'delete' ? undefined : patch.value
            const edits = modify(content, patch.path, value, { formattingOptions })
            content = applyEdits(content, edits)
          }

          const parsed = parse(content, [], {
            allowTrailingComma: true,
            disallowComments: false,
          })
          // Don't validate whitelist - allow existing legacy fields

          await writeFile(content)
          console.log('[LCodeConfig] PATCH success')
          return { success: true, data: parsed }
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e)
          console.error('[LCodeConfig] PATCH error:', error)
          return { success: false, error }
        }
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LCODE_MCP_SERVER_ADD,
    async (_event, name: string, config: McpServerConfig): Promise<ResultP<unknown>> => {
      console.log('[LCodeConfig] ADD server:', name, 'type:', config.type)
      validateMcpServerName(name)
      return configMutex.runExclusive(async () => {
        try {
          validateMcpServerConfig(config)

          let content = await readFileOrDefault()
          const formattingOptions = { insertSpaces: true, tabSize: 2, eol: '\n' }

          const mcpEntry: Record<string, unknown> = {
            type: config.type,
            ...(config.enabled !== undefined ? { enabled: config.enabled } : {}),
            ...(config.cwd ? { cwd: config.cwd } : {}),
            ...(config.environment ? { environment: config.environment } : {}),
            ...(config.headers ? { headers: config.headers } : {}),
            ...(config.oauth ? { oauth: config.oauth } : {}),
            ...(config.timeout ? { timeout: config.timeout } : {}),
          }

          if (config.type === 'local' && config.command) {
            mcpEntry.command = config.command
          }
          if (config.type === 'remote' && config.url) {
            mcpEntry.url = config.url
          }

          console.log('[LCodeConfig] ADD mcpEntry:', JSON.stringify(mcpEntry))
          const edits = modify(content, ['mcp', name], mcpEntry, { formattingOptions })
          content = applyEdits(content, edits)

          const parsed = parse(content, [], {
            allowTrailingComma: true,
            disallowComments: false,
          })
          // Don't validate whitelist - allow existing legacy fields

          await writeFile(content)
          console.log('[LCodeConfig] ADD success:', name)
          return { success: true, data: parsed }
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e)
          console.error('[LCodeConfig] ADD error:', error)
          return { success: false, error }
        }
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LCODE_MCP_SERVER_UPDATE,
    async (
      _event,
      name: string,
      updates: Partial<McpServerConfig>
    ): Promise<ResultP<unknown>> => {
      console.log('[LCodeConfig] UPDATE server:', name, 'updates:', JSON.stringify(updates))
      validateMcpServerName(name)

          return configMutex.runExclusive(async () => {
        try {
          let content = await readFileOrDefault()
          const config = parse(content, [], { allowTrailingComma: true, disallowComments: false })
          const formattingOptions = { insertSpaces: true, tabSize: 2, eol: '\n' }

          const mcpServers = (config as Record<string, unknown>).mcp as Record<string, unknown> | undefined
          if (!mcpServers || !(name in mcpServers)) {
            console.warn('[LCodeConfig] UPDATE server not found:', name)
            throw new Error(`MCP server not found: ${name}`)
          }

          const existing = mcpServers[name] as Record<string, unknown>
          const updated = { ...existing }
          console.log('[LCodeConfig] UPDATE existing:', JSON.stringify(existing))

          // Apply all updates
          for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
              updated[key] = value
            }
          }

          // Validate after update
          if (updated.type === 'local') {
            if (!updated.command || !Array.isArray(updated.command) || updated.command.length === 0) {
              throw new Error('Local MCP server requires command array after update')
            }
            // Remove url if switching to local
            if (updates.type === 'local') {
              delete updated.url
              delete updated.headers
              delete updated.oauth
            }
          }

          if (updated.type === 'remote') {
            if (!updated.url) {
              throw new Error('Remote MCP server requires url after update')
            }
            try {
              new URL(updated.url as string)
            } catch {
              throw new Error('Remote MCP server url must be valid')
            }
            // Remove command if switching to remote
            if (updates.type === 'remote') {
              delete updated.command
              delete updated.cwd
              delete updated.environment
            }
          }

          const edits = modify(content, ['mcp', name], updated, { formattingOptions })
          content = applyEdits(content, edits)

          const parsed = parse(content, [], {
            allowTrailingComma: true,
            disallowComments: false,
          })
          // Don't validate whitelist - allow existing legacy fields

          await writeFile(content)
          console.log('[LCodeConfig] UPDATE success:', name)
          return { success: true, data: parsed }
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e)
          return { success: false, error }
        }
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LCODE_MCP_SERVER_DELETE,
    async (_event, name: string): Promise<ResultP<unknown>> => {
      console.log('[LCodeConfig] DELETE server:', name)
      return configMutex.runExclusive(async () => {
        try {
          validateMcpServerName(name)

          let content = await readFileOrDefault()
          const config = parse(content, [], { allowTrailingComma: true, disallowComments: false })
          const formattingOptions = { insertSpaces: true, tabSize: 2, eol: '\n' }

          const mcpServers = (config as Record<string, unknown>).mcp as Record<string, unknown> | undefined
          if (!mcpServers || !(name in mcpServers)) {
            console.warn('[LCodeConfig] DELETE server not found:', name)
            throw new Error(`MCP server not found: ${name}`)
          }

          const edits = modify(content, ['mcp', name], undefined, { formattingOptions })
          content = applyEdits(content, edits)

          const parsed = parse(content, [], {
            allowTrailingComma: true,
            disallowComments: false,
          })
          // Don't validate whitelist - allow existing legacy fields

          await writeFile(content)
          console.log('[LCodeConfig] DELETE success:', name)
          return { success: true, data: parsed }
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e)
          console.error('[LCodeConfig] DELETE error:', error)
          return { success: false, error }
        }
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LCODE_MODEL_ADD,
    async (
      _event,
      providerId: string,
      modelId: string,
      modelConfig: {
        name?: string
        options?: {
          reasoningEffort?: string
          textVerbosity?: string
          reasoningSummary?: string
          include?: string[]
          thinking?: { type?: string; budgetTokens?: number }
        }
        variants?: Record<string, unknown>
      }
    ): Promise<ResultP<unknown>> => {
      console.log('[LCodeConfig] ADD model:', providerId, '/', modelId, 'config:', JSON.stringify(modelConfig))
      return configMutex.runExclusive(async () => {
        try {
          let content = await readFileOrDefault()
          const formattingOptions = { insertSpaces: true, tabSize: 2, eol: '\n' }

          const entry: Record<string, unknown> = {}
          if (modelConfig.name) entry.name = modelConfig.name
          if (modelConfig.options) entry.options = modelConfig.options
          if (modelConfig.variants) entry.variants = modelConfig.variants

          const edits = modify(content, ['provider', providerId, 'models', modelId], entry, { formattingOptions })
          content = applyEdits(content, edits)

          const parsed = parse(content, [], {
            allowTrailingComma: true,
            disallowComments: false,
          })

          await writeFile(content)
          await invalidateModelsCache()
          console.log('[LCodeConfig] ADD model success:', providerId, '/', modelId)
          return { success: true, data: parsed }
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e)
          console.error('[LCodeConfig] ADD model error:', error)
          return { success: false, error }
        }
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LCODE_CUSTOM_PROVIDER_ADD,
    async (
      _event,
      config: CustomProviderConfig
    ): Promise<ResultP<unknown>> => {
      console.log('[LCodeConfig] ADD custom provider:', config.providerId, 'type:', config.providerType, 'authType:', config.authType)
      const idValidation = validateProviderId(config.providerId)
      if (!idValidation.valid) {
        return { success: false, error: idValidation.error }
      }
      const urlValidation = validateBaseUrl(config.baseUrl)
      if (!urlValidation.valid) {
        return { success: false, error: urlValidation.error }
      }
      return configMutex.runExclusive(async () => {
        try {
          let content = await readFileOrDefault()
          const parsed = parse(content, [], {
            allowTrailingComma: true,
            disallowComments: false,
          })
          
          if (parsed.provider && parsed.provider[config.providerId]) {
            return { 
              success: false, 
              error: `Provider '${config.providerId}' already exists` 
            }
          }
          
          const npmPackage = PROVIDER_TYPE_TO_NPM[config.providerType]
          
          const providerOptions: Record<string, unknown> = {
            baseURL: config.baseUrl,
            apiKey: config.authType === 'apiKey' 
              ? config.authValue 
              : `{env:${config.authValue}}`
          }
          
          if (config.headers && Object.keys(config.headers).length > 0) {
            providerOptions.headers = config.headers
          }
          
          const providerConfig: Record<string, unknown> = {
            npm: npmPackage,
            name: config.displayName || generateDisplayNameFromId(config.providerId),
            options: providerOptions
          }
          
          if (config.authType === 'envVar') {
            providerConfig.env = [config.authValue]
          }
          
          const formattingOptions = { insertSpaces: true, tabSize: 2, eol: '\n' }
          const edits = modify(content, ['provider', config.providerId], providerConfig, { formattingOptions })
          content = applyEdits(content, edits)
          
          const finalParsed = parse(content, [], {
            allowTrailingComma: true,
            disallowComments: false,
          })
          
          await writeFile(content)
          await invalidateModelsCache()
          
          console.log('[LCodeConfig] ADD custom provider success:', config.providerId)
          return { success: true, data: finalParsed }
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e)
          console.error('[LCodeConfig] ADD custom provider error:', error)
          return { success: false, error }
        }
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LCODE_MODEL_DELETE,
    async (_event, providerId: string, modelId: string): Promise<ResultP<unknown>> => {
      console.log('[LCodeConfig] DELETE model:', providerId, '/', modelId)
      return configMutex.runExclusive(async () => {
        try {
          let content = await readFileOrDefault()
          const config = parse(content, [], { allowTrailingComma: true, disallowComments: false })
          const formattingOptions = { insertSpaces: true, tabSize: 2, eol: '\n' }

          const provider = (config as Record<string, unknown>).provider as Record<string, unknown> | undefined
          if (!provider || !(providerId in provider)) {
            throw new Error(`Provider not found: ${providerId}`)
          }
          const models = provider[providerId] as Record<string, unknown>
          if (!models || !('models' in models) || !(modelId in (models.models as Record<string, unknown>))) {
            throw new Error(`Model not found: ${providerId}/${modelId}`)
          }

          const edits = modify(content, ['provider', providerId, 'models', modelId], undefined, { formattingOptions })
          content = applyEdits(content, edits)

          const parsed = parse(content, [], {
            allowTrailingComma: true,
            disallowComments: false,
          })

          await writeFile(content)
          await invalidateModelsCache()
          console.log('[LCodeConfig] DELETE model success:', providerId, '/', modelId)
          return { success: true, data: parsed }
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e)
          console.error('[LCodeConfig] DELETE model error:', error)
          return { success: false, error }
        }
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LCODE_CUSTOM_PROVIDER_DELETE,
    async (_event, providerId: string): Promise<ResultP<unknown>> => {
      console.log('[LCodeConfig] DELETE custom provider:', providerId)
      return configMutex.runExclusive(async () => {
        try {
          let content = await readFileOrDefault()
          const config = parse(content, [], { allowTrailingComma: true, disallowComments: false })
          const formattingOptions = { insertSpaces: true, tabSize: 2, eol: '\n' }

          const provider = (config as Record<string, unknown>).provider as Record<string, unknown> | undefined
          if (!provider || !(providerId in provider)) {
            throw new Error(`Provider not found in config: ${providerId}`)
          }

          const edits = modify(content, ['provider', providerId], undefined, { formattingOptions })
          content = applyEdits(content, edits)

          await writeFile(content)
          await invalidateModelsCache()
          console.log('[LCodeConfig] DELETE custom provider success:', providerId)
          return { success: true }
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e)
          console.error('[LCodeConfig] DELETE custom provider error:', error)
          return { success: false, error }
        }
      })
    }
  )
}