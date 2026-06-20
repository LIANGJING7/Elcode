import { useState } from 'react'

interface TitleBarProps {
  model?: string
  onModelChange?: (model: string) => void
  onMenuClick?: () => void
}

export default function TitleBar({
  model,
  onModelChange,
  onMenuClick
}: TitleBarProps) {
  const [showModelMenu, setShowModelMenu] = useState(false)

  const models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3']

  return (
    <div className="h-12 bg-gray-800 flex items-center justify-between px-4 border-b border-gray-700 select-none">
      {/* Left: menu button + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Menu"
        >
          {/* Hamburger SVG */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <span className="text-gray-200 font-medium">OpenCode Desktop</span>
      </div>

      {/* Right: model dropdown + connection indicator */}
      <div className="flex items-center gap-4">
        {/* Model dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200 transition-colors"
          >
            <span>{model || 'Select Model'}</span>
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
              {models.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    onModelChange?.(m)
                    setShowModelMenu(false)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    m === model
                      ? 'text-white bg-gray-600'
                      : 'text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Connection indicator: w-2 h-2 green-500 dot */}
        <div className="w-2 h-2 rounded-full bg-green-500" title="Connected" />
      </div>
    </div>
  )
}