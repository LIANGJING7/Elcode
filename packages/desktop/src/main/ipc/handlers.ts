import { ipcMain } from 'electron'
import { CHANNELS, isValidChannel } from './channels'
import type { Session, Message, Conversation } from '../../types/ipc'

const sessions = new Map<string, Session>()
const conversations = new Map<string, Conversation>()

export function registerIPCHandlers() {
  ipcMain.handle(CHANNELS.SESSION_CREATE, async (_event, workspacePath: string) => {
    const sessionId = `session-${Date.now()}`
    const session: Session = {
      id: sessionId,
      workspacePath,
      createdAt: new Date()
    }
    sessions.set(sessionId, session)
    
    const conversation: Conversation = {
      id: sessionId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    conversations.set(sessionId, conversation)
    
    return sessionId
  })

  ipcMain.handle(CHANNELS.SESSION_LIST, async () => {
    return Array.from(conversations.values())
  })

  ipcMain.handle(CHANNELS.SESSION_DELETE, async (_event, sessionId: string) => {
    sessions.delete(sessionId)
    conversations.delete(sessionId)
    return true
  })

  ipcMain.handle(CHANNELS.SESSION_SEND_MESSAGE, async (event, sessionId: string, content: string) => {
    const conversation = conversations.get(sessionId)
    if (!conversation) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content,
      timestamp: new Date()
    }
    conversation.messages.push(userMessage)

    const assistantMessage: Message = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: `Received: "${content}". This is a placeholder response.`,
      timestamp: new Date()
    }
    conversation.messages.push(assistantMessage)
    conversation.updatedAt = new Date()

    event.sender.send(CHANNELS.SESSION_STREAM_DATA, {
      sessionId,
      message: assistantMessage
    })

    event.sender.send(CHANNELS.SESSION_STREAM_END, { sessionId })

    return true
  })

  ipcMain.handle(CHANNELS.FILE_READ, async (_event, filePath: string) => {
    return `File content placeholder for: ${filePath}`
  })

  ipcMain.handle(CHANNELS.FILE_WRITE, async (_event, filePath: string, content: string) => {
    console.log(`Write stub: ${filePath} -> ${content.length} chars`)
    return true
  })

  ipcMain.handle(CHANNELS.TOOL_LIST, async () => {
    return [
      { name: 'read_file', description: 'Read file contents' },
      { name: 'write_file', description: 'Write to file' },
      { name: 'execute_command', description: 'Run shell command' }
    ]
  })

  ipcMain.handle(CHANNELS.CONFIG_GET, async (_event, key: string) => {
    return null
  })

  ipcMain.handle(CHANNELS.CONFIG_SET, async (_event, key: string, value: unknown) => {
    console.log(`Config stub: ${key} = ${value}`)
    return true
  })
}

ipcMain.on('ipc-request', (event, channel: string) => {
  if (!isValidChannel(channel)) {
    console.error(`Blocked unauthorized IPC channel: ${channel}`)
    event.reply('ipc-error', { channel, error: 'Unauthorized channel' })
  }
})