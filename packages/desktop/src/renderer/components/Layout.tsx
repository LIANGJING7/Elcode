import { ReactNode, useState } from 'react'
import TitleBar from './TitleBar'

interface LayoutProps {
  children: ReactNode
  title?: string
  connectionStatus?: 'connected' | 'disconnected' | 'connecting'
  selectedModel?: string
  onModelChange?: (model: string) => void
  models?: string[]
}

export default function Layout({
  children,
  title,
  connectionStatus = 'disconnected',
  selectedModel,
  onModelChange,
  models
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 overflow-hidden">
      <TitleBar
        title={title}
        connectionStatus={connectionStatus}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        models={models}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <aside 
          className={`
            bg-gray-800 border-r border-gray-700 transition-all duration-300 overflow-hidden
            ${sidebarOpen ? 'w-64' : 'w-0'}
          `}
        >
          <div className="w-64 h-full flex flex-col">
            <div className="p-3 border-b border-gray-700">
              <h2 className="text-sm font-medium text-gray-200">Sessions</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="text-gray-400 text-sm p-2">
                No sessions yet
              </div>
            </div>
          </div>
        </aside>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-14 z-10 bg-gray-700 hover:bg-gray-600 text-gray-300 p-1 rounded-r transition-colors"
          style={{ left: sidebarOpen ? '256px' : '0' }}
        >
          <svg 
            className={`w-4 h-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}