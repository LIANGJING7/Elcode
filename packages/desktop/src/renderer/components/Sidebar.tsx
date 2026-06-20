import { useState } from 'react'
import { Session, FileInfo } from '../api/protocol'

interface SidebarProps {
  sessions: Session[]
  files: FileInfo[]
  currentSessionId: string | null
  onSessionSelect: (sessionId: string) => void
  onSessionCreate: () => void
  onFileSelect: (path: string) => void
}

export function Sidebar({
  sessions,
  files,
  currentSessionId,
  onSessionSelect,
  onSessionCreate,
  onFileSelect,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'sessions' | 'files'>('sessions')

  const width = collapsed ? 'w-12' : 'w-64'

  return (
    <aside className={`${width} bg-gray-800 flex flex-col transition-all duration-200`}>
      <header className="flex items-center justify-between p-2 border-b border-gray-700">
        {!collapsed && (
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-2 py-1 text-sm rounded ${
                activeTab === 'sessions' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sessions
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-2 py-1 text-sm rounded ${
                activeTab === 'files' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Files
            </button>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-gray-400 hover:text-white"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </header>

      {!collapsed && (
        <div className="flex-1 overflow-auto">
          {activeTab === 'sessions' && (
            <div className="p-2">
              <button
                onClick={onSessionCreate}
                className="w-full px-3 py-2 mb-2 text-sm text-left bg-gray-700 hover:bg-gray-600 rounded text-white"
              >
                + New Session
              </button>
              <ul className="space-y-1">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <button
                      onClick={() => onSessionSelect(session.id)}
                      className={`w-full px-3 py-2 text-sm text-left rounded truncate ${
                        currentSessionId === session.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {session.title || `Session ${session.id.slice(0, 8)}`}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'files' && (
            <ul className="p-2 space-y-1">
              {files.map((file, index) => (
                <li key={`${file.path}-${index}`}>
                  <button
                    onClick={() => onFileSelect(file.path)}
                    className="w-full px-3 py-1 text-sm text-left text-gray-300 hover:bg-gray-700 rounded truncate flex items-center gap-2"
                  >
                    <span className="text-gray-500">{file.type === 'directory' ? '📁' : '📄'}</span>
                    {file.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {collapsed && (
        <div className="flex-1 flex flex-col items-center py-2 space-y-2">
          <button
            onClick={() => {
              setCollapsed(false)
              setActiveTab('sessions')
            }}
            className={`p-2 rounded ${
              activeTab === 'sessions' && !collapsed ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
            title="Sessions"
          >
            💬
          </button>
          <button
            onClick={() => {
              setCollapsed(false)
              setActiveTab('files')
            }}
            className={`p-2 rounded ${
              activeTab === 'files' && !collapsed ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
            title="Files"
          >
            📁
          </button>
          <button
            onClick={onSessionCreate}
            className="p-2 text-gray-400 hover:text-white"
            title="New Session"
          >
            +
          </button>
        </div>
      )}
    </aside>
  )
}