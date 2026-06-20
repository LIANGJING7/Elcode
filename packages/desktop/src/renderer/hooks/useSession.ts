import { useState, useCallback } from 'react'
import type { Session, WSRequest } from '../api/protocol'
import { useWebSocket } from './useWebSocket'

export interface UseSessionReturn {
  sessions: Session[]
  currentSessionId: string | null
  createSession: () => string
  selectSession: (sessionId: string) => void
  clearSession: (sessionId: string) => void
  isConnected: boolean
  error: Error | null
}

export function useSession(port: number | null): UseSessionReturn {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  const { isConnected, sendMessage, error } = useWebSocket(port)
  
  const createSession = useCallback(() => {
    const sessionId = crypto.randomUUID()
    const now = Date.now()
    
    const newSession: Session = {
      id: sessionId,
      createdAt: now,
      title: undefined
    }
    
    // Add to local state
    setSessions(prev => [...prev, newSession])
    setCurrentSessionId(sessionId)
    
    // Send WebSocket request
    const request: WSRequest = {
      type: 'request',
      id: crypto.randomUUID(),
      route: 'session/create',
      payload: { sessionId }
    }
    
    sendMessage(request)
    
    return sessionId
  }, [sendMessage])
  
  const selectSession = useCallback((sessionId: string) => {
    // Verify session exists locally
    const sessionExists = sessions.some(s => s.id === sessionId)
    if (sessionExists) {
      setCurrentSessionId(sessionId)
    } else {
      console.warn(`Session ${sessionId} does not exist`)
    }
  }, [sessions])
  
  const clearSession = useCallback((sessionId: string) => {
    // Remove from local state
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    
    // If clearing current session, reset currentSessionId
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null)
    }
    
    // Send WebSocket request
    const request: WSRequest = {
      type: 'request',
      id: crypto.randomUUID(),
      route: 'session/clear',
      payload: { sessionId }
    }
    
    sendMessage(request)
  }, [sendMessage, currentSessionId])
  
  return {
    sessions,
    currentSessionId,
    createSession,
    selectSession,
    clearSession,
    isConnected,
    error
  }
}