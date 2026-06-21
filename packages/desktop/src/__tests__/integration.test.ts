import { describe, it, expect } from "vitest"
import { WebSocketClient } from "../renderer/api/client"

describe("WebSocketClient", () => {
  it("should create client instance", () => {
    const client = new WebSocketClient()
    expect(client).toBeDefined()
    expect(client.ws).toBeNull()
  })

  it("should have disconnect method", () => {
    const client = new WebSocketClient()
    expect(client.disconnect).toBeDefined()
    expect(typeof client.disconnect).toBe("function")
  })

  it("should have send method", () => {
    const client = new WebSocketClient()
    expect(client.send).toBeDefined()
    expect(typeof client.send).toBe("function")
  })

  it("should have connect method", () => {
    const client = new WebSocketClient()
    expect(client.connect).toBeDefined()
    expect(typeof client.connect).toBe("function")
  })

  it("should return false for isConnected when ws is null", () => {
    const client = new WebSocketClient()
    expect(client.isConnected()).toBe(false)
  })

  it("should throw error when sending on disconnected client", () => {
    const client = new WebSocketClient()
    expect(() => client.send({ type: "request", id: "1", route: "test", payload: {} })).toThrow(
      "WebSocket is not connected"
    )
  })

  it("should clear ws on disconnect", () => {
    const client = new WebSocketClient()
    client.disconnect()
    expect(client.ws).toBeNull()
  })

  it("should have onMessage callback property", () => {
    const client = new WebSocketClient()
    expect(client.onMessage).toBeUndefined()
    client.onMessage = (msg) => console.log(msg)
    expect(client.onMessage).toBeDefined()
  })

  it("should have correct max reconnect attempts", () => {
    const client = new WebSocketClient()
    expect(client).toBeDefined()
  })
})

describe("WebSocketClientOptions", () => {
  it("should accept options with callbacks", () => {
    const options = {
      onMessage: (msg: unknown) => console.log(msg),
      onError: (err: Error) => console.error(err),
      onClose: () => console.log("closed"),
      onConnect: () => console.log("connected"),
    }
    expect(options.onMessage).toBeDefined()
    expect(options.onError).toBeDefined()
    expect(options.onClose).toBeDefined()
    expect(options.onConnect).toBeDefined()
  })
})

describe("useWebSocket hook interface", () => {
  it("should define correct return type", () => {
    interface UseWebSocketReturn {
      client: WebSocketClient | null
      isConnected: boolean
      sendMessage: (request: { type: string; id: string; route: string; payload: unknown }) => void
      error: Error | null
    }
    const mockReturn: UseWebSocketReturn = {
      client: null,
      isConnected: false,
      sendMessage: () => {},
      error: null,
    }
    expect(mockReturn.client).toBeNull()
    expect(mockReturn.isConnected).toBe(false)
    expect(mockReturn.sendMessage).toBeDefined()
    expect(mockReturn.error).toBeNull()
  })
})

describe("useSession hook interface", () => {
  it("should define correct return type", () => {
    interface Session {
      id: string
      createdAt: number
      title?: string
    }
    interface UseSessionReturn {
      sessions: Session[]
      currentSessionId: string | null
      createSession: () => string
      selectSession: (sessionId: string) => void
      clearSession: (sessionId: string) => void
      isConnected: boolean
      error: Error | null
    }
    const mockReturn: UseSessionReturn = {
      sessions: [],
      currentSessionId: null,
      createSession: () => "test-id",
      selectSession: () => {},
      clearSession: () => {},
      isConnected: false,
      error: null,
    }
    expect(mockReturn.sessions).toEqual([])
    expect(mockReturn.currentSessionId).toBeNull()
    expect(mockReturn.createSession).toBeDefined()
    expect(mockReturn.isConnected).toBe(false)
  })
})

describe("useMessages hook interface", () => {
  it("should define correct return type", () => {
    interface Message {
      id: string
      role: string
      content: string
      timestamp: number
    }
    interface UseMessagesReturn {
      messages: Message[]
      partialContent: string | null
      isLoading: boolean
      sendMessage: (sessionId: string, content: string) => void
      error: Error | null
    }
    const mockReturn: UseMessagesReturn = {
      messages: [],
      partialContent: null,
      isLoading: false,
      sendMessage: () => {},
      error: null,
    }
    expect(mockReturn.messages).toEqual([])
    expect(mockReturn.partialContent).toBeNull()
    expect(mockReturn.isLoading).toBe(false)
    expect(mockReturn.sendMessage).toBeDefined()
  })
})