import { useState, useCallback, useEffect, useRef } from 'react'
import type { Message, WSRequest, WSStreamEvent } from '../api/protocol'
import { useWebSocket } from './useWebSocket'

export interface UseMessagesReturn {
  messages: Message[]
  partialContent: string
  isLoading: boolean
  sendMessage: (content: string) => void
  loadHistory: () => void
  error: Error | null
}

export function useMessages(
  sessionId: string | null,
  port: number | null
): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [partialContent, setPartialContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { client, isConnected, sendMessage: wsSendMessage } = useWebSocket(port)

  // Track current partial message being streamed
  const partialMessageRef = useRef<{
    id: string
    content: string
  } | null>(null)

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!client) return

    const handleStreamEvent = (event: WSStreamEvent) => {
      // Only process events for our session
      if (sessionId && event.sessionId !== sessionId) return

      switch (event.event) {
        case 'partial': {
          // Accumulate partial content
          const content = event.data.content || ''
          setPartialContent((prev) => prev + content)

          // Track partial message ID if provided
          if (event.data.messageId) {
            partialMessageRef.current = {
              id: event.data.messageId,
              content: (partialMessageRef.current?.content || '') + content,
            }
          } else if (partialMessageRef.current) {
            partialMessageRef.current.content += content
          }
          break
        }

        case 'complete': {
          // Add complete message to array
          const messageId = event.data.messageId || `msg-${Date.now()}`
          const content = partialMessageRef.current?.content || partialContent
          const role = event.data.role || 'assistant'

          const completeMessage: Message = {
            id: messageId,
            role,
            content,
            timestamp: Date.now(),
            isPartial: false,
          }

          setMessages((prev) => [...prev, completeMessage])
          setPartialContent('')
          setIsLoading(false)
          partialMessageRef.current = null
          break
        }

        case 'error': {
          // Reset loading state on error
          setIsLoading(false)
          setPartialContent('')
          partialMessageRef.current = null
          setError(new Error('Stream error occurred'))
          break
        }

        case 'message': {
          // Full message received directly
          if (event.data.messageId && event.data.content) {
            const message: Message = {
              id: event.data.messageId,
              role: event.data.role || 'assistant',
              content: event.data.content,
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, message])
          }
          break
        }
      }
    }

    // Subscribe to WebSocket messages
    const originalOnMessage = client['options']?.onMessage
    client['options'] = {
      ...client['options'],
      onMessage: (message) => {
        originalOnMessage?.(message)
        if (message.type === 'stream') {
          handleStreamEvent(message)
        }
      },
    }

    return () => {
      // Restore original handler on cleanup
      if (originalOnMessage) {
        client['options'] = {
          ...client['options'],
          onMessage: originalOnMessage,
        }
      }
    }
  }, [client, sessionId, partialContent])

  // Send a user message
  const sendMessage = useCallback(
    (content: string) => {
      if (!sessionId || !isConnected) {
        console.warn('Cannot send message: no session or not connected')
        return
      }

      // Create user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      }

      // Add user message to array
      setMessages((prev) => [...prev, userMessage])

      // Reset partial state
      setPartialContent('')
      partialMessageRef.current = null
      setIsLoading(true)

      // Send request to backend
      const request: WSRequest = {
        type: 'request',
        id: `req-${Date.now()}`,
        route: 'session/message',
        payload: {
          sessionId,
          content,
        },
      }

      wsSendMessage(request)
    },
    [sessionId, isConnected, wsSendMessage]
  )

  // Load message history for current session
  const loadHistory = useCallback(() => {
    if (!sessionId || !isConnected) {
      console.warn('Cannot load history: no session or not connected')
      return
    }

    setIsLoading(true)

    const request: WSRequest = {
      type: 'request',
      id: `req-${Date.now()}`,
      route: 'session/history',
      payload: {
        sessionId,
      },
    }

    wsSendMessage(request)
  }, [sessionId, isConnected, wsSendMessage])

  // Reset state when session changes
  useEffect(() => {
    setMessages([])
    setPartialContent('')
    setIsLoading(false)
    setError(null)
    partialMessageRef.current = null
  }, [sessionId])

  return {
    messages,
    partialContent,
    isLoading,
    sendMessage,
    loadHistory,
    error,
  }
}