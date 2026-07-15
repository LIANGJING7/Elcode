import { ipcMain } from 'electron'
import { CHANNELS } from './channels'
import { backend } from '../backend-client'
import type { Conversation, LocationRef, Message, PromptInput, ToolCall, PromptOptions } from '../../types/ipc'
import type { SessionListQuery, SessionListResult } from '../../types/session'

// Per-session unsubscribers — each removes its listener from the shared SSE connection.
// The shared connection in backend-client.ts handles multiplexing so events are
// delivered exactly once regardless of how many sessions are listening.
const sessionStreams = new Map<string, () => void>()

/**
 * Shared tool state shape for both V1 and V2 messages.
 */
interface ToolPartState {
  status: string
  input?: Record<string, unknown> | string
  result?: unknown
  structured?: Record<string, unknown>
  content?: unknown[]
  error?: { message?: string }
}

/**
 * V1 part types — discriminated union so .filter(p => p.type === '…') narrows correctly.
 */
interface V1TextPart {
  type: 'text'
  text?: string
  synthetic?: boolean
}

interface V1ToolPart {
  type: 'tool'
  callID?: string
  tool?: string
  state?: ToolPartState
}

interface V1ReasoningPart {
  type: 'reasoning'
  text?: string
}

interface V1FilePart {
  type: 'file'
  mime?: string
  url?: string
  filename?: string
  name?: string
}

interface V1AgentPart {
  type: 'agent'
  name?: string
  source?: { value?: string; start: number; end: number }
}

type V1Part = V1TextPart | V1ToolPart | V1ReasoningPart | V1FilePart | V1AgentPart

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
  parts: V1Part[]
}

interface V2ContentText {
  type: 'text'
  id: string
  text: string
  [key: string]: unknown
}

interface V2ContentReasoning {
  type: 'reasoning'
  id: string
  text: string
  [key: string]: unknown
}

interface V2ContentTool {
  type: 'tool'
  id: string
  name: string
  state: ToolPartState
  time?: { created?: number; ran?: number; completed?: number }
  [key: string]: unknown
}

interface V2ContentFile {
  type: 'file'
  mime?: string
  url?: string
  filename?: string
  name?: string
  [key: string]: unknown
}

type V2ContentPart = V2ContentText | V2ContentReasoning | V2ContentTool | V2ContentFile

/**
 * V2 backend message (SessionMessage.Message) — returned when limit > 0
 * Structure: { id, type, time, text?, content? }
 */
interface V2BackendMessage {
  id: string
  type: 'user' | 'assistant' | 'system' | 'shell' | 'synthetic' | 'agent-switched' | 'model-switched' | 'compaction'
  time: { created: number; completed?: number }
  text?: string | string[]
  content?: V2ContentPart[]
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
    error?: { type?: string; message?: string }
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
    
    try {
      parsedOutput = JSON.parse(outputStr)
    } catch (e) {
      parsedOutput = undefined
      
      const taskIdMatch = outputStr.match(/<task\s+id="([^"]+)"/)
      if (taskIdMatch) {
        extractedSessionId = taskIdMatch[1]
        
        const stateMatch = outputStr.match(/<task[^>]+state="([^"]+)"/)
        const taskState = stateMatch ? stateMatch[1] : 'completed'
        
        parsedOutput = {
          structured: {
            type: 'task',
            sessionId: extractedSessionId,
            sessionID: extractedSessionId,
            state: taskState,
          },
          text: outputStr,
        }
      }
    }
  }

  const actualStructured = (state?.structured ?? parsedOutput?.structured) as Record<string, unknown> | undefined
  const actualResult = state?.result ?? (parsedOutput && !actualStructured ? parsedOutput : undefined)
  const hasOutput = actualResult !== undefined || actualStructured !== undefined || state?.content

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
            ...(state && state.content ? { content: state.content as never } : {}),
          },
        }
      : {}),
    ...(state && state.error ? { error: { type: state.error.type || 'APIError', message: state.error.message || '' } } : {}),
    ...(duration !== undefined ? { duration } : {}),
  }
  
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
 * Reconstruct original text from text parts and agent parts
 * 
 * Algorithm:
 * - Agent parts have source.start/end positions relative to original text
 * - Text parts fill the gaps between agents
 * - We assume text parts are ordered to match the gaps
 * 
 * Example:
 * Original: "@AI-Engineer 111 @Account-Strategist"
 * Agent 1: start=0, end=12 → "@AI-Engineer"
 * Text: " 111 "
 * Agent 2: start=17, end=36 → "@Account-Strategist"
 * 
 * Reconstructed: "@AI-Engineer" + " 111 " + "@Account-Strategist"
 */
function reconstructOriginalText(
  textParts: V1TextPart[],
  agentParts: V1AgentPart[]
): string {
  const segments: string[] = []
  const textContent = textParts.map(p => p.text || '').join('')
  
  // Sort agents by position
  const sortedAgents = agentParts
    .filter(a => a.source?.start !== undefined)
    .sort((a, b) => a.source!.start - b.source!.start)
  
  if (sortedAgents.length === 0) {
    return textContent
  }
  
  // Strategy: alternate between agent mentions and user text
  // First agent: insert its @mention
  // Then insert user text (from textParts)
  // Then next agent: insert its @mention
  // etc.
  
  let textIndex = 0
  const textSegments = textParts.map(p => p.text || '')
  
  for (let i = 0; i < sortedAgents.length; i++) {
    const agent = sortedAgents[i]
    
    // Add @agent mention
    const agentText = agent.source?.value || `@${(agent.name || '').replace(/ /g, '-')}`
    segments.push(agentText)
    
    // Add user text after this agent (before next agent or end)
    if (textIndex < textSegments.length) {
      segments.push(textSegments[textIndex])
      textIndex++
    }
  }
  
  // Add any remaining text
  while (textIndex < textSegments.length) {
    segments.push(textSegments[textIndex])
    textIndex++
  }
  
  return segments.join('')
}

/**
 * Convert backend message to renderer Message shape.
 * Returns null for non-displayable types (compaction, agent-switched, etc.).
 */
function toMessage(msg: BackendMessage): Message | null {
  if (isV1Message(msg)) {
    const allTextParts = msg.parts.filter(p => p.type === 'text')
    
    const textParts = msg.parts.filter(p => 
      p.type === 'text' && p.text && !p.synthetic
    ) as V1TextPart[]
    const toolParts = msg.parts.filter(p => p.type === 'tool') as V1ToolPart[]
    const reasoningParts = msg.parts.filter(p => p.type === 'reasoning' && p.text) as V1ReasoningPart[]
    const fileParts = msg.parts.filter(p => p.type === 'file') as V1FilePart[]
    const agentParts = msg.parts.filter(p => p.type === 'agent') as V1AgentPart[]

    let content: string
    if (agentParts.length > 0) {
      content = reconstructOriginalText(textParts, agentParts)
    } else {
      content = textParts.map(p => p.text!).join('\n')
    }
    const reasoning = reasoningParts.length > 0 ? reasoningParts.map(p => p.text!).join('\n') : undefined

    const toolCalls: ToolCall[] | undefined = toolParts.length > 0
      ? toolParts.map(p => {
        return toToolCall(p.callID || '', p.tool || '', p.state)
      })
      : undefined

    const files = fileParts.length > 0
      ? fileParts.map(p => ({
          type: 'file' as const,
          mime: p.mime || 'application/octet-stream',
          name: p.filename || p.name,
          url: p.url || ''
        }))
      : undefined

    const agents = agentParts.length > 0
      ? agentParts
          .filter(p => {
            return !!(p.name && p.source?.value)
          })
          .map(p => ({
            type: 'agent' as const,
            name: p.name!,
            source: {
              value: p.source!.value!,
              start: p.source!.start,
              end: p.source!.end
            }
          }))
      : undefined

    // Convert error format: { name, data: { message } } -> { type, message }
    const rawError = (msg.info as any).error
    const error = rawError ? {
      type: rawError.name || 'unknown',
      message: rawError.data?.message || rawError.message || 'Unknown error'
    } : undefined

    return {
      id: msg.info.id,
      role: msg.info.role,
      content,
      timestamp: new Date(msg.info.timestamp),
      ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
      ...(reasoning ? { reasoning } : {}),
      ...(files && files.length > 0 ? { files } : {}),
      ...(agents && agents.length > 0 ? { agents } : {}),
      ...(error ? { error } : {}),
    }
  }

  // V2 format: SessionMessage.Message
  if (msg.type === 'assistant' && msg.content) {
    const textParts = msg.content.filter(p => p.type === 'text' && p.text)
    const reasoningParts = msg.content.filter(p => p.type === 'reasoning' && p.text)
    const toolParts = msg.content.filter(p => p.type === 'tool')
    const fileParts = msg.content.filter(p => p.type === 'file')

    const content = textParts.map(p => p.text!).join('\n')
    const reasoning = reasoningParts.length > 0 ? reasoningParts.map(p => p.text!).join('\n') : undefined

    const toolCalls: ToolCall[] | undefined = toolParts.length > 0
      ? toolParts.map(p => toToolCall(p.id || '', p.name || '', p.state, p.time))
      : undefined

    const files = fileParts.length > 0
      ? fileParts.map(p => ({
          type: 'file' as const,
          mime: p.mime || 'application/octet-stream',
          name: p.filename || p.name,
          url: p.url || ''
        }))
      : undefined

    // Calculate duration from time.completed - time.created
    const duration = msg.time.completed && msg.time.created
      ? msg.time.completed - msg.time.created
      : undefined

    // Convert error format: { name, data: { message } } -> { type, message }
    const rawError = (msg as any).error
    const error = rawError ? {
      type: rawError.name || rawError.type || 'unknown',
      message: rawError.data?.message || rawError.message || 'Unknown error'
    } : undefined

    console.log('[toMessage V2 Assistant] error:', error)

    return {
      id: msg.id,
      role: 'assistant',
      content,
      timestamp: new Date(msg.time.created),
      ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
      ...(reasoning ? { reasoning } : {}),
      ...(duration ? { duration } : {}),
...(files && files.length > 0 ? { files } : {}),
      ...(error ? { error } : {}),
    }
  }

  console.log('[toMessage V2] Processing message:', msg.id, 'type:', msg.type)
  console.log('[toMessage V2] msg keys:', Object.keys(msg))
  console.log('[toMessage V2] (msg as any).error:', (msg as any).error)

  if (msg.type === 'user') {
    // V2 User message: text is already filtered (no synthetic), files/agents at top level
    console.log('[toMessage V2 User] ========================================')
    console.log('[toMessage V2 User] Processing message:', msg.id)
    console.log('[toMessage V2 User] Raw message type:', msg.type)
    
    // CRITICAL: Log the entire raw message structure
    console.log('[toMessage V2 User] === RAW MESSAGE STRUCTURE ===')
    console.log('[toMessage V2 User] msg keys:', Object.keys(msg))
    console.log('[toMessage V2 User] msg.text:', JSON.stringify(msg.text))
    console.log('[toMessage V2 User] msg.parts:', (msg as any).parts?.length)
    if ((msg as any).parts) {
      console.log('[toMessage V2 User] === PARTS DETAIL ===')
      ;(msg as any).parts.forEach((part: any, idx: number) => {
        console.log(`[toMessage V2 User] Part ${idx}:`, JSON.stringify(part))
      })
    }
    
    const text = Array.isArray(msg.text) ? msg.text.join('\n') : (msg.text || '')
    
    console.log('[toMessage V2 User] joined text (full):', JSON.stringify(text))
    console.log('[toMessage V2 User] text length:', text.length)
    
    const msgFiles = (msg as any).files || []
    const msgAgents = (msg as any).agents || []
    
    console.log('[toMessage V2 User] files count:', msgFiles.length)
    console.log('[toMessage V2 User] agents count:', msgAgents.length)
    
    if (msgAgents.length > 0) {
      console.log('[toMessage V2 User] === AGENTS DETAIL ===')
      msgAgents.forEach((a: any, idx: number) => {
        console.log(`[toMessage V2 User] Agent ${idx}:`)
        console.log(`[toMessage V2 User]   name: "${a.name}"`)
        console.log(`[toMessage V2 User]   source.start: ${a.source?.start}`)
        console.log(`[toMessage V2 User]   source.end: ${a.source?.end}`)
        console.log(`[toMessage V2 User]   source.value: "${a.source?.value}"`)
        console.log(`[toMessage V2 User]   source.text: "${a.source?.text}"`)
      })
      
      // Try to reconstruct original text
      console.log('[toMessage V2 User] === RECONSTRUCTION ATTEMPT ===')
      const sorted = [...msgAgents]
        .filter(a => a.source?.start !== undefined && a.source?.end !== undefined)
        .sort((a, b) => a.source!.start - b.source!.start)
      
      console.log('[toMessage V2 User] Sorted agents:', sorted.map((a: any) => ({
        name: a.name,
        start: a.source!.start,
        end: a.source!.end,
        value: a.source!.value || a.source!.text
      })))
      
      // Method 1: Assume text is filtered (no @mentions), use source positions as-is
      console.log('[toMessage V2 User] --- Method 1: Use source positions directly ---')
      let reconstructed1 = ''
      let lastEnd1 = 0
      for (const agent of sorted) {
        const start = agent.source!.start
        const end = agent.source!.end
        
        console.log(`[toMessage V2 User] Processing agent "${agent.name}":`)
        console.log(`[toMessage V2 User]   start=${start}, end=${end}, lastEnd=${lastEnd1}`)
        
        // Add text before this agent
        if (start > lastEnd1 && lastEnd1 < text.length) {
          const segment = text.slice(lastEnd1, Math.min(start, text.length))
          console.log(`[toMessage V2 User]   Adding pre-text [${lastEnd1}:${Math.min(start, text.length)}]: "${segment}"`)
          reconstructed1 += segment
        }
        
        // Add @agent
        const agentText = agent.source?.value || agent.source?.text || `@${agent.name.replace(/ /g, '-')}`
        console.log(`[toMessage V2 User]   Adding agent text: "${agentText}"`)
        reconstructed1 += agentText
        lastEnd1 = end
        
        console.log(`[toMessage V2 User]   Current reconstructed: "${reconstructed1}"`)
      }
      
      // Add remaining text
      if (lastEnd1 < text.length) {
        const segment = text.slice(lastEnd1)
        console.log(`[toMessage V2 User] Adding remaining text [${lastEnd1}:${text.length}]: "${segment}"`)
        reconstructed1 += segment
      }
      
      console.log('[toMessage V2 User] Method 1 result:', JSON.stringify(reconstructed1))
      
      // Method 2: Assume text has @mentions removed, need to recalculate positions
      console.log('[toMessage V2 User] --- Method 2: Assume @mentions removed from text ---')
      // This method would need to recalculate positions based on how many mentions were before
      // For now, let's just compare source.value with actual @mention
      
      // Let's check if we can find @mention in source positions
      console.log('[toMessage V2 User] --- Checking source.value positions in text ---')
      for (const agent of sorted) {
        const agentText = agent.source?.value || agent.source?.text
        if (agentText) {
          // Check if agentText exists in joined text
          const posInText = text.indexOf(agentText)
          console.log(`[toMessage V2 User] Agent "${agent.name}" text "${agentText}" found at position ${posInText} in text`)
        }
      }
      
      // For now, use the original text field as-is
      console.log('[toMessage V2 User] === USING ORIGINAL TEXT (NO RECONSTRUCTION) ===')
    }
    
    // Files are at top level in V2 format (uri field, not url)
    const files = msgFiles.length > 0
      ? msgFiles.map((p: any) => ({
          type: 'file' as const,
          mime: p.mime || 'application/octet-stream',
          name: p.name,
          url: p.uri || ''
        }))
      : undefined

    // Agent mentions are at top level in V2 format
    const agents = msgAgents.length > 0
      ? msgAgents.map((a: any) => ({
          type: 'agent' as const,
          name: a.name,
          source: a.source
        }))
      : undefined

    console.log('[toMessage V2 User] === FINAL RESULT ===')
    console.log('[toMessage V2 User]   content length:', text.length)
    console.log('[toMessage V2 User]   content:', JSON.stringify(text))
    console.log('[toMessage V2 User]   agents:', agents?.length || 0)
    console.log('[toMessage V2 User] ========================================')

    return {
      id: msg.id,
      role: 'user',
      content: text,
      timestamp: new Date(msg.time.created),
      ...(files && files.length > 0 ? { files } : {}),
      ...(agents && agents.length > 0 ? { agents } : {}),
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
        const filePart: any = {
          type: 'file',
          url: p.url!,
          filename: p.filename,
          mime: p.mime || 'text/plain'
        }
        // Backend expects: source: { type: "file", path: string, text: { value, start, end } }
        if (p.source?.text && typeof p.source.text === 'object' &&
            'start' in p.source.text && 'end' in p.source.text && 'value' in p.source.text) {
          filePart.source = {
            type: p.source.type || 'file',
            path: p.source.path || '',
            text: {
              value: p.source.text.value,
              start: p.source.text.start,
              end: p.source.text.end
            }
          }
        }
        return filePart
      }
      if (p.type === 'agent') {
        const agentPart: any = {
          type: 'agent',
          name: p.name!
        }
        // Backend expects: source: { value, start, end }
        if (p.source && 'value' in p.source && 'start' in p.source && 'end' in p.source) {
          agentPart.source = {
            value: p.source.value,
            start: p.source.start,
            end: p.source.end
          }
        }
        return agentPart
      }
      return { type: 'tool_result', toolResult: p.toolResult }
    })

    // 构建 prompt payload，包含 model 和 agent
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
        const eventType = e?.type as string | undefined
        if (eventType) {
          console.log('[SSE MAIN #' + eventCount + '] type:', eventType, 'keys:', Object.keys(e).slice(0, 5))
          // Log first event structure in detail
          if (!loggedFirstEvent) {
            console.log('[SSE MAIN] First event structure:', JSON.stringify(e, null, 2).slice(0, 500))
            loggedFirstEvent = true
          }
          // Log session events with more detail
          if (eventType.startsWith('session.next.')) {
            console.log('[SSE MAIN] SESSION EVENT:', JSON.stringify(e).slice(0, 300))
          }
        }
        if (!event.sender.isDestroyed()) {
          event.sender.send(CHANNELS.SESSION_STREAM_EVENT, {
            sessionID,
            event: evt
          })
        } else {
          console.log('[SSE MAIN] WebContents destroyed, stopping stream for', sessionID)
          return false
        }
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

  ipcMain.handle(CHANNELS.SESSION_REVERT, async (_event, sessionID: string, messageID: string, directory?: string) => {
    return await backend.session.revert(sessionID, messageID, directory)
  })

  ipcMain.handle(CHANNELS.SESSION_UNREVERT, async (_event, sessionID: string, directory?: string) => {
    return await backend.session.unrevert(sessionID, directory)
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

  // Question reply
  ipcMain.handle(CHANNELS.SESSION_QUESTION_REPLY, async (_, requestID: string, answers?: string[][], directory?: string) => {
    await backend.session.questionReply(requestID, answers, directory)
  })

  // Question reject
  ipcMain.handle(CHANNELS.SESSION_QUESTION_REJECT, async (_, requestID: string, directory?: string) => {
    await backend.session.questionReject(requestID, directory)
  })
}

export function startSessionStream(sessionID: string, webContents: Electron.WebContents) {
  if (!sessionStreams.has(sessionID)) {
    const unsubscribe = backend.session.events(sessionID, (event: unknown) => {
      // Check if webContents is still alive
      if (webContents.isDestroyed()) {
        console.log('[SSE] WebContents destroyed, stopping stream for', sessionID)
        stopSessionStream(sessionID)
        return
      }
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