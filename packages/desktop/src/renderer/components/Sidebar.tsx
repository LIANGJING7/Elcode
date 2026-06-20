import { useState } from 'react'
import { Session, FileInfo } from '../api/protocol'

// SVG Icons for files
const FolderIcon = () => (
  <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
)

const FileIcon = () => (
  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

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
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </header>

      {!collapsed && (
        <div className="flex-1 overflow-auto">
          {activeTab === 'sessions' && (
            <div className="p-2">
              <button
                onClick={onSessionCreate}
                className="w-full px-3 py-2 mb-2 text-sm text-left bg-gray-700 hover:bg-gray-600 rounded text-white flex items-center gap-2"
              >
                <PlusIcon />
                New Session
              </button>
              <ul className="space-y-1">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <button
                      onClick={() => onSessionSelect(session.id)}
                      className={`w-full px-3 py-2 text-sm text-left rounded truncate ${
                        currentSessionId === session.id
                          ? 'bg-gray-700 text-white'
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
                    {file.type === 'directory' ? <FolderIcon /> : <FileIcon />}
                    <span className="truncate">{file.name}</span>
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          <button
            onClick={onSessionCreate}
            className="p-2 text-gray-400 hover:text-white"
            title="New Session"
          >
            <PlusIcon />
          </button>
        </div>
      )}
    </aside>
  )
}