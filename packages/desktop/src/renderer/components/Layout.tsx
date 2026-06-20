import { ReactNode, useState } from 'react'
import TitleBar from './TitleBar'

interface LayoutProps {
  children: ReactNode
  isConnected?: boolean
  model?: string
  onModelChange?: (model: string) => void
}

// Sidebar placeholder - will be implemented in next task
const SidebarPlaceholder = ({ collapsed }: { collapsed: boolean }) => (
  <aside
    className={`
      bg-gray-800 border-r border-gray-700 transition-all duration-300 overflow-hidden
      ${collapsed ? 'w-0' : 'w-64'}
    `}
  >
    <div className="w-64 h-full flex flex-col">
      <div className="p-3 border-b border-gray-700">
        <h2 className="text-sm font-medium text-gray-200">Sidebar</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-gray-400 text-sm p-2">
          Sidebar content placeholder
        </div>
      </div>
    </div>
  </aside>
)

export default function Layout({
  children,
  isConnected = false,
  model,
  onModelChange
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const connectionStatus = isConnected ? 'connected' : 'disconnected'

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 overflow-hidden">
      <TitleBar
        title="OpenCode Desktop"
        connectionStatus={connectionStatus}
        selectedModel={model}
        onModelChange={onModelChange}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        <SidebarPlaceholder collapsed={!sidebarOpen} />

        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}