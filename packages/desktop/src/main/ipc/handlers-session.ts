import { ipcMain } from 'electron'
import { CHANNELS } from './channels'
import { backend } from '../backend-client'
import type { Conversation, LocationRef, Message, PromptInput, ToolCall, PromptOptions } from '../../types/ipc'
import type { SessionListQuery, SessionListResult } from '../../types/session'

const sessionStreams = new Map<string, () => void>()

/**
 * V1 backend message (SessionV1.WithParts) — returned when limit=0 or undefined
 * Structure: { info: { id, role, timestamp, ... }, parts: [...] }
 */
interface V1BackendMessage {
  info: {
    id: string
    role: 'user' | 'assistant'
    timestamp: number
    [key: string]: unknown
  }
  parts: Array<{
    type: string
    text?: string
    callID?: string
    tool?: string
    state?: {
      status: string
      input?: Record<string, unknown> | string
      result?: unknown
      structured?: Record<string, unknown>
      content?: unknown[]
      error?: { message?: string }
    }
    [key: string]: unknown
  }>
}

/**
 * V2 backend message (SessionMessage.Message) — returned when limit > 0
 * Structure: { id, type, time, text?, content? }
 */
interface V2BackendMessage {
  id: string
  type: 'user' | 'assistant' | 'system' | 'shell' | 'synthetic' | 'agent-switched' | 'model-switched' | 'compaction'
  time: { created: number; completed?: number }
  text?: string | string[]
  content?: Array<{
    type: string
    id?: string
    text?: string
    name?: string
    state?: {
      status: string
      input?: Record<string, unknown> | string
      result?: unknown
      structured?: Record<string, unknown>
      content?: unknown[]
      error?: { message?: string }
    }
    time?: { created?: number; ran?: number; completed?: number }
    [key: string]: unknown
  }>
  [key: string]: unknown
}

type BackendMessage = V1BackendMessage | V2BackendMessage

function isV1Message(msg: BackendMessage): msg is V1BackendMessage {
  return 'info' in msg && 'parts' in msg
}

/**
 * Build a ToolCall from a backend tool part (shared by V1 and V2 paths).
 * Captures input/structured/content/result/duration — previously these were
 * dropped (args was hardcoded to {} and only result was kept).
 */
function toToolCall(
  id: string,
  name: string,
  state: {
    status: string
    input?: Record<string, unknown> | string
    output?: string
    result?: unknown
    structured?: Record<string, unknown>
    content?: unknown[]
    error?: { message?: string }
  } | undefined,
  time?: { created?: number; ran?: number; completed?: number },
): ToolCall {
  // input may be a JSON string (pending state) or an object (running/completed)
  const rawInput = state?.input
  const args: Record<string, unknown> =
    typeof rawInput === 'string'
      ? safeParseToolArgs(rawInput)
      : (rawInput as Record<string, unknown>) ?? {}

  const ran = time?.ran
  const completed = time?.completed
  const duration =
    typeof ran === 'number' && typeof completed === 'number' && completed > ran
      ? completed - ran
      : undefined

  // V1 tools store output as a plain string; try to extract structured data
  let parsedOutput: { structured?: unknown; text?: string } | undefined
  let extractedSessionId: string | undefined
  
  if (!state?.result && !state?.structured && !state?.content && typeof state?.output === 'string') {
    const outputStr = state.output
    console.log('[DEBUG toToolCall] V1 output detected for tool:', name, 'id:', id)
    console.log('[DEBUG toToolCall]   state.output:', outputStr.slice(0, 300))
    
    // Try JSON format first: {"structured": {...}, "text": "..."}
    try {
      parsedOutput = JSON.parse(outputStr)
      const structuredStr = JSON.stringify(parsedOutput?.structured)
      console.log('[DEBUG toToolCall]   JSON parse success, structured:', structuredStr ? structuredStr.slice(0, 300) : 'undefined')
    } catch (e) {
      // Fall back to XML format: <task id="sessionId" state="...">
      console.log('[DEBUG toToolCall]   JSON parse failed, trying XML extraction')
      parsedOutput = undefined
      
      // Extract sessionId from <task id="xxx"> attribute
      const taskIdMatch = outputStr.match(/<task\s+id="([^"]+)"/)
      if (taskIdMatch) {
        extractedSessionId = taskIdMatch[1]
        console.log('[DEBUG toToolCall]   XML extraction success, sessionId:', extractedSessionId)
        
        // Also try to extract state attribute
        const stateMatch = outputStr.match(/<task[^>]+state="([^"]+)"/)
        const taskState = stateMatch ? stateMatch[1] : 'completed'
        
        // Build structured from XML attributes
        parsedOutput = {
          structured: {
            type: 'task',
            sessionId: extractedSessionId,
            sessionID: extractedSessionId,
            state: taskState,
          },
          text: outputStr,
        }
      } else {
        console.log('[DEBUG toToolCall]   XML extraction failed, no <task id=...> found')
      }
    }
  }

  const actualStructured = (state?.structured ?? parsedOutput?.structured) as Record<string, unknown> | undefined
  const actualResult = state?.result ?? (parsedOutput && !actualStructured ? parsedOutput : undefined)
  const hasOutput = actualResult !== undefined || actualStructured !== undefined || state?.content

  console.log('[DEBUG toToolCall] final output for tool:', name)
  const structuredStr = JSON.stringify(actualStructured)
  console.log('[DEBUG toToolCall]   actualStructured:', structuredStr ? structuredStr.slice(0, 300) : 'undefined')
  const resultStr = typeof actualResult === 'string' ? actualResult : JSON.stringify(actualResult)
  console.log('[DEBUG toToolCall]   actualResult:', resultStr ? resultStr.slice(0, 100) : 'undefined')
  console.log('[DEBUG toToolCall]   hasOutput:', hasOutput)

  const toolCall: ToolCall = {
    id,
    name,
    args,
    status: (state?.status || 'pending') as ToolCall['status'],
    ...(hasOutput
      ? {
          output: {
            ...(actualResult !== undefined ? { result: actualResult } : {}),
            ...(actualStructured ? { structured: actualStructured as never } : {}),
            ...(state?.content ? { content: state.content as never } : {}),
          },
        }
      : {}),
    ...(state?.error?.message ? { error: state.error.message } : {}),
    ...(duration !== undefined ? { duration } : {}),
  }
  
  const outputStr = JSON.stringify(toolCall.output)
  console.log('[DEBUG toToolCall]   returning toolCall.output:', outputStr ? outputStr.slice(0, 300) : 'undefined')
  return toolCall
}

/** Parse a JSON string to args object; tolerate plain strings. */
function safeParseToolArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { raw }
  } catch {
    return { raw }
  }
}

/**
 * Convert backend message (V1 or V2) to desktop Message format.
 * Returns null for non-displayable types (compaction, agent-switched, etc.).
 */
function toMessage(msg: BackendMessage): Message | null {
  if (isV1Message(msg)) {
    // V1 format: SessionV1.WithParts
    const textParts = msg.parts.filter(p => p.type === 'text' && p.text)
    const toolParts = msg.parts.filter(p => p.type === 'tool')
    const reasoningParts = msg.parts.filter(p => p.type === 'reasoning' && p.text)

    const content = textParts.map(p => p.text!).join('\n')
    const reasoning = reasoningParts.length > 0 ? reasoningParts.map(p => p.text!).join('\n') : undefined

    const toolCalls: ToolCall[] | undefined = toolParts.length > 0
      ? toolParts.map(p => {
        console.log('[DEBUG toMessage V1] tool part:', p.tool, 'callID:', p.callID)
        console.log('[DEBUG toMessage V1]   p.state keys:', p.state ? Object.keys(p.state) : 'undefined')
        console.log('[DEBUG toMessage V1]   p.state.output:', p.state?.output ? (typeof p.state.output === 'string' ? p.state.output.slice(0, 200) : JSON.stringify(p.state.output).slice(0, 200)) : 'undefined')
        console.log('[DEBUG toMessage V1]   p.state.result:', p.state?.result !== undefined ? 'exists' : 'undefined')
        console.log('[DEBUG toMessage V1]   p.state.structured:', p.state?.structured !== undefined ? 'exists' : 'undefined')
        console.log('[DEBUG toMessage V1]   p.state.content:', p.state?.content !== undefined ? 'exists' : 'undefined')
        return toToolCall(p.callID || '', p.tool || '', p.state)
      })
      : undefined

    return {
      id: msg.info.id,
      role: msg.info.role,
      content,
      timestamp: new Date(msg.info.timestamp),
      ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
      ...(reasoning ? { reasoning } : {}),
    }
  }

  // V2 format: SessionMessage.Message
  if (msg.type === 'assistant' && msg.content) {
    const textParts = msg.content.filter(p => p.type === 'text' && p.text)
    const reasoningParts = msg.content.filter(p => p.type === 'reasoning' && p.text)
    const toolParts = msg.content.filter(p => p.type === 'tool')

    const content = textParts.map(p => p.text!).join('\n')
    const reasoning = reasoningParts.length > 0 ? reasoningParts.map(p => p.text!).join('\n') : undefined

    const toolCalls: ToolCall[] | undefined = toolParts.length > 0
      ? toolParts.map(p => toToolCall(p.id || '', p.name || '', p.state, p.time))
      : undefined

    // Calculate duration from time.completed - time.created
    const duration = msg.time.completed && msg.time.created
      ? msg.time.completed - msg.time.created
      : undefined

    return {
      id: msg.id,
      role: 'assistant',
      content,
      timestamp: new Date(msg.time.created),
      ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
      ...(reasoning ? { reasoning } : {}),
      ...(duration ? { duration } : {}),
    }
  }

  if (msg.type === 'user') {
    const text = Array.isArray(msg.text) ? msg.text.join('\n') : (msg.text || '')
    return {
      id: msg.id,
      role: 'user',
      content: text,
      timestamp: new Date(msg.time.created),
    }
  }

  if (msg.type === 'system' && msg.text) {
    const text = Array.isArray(msg.text) ? msg.text.join('\n') : String(msg.text)
    return {
      id: msg.id,
      role: 'assistant',
      content: text,
      timestamp: new Date(msg.time.created),
    }
  }

  // Skip non-displayable types: shell, synthetic, agent-switched, model-switched, compaction
  return null
}

/**
 * Map a raw backend session to the renderer's Conversation shape.
 * No desktop-only metadata overlay - all data comes from backend.
 */
function toConversation(raw: Record<string, unknown>): Conversation {
  const time = (raw.time ?? {}) as { created?: number; updated?: number }
  return {
    id: String(raw.id),
    title: String(raw.title ?? 'Untitled'),
    messages: [],
    createdAt: new Date(time.created ?? Date.now()),
    updatedAt: new Date(time.updated ?? time.created ?? Date.now()),
    directory: String(raw.directory ?? ''),
  }
}

export function registerSessionHandlers() {
  ipcMain.handle(CHANNELS.SESSION_CREATE, async (_event, location: LocationRef) => {
    const sessionId = await backend.session.create(location.directory, location.workspaceID)
    return sessionId
  })

  ipcMain.handle(CHANNELS.SESSION_GET, async (_event, sessionID: string, directory?: string) => {
    return await backend.session.get(sessionID, directory)
  })

  ipcMain.handle(CHANNELS.SESSION_LIST, async (_event, query?: SessionListQuery): Promise<SessionListResult> => {
    console.log('[SESSION_LIST] Handler called with query:', JSON.stringify(query))
    // Use experimental API with cursor pagination support
    try {
      const result = await backend.experimental.session.list(query ?? {})
      console.log('[SESSION_LIST] Backend returned:', JSON.stringify(result).slice(0, 500))
      console.log('[SESSION_LIST] Conversations count:', result.conversations?.length ?? 0)
      return result
    } catch (e) {
      console.error('[SESSION_LIST] Error:', e)
      throw e
    }
  })

  ipcMain.handle(CHANNELS.SESSION_MESSAGES, async (_event, sessionID: string, limit?: number, directory?: string) => {
    const raw = await backend.session.messages(sessionID, limit, directory)
    const messages = raw
      .map((msg) => toMessage(msg as BackendMessage))
      .filter((m): m is Message => m !== null)
    
    // Ensure data is IPC-safe: fix invalid Dates, deep clone tool output
    return messages.map(msg => {
      let timestamp = msg.timestamp
      if (timestamp instanceof Date && isNaN(timestamp.getTime())) {
        console.warn('[SESSION_MESSAGES] Invalid Date for msg:', msg.id)
        timestamp = new Date()
      }
      
      return {
        ...msg,
        timestamp,
        toolCalls: msg.toolCalls?.map(tc => ({
          ...tc,
          output: tc.output ? JSON.parse(JSON.stringify(tc.output)) : undefined,
        })),
      }
    })
  })

  ipcMain.handle(CHANNELS.SESSION_PROMPT, async (event, sessionID: string, prompt: PromptInput[], options?: PromptOptions, directory?: string) => {
    // 将 PromptInput[] 转换为后端期望的 parts 格式
    const parts = prompt.map(p => {
      if (p.type === 'text') {
        return { type: 'text', text: p.text! }
      }
      if (p.type === 'file') {
        return {
          type: 'file',
          url: p.url!,
          filename: p.filename,
          mime: p.mime || 'text/plain',
          source: p.source
        }
      }
      if (p.type === 'agent') {
        return {
          type: 'agent',
          name: p.name!,
          source: p.source
        }
      }
      return { type: 'tool_result', toolResult: p.toolResult }
    })

    // 构建 prompt payload，包含 model 和 agent
    // 注意：后端期望的字段名是 modelID，不是 id
    const payload: { parts: unknown[]; model?: { providerID: string; modelID: string; variant?: string }; agent?: string } = { parts }
    if (options?.model) {
      payload.model = {
        providerID: options.model.providerID,
        modelID: options.model.modelID,
        variant: options.variant
      }
    }
    if (options?.agent) {
      payload.agent = options.agent
    }

    // 先订阅 SSE 事件，再发 prompt，避免事件在 prompt 和 SSE 之间丢失
    // Always set up SSE stream (remove existing if present) to ensure fresh connection
    if (sessionStreams.has(sessionID)) {
      const oldUnsub = sessionStreams.get(sessionID)
      if (oldUnsub) {
        console.log('[PROMPT] removing old SSE stream for', sessionID)
        oldUnsub()
      }
      sessionStreams.delete(sessionID)
    }
    
    console.log('[PROMPT] setting up SSE stream BEFORE prompt for', sessionID)
    let loggedFirstEvent = false
    let eventCount = 0
    try {
      const unsubscribe = backend.session.events(sessionID, (evt: unknown) => {
        const e = evt as Record<string, unknown>
        eventCount++
        if (e?.type) {
          console.log('[SSE MAIN #' + eventCount + '] type:', e.type, 'keys:', Object.keys(e).slice(0, 5))
          // Log first event structure in detail
          if (!loggedFirstEvent) {
            console.log('[SSE MAIN] First event structure:', JSON.stringify(e, null, 2).slice(0, 500))
            loggedFirstEvent = true
          }
          // Log session events with more detail
          if (e.type.startsWith('session.next.')) {
            console.log('[SSE MAIN] SESSION EVENT:', JSON.stringify(e).slice(0, 300))
          }
        }
        event.sender.send(CHANNELS.SESSION_STREAM_EVENT, {
          sessionID,
          event: evt
        })
      }, directory)
      sessionStreams.set(sessionID, unsubscribe)
      console.log('[PROMPT] SSE stream set up for', sessionID)
      } catch (e) {
        console.error('[PROMPT] SSE stream setup FAILED for', sessionID, ':', e)
      }

    try {
      await backend.session.prompt(sessionID, payload, directory)
      console.log('[PROMPT] session.prompt succeeded for', sessionID)
    } catch (e) {
      console.error('[PROMPT] session.prompt FAILED for', sessionID, ':', e)
    }

    return true
  })

  ipcMain.handle(CHANNELS.SESSION_INTERRUPT, async (_event, sessionID: string, directory?: string) => {
    await backend.session.interrupt(sessionID, directory)
    return true
  })

  ipcMain.handle(CHANNELS.SESSION_RESUME, async (_event, sessionID: string, directory?: string) => {
    await backend.session.resume(sessionID, directory)
    return true
  })

  ipcMain.handle(CHANNELS.SESSION_DELETE, async (_event, sessionID: string, directory?: string) => {
    const removed = await backend.session.remove(sessionID, directory)
    stopSessionStream(sessionID)
    return removed
  })

  // SESSION_UPDATE: 更新 title (后端支持)
  ipcMain.handle(CHANNELS.SESSION_UPDATE, async (_event, sessionID: string, patch: { title?: string }, directory?: string) => {
    return await backend.session.update(sessionID, patch, directory)
  })

  ipcMain.handle(CHANNELS.SESSION_TODO, async (_event, sessionID: string, directory?: string) => {
    return await backend.session.todo(sessionID, directory)
  })

  ipcMain.handle(CHANNELS.SESSION_AGENTS, async (_event, directory?: string) => {
    return await backend.session.agents(directory)
  })

  // Provider handlers
  ipcMain.handle(CHANNELS.PROVIDER_AUTH_METHODS, async (_event, directory?: string) => {
    return await backend.provider.authMethods(directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_AUTHORIZE, async (_event, providerID: string, method: number, inputs?: Record<string, string>, directory?: string) => {
    return await backend.provider.authorize(providerID, method, inputs, directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_AUTH_CALLBACK, async (_event, providerID: string, method: number, code?: string, directory?: string) => {
    return await backend.provider.authCallback(providerID, method, code, directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_ADD, async (_event, config: { name: string; apiKey: string; baseUrl?: string }, directory?: string) => {
    return await backend.provider.add(config, directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_UPDATE, async (_event, providerId: string, config: { apiKey?: string; baseUrl?: string }, directory?: string) => {
    return await backend.provider.update(providerId, config, directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_DELETE, async (_event, providerId: string, directory?: string) => {
    return await backend.provider.delete(providerId, directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_TEST, async (_event, providerIdOrConfig: string | { name: string; apiKey: string; baseUrl?: string }, directory?: string) => {
    return await backend.provider.test(providerIdOrConfig, directory)
  })

  ipcMain.handle(CHANNELS.PROVIDER_REFRESH_MODELS, async (_event, providerId: string, directory?: string) => {
    return await backend.provider.refreshModels(providerId, directory)
  })

  // Console handlers
  ipcMain.handle(CHANNELS.CONSOLE_GET, async (_event, directory?: string) => {
    return await backend.console.get(directory)
  })

  // Config handlers
  ipcMain.handle(CHANNELS.CONFIG_MODELS, async (_event, directory?: string) => {
    return await backend.config.models(directory)
  })

  ipcMain.handle(CHANNELS.CONFIG_GET, async (_event, key: string, directory?: string) => {
    return await backend.config.get(key, directory)
  })

  ipcMain.handle(CHANNELS.CONFIG_SET, async (_event, key: string, value: unknown, directory?: string) => {
    await backend.config.set(key, value, directory)
    return true
  })

  // Delete model from provider config (calls backend API)
  ipcMain.handle(CHANNELS.PROVIDER_DELETE_MODEL, async (_event, providerId: string, modelId: string, directory?: string) => {
    console.log('[DeleteModel] providerId:', providerId, 'modelId:', modelId, 'directory:', directory)
    
    try {
      const result = await backend.provider.deleteModel(providerId, modelId, directory)
      console.log('[DeleteModel] backend result:', result)
      return result
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      console.log('[DeleteModel] ERROR:', error)
      return { success: false, error }
    }
  })

  // Refresh all models cache (invalidate InstanceState + ModelsDev)
  ipcMain.handle(CHANNELS.PROVIDER_REFRESH_ALL, async (_event, directory?: string) => {
    console.log('[RefreshAll] directory:', directory)
    try {
      const result = await backend.provider.refreshAll(directory)
      console.log('[RefreshAll] result:', result)
      return result
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      console.log('[RefreshAll] ERROR:', error)
      return { success: false, error }
    }
  })
}

export function startSessionStream(sessionID: string, webContents: Electron.WebContents) {
  if (!sessionStreams.has(sessionID)) {
    const unsubscribe = backend.session.events(sessionID, (event: unknown) => {
      // Deep serialize event to ensure IPC compatibility
      // Some events may contain non-serializable objects
      const serializedEvent = JSON.parse(JSON.stringify(event))
      webContents.send(CHANNELS.SESSION_STREAM_EVENT, {
        sessionID,
        event: serializedEvent
      })
    })
    sessionStreams.set(sessionID, unsubscribe)
  }
}

export function stopSessionStream(sessionID: string) {
  const unsubscribe = sessionStreams.get(sessionID)
  if (unsubscribe) {
    unsubscribe()
    sessionStreams.delete(sessionID)
  }
}