import { useState, useEffect, useCallback } from 'react'
import Layout from './components/Layout'
import { ChatView } from './components/ChatView'
import { useSession } from './hooks/useSession'
import { useMessages } from './hooks/useMessages'

// Global electronAPI type declaration
declare global {
  interface Window {
    electronAPI: {
      onBackendReady: (callback: (port: number) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}

export default function App() {
  // Backend port from IPC
  const [backendPort, setBackendPort] = useState<number | null>(null)
  const [backendError, setBackendError] = useState<Error | null>(null)
  
  // Session management
  const {
    sessions,
    currentSessionId,
    createSession,
    selectSession,
    clearSession,
    isConnected,
    error: sessionError
  } = useSession(backendPort)
  
  // Message management
  const {
    messages,
    partialContent,
    isLoading,
    sendMessage,
    error: messageError
  } = useMessages(backendPort, currentSessionId)
  
  // Combined error state
  const error = backendError || sessionError || messageError
  
  // Listen for backend ready event from main process
  useEffect(() => {
    window.electronAPI.onBackendReady((port: number) => {
      console.log('Backend ready on port:', port)
      setBackendPort(port)
    })
    
    // Cleanup listeners on unmount
    return () => {
      window.electronAPI.removeAllListeners('backend-ready')
    }
  }, [])
  
  // Auto-create first session when backend is ready and connected
  useEffect(() => {
    if (backendPort && isConnected && sessions.length === 0 && !currentSessionId) {
      console.log('Auto-creating first session')
      createSession()
    }
  }, [backendPort, isConnected, sessions.length, currentSessionId, createSession])
  
  // Handle sending a message
  const handleSendMessage = useCallback((content: string) => {
    if (currentSessionId) {
      sendMessage(currentSessionId, content)
    } else {
      console.warn('No active session to send message to')
    }
  }, [currentSessionId, sendMessage])
  
  // Loading state while waiting for backend
  if (!backendPort) {
    return (
      <Layout isConnected={false}>
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <div className="text-gray-400 text-lg">Starting backend...</div>
          </div>
        </div>
      </Layout>
    )
  }
  
  // Error state
  if (error) {
    return (
      <Layout isConnected={false}>
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 max-w-md">
            <div className="text-red-500 text-lg font-semibold">Error</div>
            <div className="text-gray-400 text-sm">{error.message}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    )
  }
  
  // No session selected (show welcome/empty state)
  if (!currentSessionId) {
    return (
      <Layout isConnected={isConnected}>
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-gray-400 text-lg">No active session</div>
            <button
              onClick={createSession}
              disabled={!isConnected}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              Start New Session
            </button>
          </div>
        </div>
      </Layout>
    )
  }
  
  // Main chat view with active session
  return (
    <Layout isConnected={isConnected}>
      <ChatView
        messages={messages}
        partialContent={partialContent ?? undefined}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
      />
    </Layout>
  )
}