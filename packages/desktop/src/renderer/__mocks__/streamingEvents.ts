/**
 * Mock SSE Event Generator
 * 
 * For testing streaming functionality without backend.
 */

import type { StreamAction } from '../stores/streaming/types'

// ============================================
// Mock Event Types
// ============================================

interface MockEventConfig {
  version: number
  messageId?: string
  delay?: number  // ms between events
}

// ============================================
// Event Generators
// ============================================

/**
 * Create text stream events
 */
export function mockTextStream(
  parts: string[],
  config: MockEventConfig
): StreamAction[] {
  const messageId = config.messageId ?? 'msg-1'
  const events: StreamAction[] = []
  let fullText = ''

  // TEXT_STARTED
  events.push({
    type: 'TEXT_STARTED',
    textId: 'text-1',
    messageId,
    version: config.version
  })

  // TEXT_DELTA for each part
  for (const part of parts) {
    fullText += part
    events.push({
      type: 'TEXT_DELTA',
      delta: part,
      messageId,
      version: config.version
    })
  }

  // TEXT_ENDED
  events.push({
    type: 'TEXT_ENDED',
    text: fullText,
    textId: 'text-1',
    messageId,
    version: config.version
  })

  return events
}

/**
 * Create reasoning events
 */
export function mockReasoningStream(
  content: string,
  config: MockEventConfig
): StreamAction[] {
  const messageId = config.messageId ?? 'msg-1'
  const events: StreamAction[] = []

  // REASONING_STARTED
  events.push({
    type: 'REASONING_STARTED',
    reasoningId: 'reasoning-1',
    messageId,
    version: config.version
  })

  // REASONING_DELTA (split into chunks)
  const chunks = splitIntoChunks(content, 20)
  for (const chunk of chunks) {
    events.push({
      type: 'REASONING_DELTA',
      delta: chunk,
      messageId,
      version: config.version
    })
  }

  // REASONING_ENDED
  events.push({
    type: 'REASONING_ENDED',
    text: content,
    reasoningId: 'reasoning-1',
    messageId,
    version: config.version
  })

  return events
}

/**
 * Create tool call events
 */
export function mockToolCall(
  name: string,
  args: Record<string, unknown>,
  config: MockEventConfig,
  options?: {
    progress?: string[]
    output?: unknown
    error?: string
  }
): StreamAction[] {
  const messageId = config.messageId ?? 'msg-1'
  const callId = `call-${name}-${Date.now()}`
  const events: StreamAction[] = []
  const inputJson = JSON.stringify(args)

  // TOOL_INPUT_STARTED
  events.push({
    type: 'TOOL_INPUT_STARTED',
    callId,
    name,
    messageId,
    version: config.version
  })

  // TOOL_INPUT_DELTA (split input)
  const inputChunks = splitIntoChunks(inputJson, 30)
  for (const chunk of inputChunks) {
    events.push({
      type: 'TOOL_INPUT_DELTA',
      callId,
      delta: chunk,
      version: config.version
    })
  }

  // TOOL_INPUT_ENDED
  events.push({
    type: 'TOOL_INPUT_ENDED',
    callId,
    text: inputJson,
    version: config.version
  })

  // TOOL_CALLED
  events.push({
    type: 'TOOL_CALLED',
    callId,
    input: args,
    messageId,
    version: config.version
  })

  // TOOL_PROGRESS (if provided)
  if (options?.progress) {
    for (const msg of options.progress) {
      events.push({
        type: 'TOOL_PROGRESS',
        callId,
        content: [{ type: 'text', message: msg }],
        version: config.version
      })
    }
  }

  // TOOL_SUCCESS or TOOL_FAILED
  if (options?.error) {
    events.push({
      type: 'TOOL_FAILED',
      callId,
      error: { type: 'unknown', message: options.error },
      version: config.version
    })
  } else {
    events.push({
      type: 'TOOL_SUCCESS',
      callId,
      output: options?.output ?? { success: true },
      version: config.version
    })
  }

  return events
}

/**
 * Create concurrent tool calls
 */
export function mockConcurrentTools(
  tools: Array<{ name: string; args: Record<string, unknown>; delay?: number }>,
  config: MockEventConfig
): StreamAction[] {
  const allEvents: StreamAction[] = []
  
  for (const tool of tools) {
    const toolEvents = mockToolCall(tool.name, tool.args, config)
    allEvents.push(...toolEvents)
  }

  return allEvents
}

/**
 * Create complete stream scenario
 */
export function mockCompleteStream(
  config: MockEventConfig & {
    reasoning?: string
    tools?: Array<{ name: string; args: Record<string, unknown>; progress?: string[] }>
    textParts?: string[]
  }
): StreamAction[] {
  const events: StreamAction[] = []
  const messageId = config.messageId ?? 'msg-1'

  // STREAM_START
  events.push({
    type: 'STREAM_START',
    messageId,
    version: config.version
  })

  // Reasoning
  if (config.reasoning) {
    events.push(...mockReasoningStream(config.reasoning, { version: config.version, messageId }))
  }

  // Tools
  if (config.tools) {
    for (const tool of config.tools) {
      events.push(...mockToolCall(tool.name, tool.args, config, { progress: tool.progress }))
    }
  }

  // Text
  if (config.textParts) {
    events.push(...mockTextStream(config.textParts, { version: config.version, messageId }))
  }

  // STEP_ENDED
  events.push({
    type: 'STEP_ENDED',
    version: config.version
  })

  return events
}

// ============================================
// Mock SSE Player
// ============================================

interface MockPlayerOptions {
  onEvent: (event: StreamAction) => void
  interval?: number  // ms between events
}

/**
 * Create a mock SSE player that emits events over time
 */
export function createMockPlayer(options: MockPlayerOptions) {
  const interval = options.interval ?? 100
  let playing = false
  let currentIndex = 0
  let events: StreamAction[] = []
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return {
    load(newEvents: StreamAction[]) {
      events = newEvents
      currentIndex = 0
    },

    play() {
      if (playing || events.length === 0) return
      playing = true

      function emitNext() {
        if (currentIndex >= events.length) {
          playing = false
          return
        }

        options.onEvent(events[currentIndex])
        currentIndex++

        timeoutId = setTimeout(emitNext, interval)
      }

      emitNext()
    },

    pause() {
      playing = false
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    },

    stop() {
      this.pause()
      currentIndex = 0
    },

    isPlaying() {
      return playing
    }
  }
}

// ============================================
// Helpers
// ============================================

function splitIntoChunks(str: string, chunkSize: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, i + chunkSize))
  }
  return chunks
}

// ============================================
// Predefined Scenarios
// ============================================

export const scenarios = {
  simpleText: (version: number = 1) => 
    mockCompleteStream({
      version,
      textParts: ['Hello', ' world', '! This is a ', 'test message.']
    }),

  withReasoning: (version: number = 1) =>
    mockCompleteStream({
      version,
      reasoning: 'Analyzing the request and preparing response...',
      textParts: ['Based on my analysis', ', here is the answer.']
    }),

  withToolCall: (version: number = 1) =>
    mockCompleteStream({
      version,
      tools: [
        { name: 'read', args: { filePath: '/src/index.ts' } }
      ],
      textParts: ['I read the file', ' and found the issue.']
    }),

  withProgress: (version: number = 1) =>
    mockCompleteStream({
      version,
      tools: [
        { 
          name: 'bash', 
          args: { command: 'npm install' },
          progress: ['Installing dependencies...', 'Downloading packages...', 'Done!']
        }
      ],
      textParts: ['Installation completed', ' successfully.']
    }),

  withError: (version: number = 1) =>
    mockCompleteStream({
      version,
      tools: [
        { name: 'grep', args: { pattern: 'nonexistent' } }
      ],
      textParts: ['The search', ' failed.']
    }),

  concurrentTools: (version: number = 1) =>
    mockCompleteStream({
      version,
      tools: [
        { name: 'read', args: { filePath: '/src/a.ts' } },
        { name: 'read', args: { filePath: '/src/b.ts' } },
        { name: 'grep', args: { pattern: 'export' } }
      ],
      textParts: ['I analyzed', ' multiple files.']
    })
}