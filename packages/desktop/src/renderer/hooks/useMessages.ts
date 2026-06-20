import { useState, useCallback, useRef, useEffect } from 'react'
import type { Message, WSRequest, WSStreamEvent } from '../api/protocol'
import { useWebSocket } from './useWebSocket'

export interface UseMessagesReturn {
  messages: Message[]
  partialContent: string | null
  isLoading: boolean
  sendMessage: (sessionId: string, content: string) => void
  error: Error | null
}

export function useMessages(port: number | null, sessionId: string | null): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [partialContent, setPartialContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const { client, isConnected, sendMessage: wsSendMessage } = useWebSocket(port)
  const pendingMessageRef = useRef<string | null>(null)
  
  // Handle WebSocket messages for this session
  useEffect(() => {
    if (!client || !sessionId) return
    
    const handleStreamEvent = (event: WSStreamEvent) => {
      if (event.sessionId !== sessionId) return
      
      switch (event.event) {
        case 'message':
          if (event.data.content && event.data.messageId && event.data.role) {
            const newMessage: Message = {
              id: event.data.messageId,
              role: event.data.role,
              content: event.data.content,
              timestamp: Date.now()
            }
            setMessages(prev => [...prev, newMessage])
            setIsLoading(false)
            setPartialContent(null)
          }
          break
        
        case 'partial':
          if (event.data.content) {
            setPartialContent(prev => (prev ?? '') + event.data.content)
            setIsLoading(true)
          }
          break
        
        case 'complete':
          setIsLoading(false)
          setPartialContent(null)
          break
        
        case 'error':
          setError(new Error(event.data.content || 'Unknown error'))
          setIsLoading(false)
          setPartialContent(null)
          break
      }
    }
    
    // Subscribe to WebSocket messages
    client.onMessage = (msg) => {
      if (msg.type === 'stream') {
        handleStreamEvent(msg)
      }
    }
    
    return () => {
      client.onMessage = undefined
    }
  }, [client, sessionId])
  
  // Clear messages when session changes
  useEffect(() => {
    if (sessionId) {
      setMessages([])
      setPartialContent(null)
      setIsLoading(false)
      setError(null)
    }
  }, [sessionId])
  
  const sendMessage = useCallback((targetSessionId: string, content: string) => {
    if (!isConnected || !targetSessionId) {
      console.warn('WebSocket not connected or no session selected')
      return
    }
    
    // Add user message to local state immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMessage])
    
    // Set loading state
    setIsLoading(true)
    
    // Send WebSocket request
    const request: WSRequest = {
      type: 'request',
      id: crypto.randomUUID(),
      route: 'chat/send',
      payload: {
        sessionId: targetSessionId,
        content: content
      }
    }
    
    wsSendMessage(request)
    pendingMessageRef.current = content
  }, [isConnected, wsSendMessage])
  
  return {
    messages,
    partialContent,
    isLoading,
    sendMessage,
    error
  }
}