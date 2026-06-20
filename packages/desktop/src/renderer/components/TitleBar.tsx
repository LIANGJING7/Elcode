import { useState } from 'react'

interface TitleBarProps {
  title?: string
  connectionStatus?: 'connected' | 'disconnected' | 'connecting'
  selectedModel?: string
  onModelChange?: (model: string) => void
  models?: string[]
  onMenuClick?: () => void
}

export default function TitleBar({
  title = 'OpenCode Desktop',
  connectionStatus = 'disconnected',
  selectedModel,
  onModelChange,
  models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3'],
  onMenuClick
}: TitleBarProps) {
  const [showModelMenu, setShowModelMenu] = useState(false)

  const statusColors = {
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
    connecting: 'bg-yellow-500 animate-pulse'
  }

  const statusLabels = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    connecting: 'Connecting...'
  }

  return (
    <div className="h-12 bg-gray-800 flex items-center justify-between px-4 border-b border-gray-700 select-none">
      <div className="flex items-center gap-3">
        {/* Hamburger menu button */}
        <button
          onClick={onMenuClick}
          className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <span className="text-gray-200 font-medium">{title}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200 transition-colors"
          >
            <span>{selectedModel || 'Select Model'}</span>
            <svg 
              className={`w-4 h-4 transition-transform ${showModelMenu ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showModelMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-gray-700 rounded-md shadow-lg border border-gray-600 py-1 z-50">
              {models.map((model) => (
                <button
                  key={model}
                  onClick={() => {
                    onModelChange?.(model)
                    setShowModelMenu(false)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    model === selectedModel 
                      ? 'text-white bg-gray-600' 
                      : 'text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColors[connectionStatus]}`} />
          <span className="text-xs text-gray-400">{statusLabels[connectionStatus]}</span>
        </div>
      </div>
    </div>
  )
}