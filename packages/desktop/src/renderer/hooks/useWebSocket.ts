import { useState, useEffect, useCallback, useRef } from 'react'
import { WebSocketClient } from '../api/client'
import type { WSMessage, WSRequest } from '../api/protocol'

export interface UseWebSocketReturn {
  client: WebSocketClient | null
  isConnected: boolean
  sendMessage: (request: WSRequest) => void
  error: Error | null
}

export function useWebSocket(port: number | null): UseWebSocketReturn {
  const [client, setClient] = useState<WebSocketClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const messagesRef = useRef<WSMessage[]>([])
  
  useEffect(() => {
    if (!port) return
    
    const wsClient = new WebSocketClient()
    const url = `ws://localhost:${port}/api`
    
    wsClient.connect(url, {
      onConnect: () => {
        setIsConnected(true)
        setError(null)
      },
      onMessage: (message) => {
        messagesRef.current.push(message)
      },
      onError: (err) => {
        setError(err)
        setIsConnected(false)
      },
      onClose: () => {
        setIsConnected(false)
      }
    }).then(() => {
      setClient(wsClient)
    }).catch((err) => {
      setError(err)
    })
    
    return () => {
      wsClient.disconnect()
    }
  }, [port])
  
  const sendMessage = useCallback((request: WSRequest) => {
    if (client && isConnected) {
      client.send(request)
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [client, isConnected])
  
  return { client, isConnected, sendMessage, error }
}