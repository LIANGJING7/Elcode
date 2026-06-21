export class IPCError extends Error {
  constructor(
    message: string,
    public channel: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'IPCError'
  }
}

export async function safeInvoke<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new IPCError(message, context, error)
  }
}

export const ipc = {
  session: {
    create: (workspacePath: string) =>
      safeInvoke(() => window.desktop.session.create(workspacePath), 'session:create'),
    
    sendMessage: (sessionId: string, content: string) =>
      safeInvoke(() => window.desktop.session.sendMessage(sessionId, content), 'session:sendMessage'),
    
    list: () =>
      safeInvoke(() => window.desktop.session.list(), 'session:list'),
    
    delete: (sessionId: string) =>
      safeInvoke(() => window.desktop.session.delete(sessionId), 'session:delete')
  },
  
  file: {
    read: (filePath: string) =>
      safeInvoke(() => window.desktop.file.read(filePath), 'file:read'),
    
    write: (filePath: string, content: string) =>
      safeInvoke(() => window.desktop.file.write(filePath, content), 'file:write')
  },
  
  tool: {
    list: () =>
      safeInvoke(() => window.desktop.tool.list(), 'tool:list')
  },
  
  config: {
    get: (key: string) =>
      safeInvoke(() => window.desktop.config.get(key), 'config:get'),
    
    set: (key: string, value: unknown) =>
      safeInvoke(() => window.desktop.config.set(key, value), 'config:set')
  }
}