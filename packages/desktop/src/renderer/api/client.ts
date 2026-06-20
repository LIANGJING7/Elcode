import type { WSRequest, WSMessage } from './protocol'

export interface WebSocketClientOptions {
  onMessage?: (message: WSMessage) => void
  onError?: (error: Error) => void
  onClose?: () => void
  onConnect?: () => void
}

export class WebSocketClient {
  ws: WebSocket | null = null
  private options: WebSocketClientOptions = {}
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  
  // Allow dynamic onMessage callback
  onMessage?: (message: WSMessage) => void

  async connect(url: string, options?: WebSocketClientOptions): Promise<void> {
    this.options = options || {}

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url)

      this.ws.addEventListener('open', () => {
        this.reconnectAttempts = 0
        this.options.onConnect?.()
        resolve()
      })

      this.ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage
          this.options.onMessage?.(message)
          this.onMessage?.(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      })

      this.ws.addEventListener('error', () => {
        const error = new Error('WebSocket connection error')
        this.options.onError?.(error)
        reject(error)
      })

      this.ws.addEventListener('close', () => {
        this.options.onClose?.()
        this.attemptReconnect(url)
      })
    })
  }

  private attemptReconnect(url: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        this.connect(url, this.options).catch(console.error)
      }, 1000 * this.reconnectAttempts)
    }
  }

  send(request: WSRequest) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(request))
    } else {
      throw new Error('WebSocket is not connected')
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}