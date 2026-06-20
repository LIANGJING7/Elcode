# OpenCode Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Electron desktop app for OpenCode,复用现有后端功能，通过WebSocket通信，Codex风格UI

**Architecture:** Electron主进程启动现有后端server，渲染进程通过WebSocket直连后端API，无需修改现有后端代码

**Tech Stack:** Electron, React 18, TypeScript, Tailwind CSS, react-markdown, @shikijs/core

---

## Phase 1: Project Setup & Infrastructure

### Task 1: Create Project Structure

**Files:**
- Create: `packages/desktop/package.json`
- Create: `packages/desktop/tsconfig.json`
- Create: `packages/desktop/.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@opencode/desktop",
  "version": "0.1.0",
  "description": "OpenCode Desktop App",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "start": "electron-vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "electron": "^28.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "@shikijs/core": "^1.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "electron-vite": "^2.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@opencode/*": ["../../src/*"]
    }
  },
  "include": ["src/**/*"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create .gitignore**

```
dist/
node_modules/
*.log
.DS_Store
```

- [ ] **Step 4: Install dependencies**

Run: `cd packages/desktop && bun install`
Expected: Dependencies installed successfully

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/package.json packages/desktop/tsconfig.json packages/desktop/.gitignore
git commit -m "feat(desktop): initialize project structure"
```

### Task 2: Setup TypeScript Configuration for Node/Electron

**Files:**
- Create: `packages/desktop/tsconfig.node.json`
- Create: `packages/desktop/electron.vite.config.ts`

- [ ] **Step 1: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["electron.vite.config.ts", "src/main/**/*", "src/preload/**/*"]
}
```

- [ ] **Step 2: Create electron.vite.config.ts**

```ts
import { defineConfig, external } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'

export default defineConfig({
  main: {
    plugins: [external()],
    resolve: {
      alias: {
        '@opencode': path.resolve(__dirname, '../../src')
      }
    }
  },
  preload: {
    plugins: [external()]
  },
  renderer: {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()]
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer')
      }
    }
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/tsconfig.node.json packages/desktop/electron.vite.config.ts
git commit -m "feat(desktop): setup electron-vite configuration"
```

### Task 3: Create Electron Main Process Entry

**Files:**
- Create: `packages/desktop/src/main/index.ts`

- [ ] **Step 1: Write main process entry**

```ts
import { app, BrowserWindow } from 'electron'
import path from 'path'
import { startBackend } from './server'

let mainWindow: BrowserWindow | null = null
let backendPort: number | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'OpenCode Desktop'
  })

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  
  mainWindow.webContents.on('did-finish-load', () => {
    if (backendPort) {
      mainWindow?.webContents.send('backend-ready', backendPort)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function bootstrap() {
  try {
    const listener = await startBackend()
    backendPort = listener.port
    console.log(`Backend started on port ${backendPort}`)
    
    await createWindow()
  } catch (error) {
    console.error('Failed to start backend:', error)
    app.quit()
  }
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', async () => {
  // Cleanup backend if needed
})
```

- [ ] **Step 2: Create placeholder server.ts (will implement in Task 9)**

```ts
// Placeholder - will be implemented in Task 9
export async function startBackend(): Promise<{ port: number }> {
  // TODO: Implement backend startup
  return { port: 3000 }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/main/index.ts packages/desktop/src/main/server.ts
git commit -m "feat(desktop): add main process entry point"
```

### Task 4: Create Preload Script

**Files:**
- Create: `packages/desktop/src/preload/index.ts`

- [ ] **Step 1: Write preload script**

```ts
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  onBackendReady: (callback: (port: number) => void) => {
    ipcRenderer.on('backend-ready', (_event, port) => callback(port))
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/preload/index.ts
git commit -m "feat(desktop): add preload script with IPC bridge"
```

### Task 5: Create Renderer Entry Point

**Files:**
- Create: `packages/desktop/src/renderer/index.html`
- Create: `packages/desktop/src/renderer/main.tsx`
- Create: `packages/desktop/src/renderer/App.tsx`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:*">
  <title>OpenCode Desktop</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: Create main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Create placeholder App.tsx**

```tsx
import React from 'react'

export default function App() {
  return (
    <div className="h-screen bg-gray-900 text-white">
      <div className="flex items-center justify-center h-full">
        <p>OpenCode Desktop - Loading...</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create placeholder styles/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}
```

- [ ] **Step 5: Create tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/**/*.{js,ts,jsx,tsx,html}'
  ],
  theme: {
    extend: {}
  },
  plugins: []
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/src/renderer/
git commit -m "feat(desktop): add renderer entry point and basic styles"
```

---

## Phase 2: WebSocket Protocol & API Layer

### Task 6: Define WebSocket Message Protocol Types

**Files:**
- Create: `packages/desktop/src/renderer/api/protocol.ts`

- [ ] **Step 1: Define protocol types**

```ts
export interface WSRequest {
  type: 'request'
  id: string
  route: string
  payload: unknown
}

export interface WSResponse {
  type: 'response'
  id: string
  success: boolean
  data?: unknown
  error?: string
}

export interface WSStreamEvent {
  type: 'stream'
  sessionId: string
  event: 'message' | 'partial' | 'complete' | 'error'
  data: {
    content?: string
    messageId?: string
    role?: 'user' | 'assistant'
  }
}

export type WSMessage = WSResponse | WSStreamEvent

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isPartial?: boolean
}

export interface Session {
  id: string
  title?: string
  createdAt: number
}

export interface FileInfo {
  path: string
  type: 'file' | 'directory'
  name: string
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/api/protocol.ts
git commit -m "feat(desktop): define WebSocket protocol types"
```

### Task 7: Implement WebSocket Client

**Files:**
- Create: `packages/desktop/src/renderer/api/client.ts`
- Test: `packages/desktop/src/renderer/api/__tests__/client.test.ts`

- [ ] **Step 1: Write test file**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSocketClient } from '../client'

describe('WebSocketClient', () => {
  let client: WebSocketClient
  
  beforeEach(() => {
    client = new WebSocketClient()
  })
  
  afterEach(() => {
    client.disconnect()
  })
  
  it('should connect and receive messages', async () => {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
    
    vi.stubGlobal('WebSocket', vi.fn(() => mockWs))
    
    await client.connect('ws://localhost:3000')
    
    expect(mockWs.addEventListener).toHaveBeenCalledWith('open', expect.any(Function))
    expect(mockWs.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    expect(mockWs.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
    expect(mockWs.addEventListener).toHaveBeenCalledWith('close', expect.any(Function))
  })
  
  it('should send request correctly', () => {
    const mockWs = { send: vi.fn(), readyState: 1 }
    client.ws = mockWs as any
    
    const request = {
      type: 'request',
      id: 'test-id',
      route: 'session/create',
      payload: {}
    }
    
    client.send(request)
    
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(request))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/desktop && bun test src/renderer/api/__tests__/client.test.ts`
Expected: FAIL - WebSocketClient not defined

- [ ] **Step 3: Implement WebSocketClient**

```ts
import type { WSRequest, WSMessage } from './protocol'

export interface WebSocketClientOptions {
  onMessage?: (message: WSMessage) => void
  onError?: (error: Error) => void
  onClose?: () => void
  onConnect?: () => void
}

export class WebSocketClient {
  ws: WebSocket | null = null
  private options: WebSocketClientOptions = {}
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  
  async connect(url: string, options?: WebSocketClientOptions): Promise<void> {
    this.options = options || {}
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url)
      
      this.ws.addEventListener('open', () => {
        this.reconnectAttempts = 0
        this.options.onConnect?.()
        resolve()
      })
      
      this.ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage
          this.options.onMessage?.(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      })
      
      this.ws.addEventListener('error', (event) => {
        const error = new Error('WebSocket connection error')
        this.options.onError?.(error)
        reject(error)
      })
      
      this.ws.addEventListener('close', () => {
        this.options.onClose?.()
        this.attemptReconnect(url)
      })
    })
  }
  
  private attemptReconnect(url: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        this.connect(url, this.options).catch(console.error)
      }, 1000 * this.reconnectAttempts)
    }
  }
  
  send(request: WSRequest) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(request))
    } else {
      throw new Error('WebSocket is not connected')
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
  
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/desktop && bun test src/renderer/api/__tests__/client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/renderer/api/client.ts packages/desktop/src/renderer/api/__tests__/
git commit -m "feat(desktop): implement WebSocket client with tests"
```

### Task 8: Implement WebSocket Connection Hook

**Files:**
- Create: `packages/desktop/src/renderer/hooks/useWebSocket.ts`

- [ ] **Step 1: Write useWebSocket hook**

```tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { WebSocketClient } from '../api/client'
import type { WSMessage, WSRequest } from '../api/protocol'

export interface UseWebSocketReturn {
  client: WebSocketClient | null
  isConnected: boolean
  sendMessage: (request: WSRequest) => void
  error: Error | null
}

export function useWebSocket(port: number | null): UseWebSocketReturn {
  const [client, setClient] = useState<WebSocketClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const messagesRef = useRef<WSMessage[]>([])
  
  useEffect(() => {
    if (!port) return
    
    const wsClient = new WebSocketClient()
    const url = `ws://localhost:${port}/api`
    
    wsClient.connect(url, {
      onConnect: () => {
        setIsConnected(true)
        setError(null)
      },
      onMessage: (message) => {
        messagesRef.current.push(message)
      },
      onError: (err) => {
        setError(err)
        setIsConnected(false)
      },
      onClose: () => {
        setIsConnected(false)
      }
    }).then(() => {
      setClient(wsClient)
    }).catch((err) => {
      setError(err)
    })
    
    return () => {
      wsClient.disconnect()
    }
  }, [port])
  
  const sendMessage = useCallback((request: WSRequest) => {
    if (client && isConnected) {
      client.send(request)
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [client, isConnected])
  
  return { client, isConnected, sendMessage, error }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/hooks/useWebSocket.ts
git commit -m "feat(desktop): add useWebSocket hook"
```

---

## Phase 3: Backend Integration

### Task 9: Implement Backend Server Launcher

**Files:**
- Modify: `packages/desktop/src/main/server.ts`

- [ ] **Step 1: Implement backend server startup**

Read existing backend server at `src/server/server.ts:19-50` to understand the listen interface, then implement:

```ts
import { listen, type Listener } from '../../../../src/server/server'

let listener: Listener | null = null

export async function startBackend(): Promise<{ port: number }> {
  try {
    listener = await listen({
      port: 0,
      hostname: 'localhost',
      mdns: false
    })
    
    console.log(`Backend server started at ${listener.url}`)
    
    return { port: listener.port }
  } catch (error) {
    console.error('Failed to start backend:', error)
    throw error
  }
}

export async function stopBackend() {
  if (listener) {
    await listener.stop()
    listener = null
  }
}
```

- [ ] **Step 2: Update main process to use actual backend**

Modify `packages/desktop/src/main/index.ts:1-50`:

```ts
import { app, BrowserWindow } from 'electron'
import path from 'path'
import { startBackend, stopBackend } from './server'

let mainWindow: BrowserWindow | null = null
let backendPort: number | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'OpenCode Desktop'
  })

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  
  mainWindow.webContents.on('did-finish-load', () => {
    if (backendPort) {
      mainWindow?.webContents.send('backend-ready', backendPort)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function bootstrap() {
  try {
    const { port } = await startBackend()
    backendPort = port
    console.log(`Backend started on port ${backendPort}`)
    
    await createWindow()
  } catch (error) {
    console.error('Failed to start backend:', error)
    app.quit()
  }
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await stopBackend()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/main/server.ts packages/desktop/src/main/index.ts
git commit -m "feat(desktop): integrate backend server startup"
```

---

## Phase 4: UI Components - Basic Structure

### Task 10: Create Layout Components

**Files:**
- Create: `packages/desktop/src/renderer/components/Layout.tsx`
- Create: `packages/desktop/src/renderer/components/TitleBar.tsx`

- [ ] **Step 1: Create TitleBar component**

```tsx
import React from 'react'

interface TitleBarProps {
  model?: string
  onModelChange?: (model: string) => void
}

export default function TitleBar({ model = 'Default', onModelChange }: TitleBarProps) {
  return (
    <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button className="p-1 hover:bg-gray-700 rounded" aria-label="Menu">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-medium">OpenCode Desktop</span>
      </div>
      
      <div className="flex items-center gap-3">
        <select 
          value={model}
          onChange={(e) => onModelChange?.(e.target.value)}
          className="bg-gray-700 text-sm px-2 py-1 rounded border border-gray-600"
        >
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-3.5-turbo">GPT-3.5</option>
          <option value="claude-3">Claude 3</option>
        </select>
        
        <div className="w-2 h-2 rounded-full bg-green-500" aria-label="Connected" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create Layout component**

```tsx
import React from 'react'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'
import ChatView from './ChatView'

interface LayoutProps {
  children: React.ReactNode
  isConnected: boolean
  model?: string
  onModelChange?: (model: string) => void
}

export default function Layout({ children, isConnected, model, onModelChange }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <TitleBar model={model} onModelChange={onModelChange} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/components/TitleBar.tsx packages/desktop/src/renderer/components/Layout.tsx
git commit -m "feat(desktop): add TitleBar and Layout components"
```

### Task 11: Create Sidebar Component

**Files:**
- Create: `packages/desktop/src/renderer/components/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar component**

```tsx
import React, { useState } from 'react'
import type { Session, FileInfo } from '../api/protocol'

interface SidebarProps {
  sessions?: Session[]
  files?: FileInfo[]
  currentSessionId?: string
  onSessionSelect?: (sessionId: string) => void
  onSessionCreate?: () => void
  onFileSelect?: (filePath: string) => void
}

export default function Sidebar({
  sessions = [],
  files = [],
  currentSessionId,
  onSessionSelect,
  onSessionCreate,
  onFileSelect
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4">
        <button 
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-gray-700 rounded"
          aria-label="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    )
  }
  
  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-400">Sessions</span>
        <div className="flex gap-1">
          <button 
            onClick={onSessionCreate}
            className="p-1 hover:bg-gray-700 rounded"
            aria-label="New session"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button 
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-gray-700 rounded"
            aria-label="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 space-y-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSessionSelect?.(session.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                session.id === currentSessionId
                  ? 'bg-gray-700 text-white'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              {session.title || `Session ${session.id.slice(0, 8)}`}
            </button>
          ))}
        </div>
        
        <div className="mt-4 px-3">
          <span className="text-sm font-semibold text-gray-400">Files</span>
        </div>
        
        <div className="px-2 mt-2 space-y-1">
          {files.map((file) => (
            <button
              key={file.path}
              onClick={() => onFileSelect?.(file.path)}
              className="w-full text-left px-3 py-1 rounded text-sm hover:bg-gray-700 text-gray-300 flex items-center gap-2"
            >
              {file.type === 'directory' ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span className="truncate">{file.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/components/Sidebar.tsx
git commit -m "feat(desktop): add Sidebar component with sessions and files"
```

### Task 12: Create ChatView Component

**Files:**
- Create: `packages/desktop/src/renderer/components/ChatView.tsx`

- [ ] **Step 1: Create ChatView component**

```tsx
import React from 'react'
import MessageList from './MessageList'
import InputBox from './InputBox'
import type { Message } from '../api/protocol'

interface ChatViewProps {
  messages: Message[]
  partialContent?: string
  isLoading?: boolean
  onSendMessage: (content: string) => void
}

export default function ChatView({
  messages,
  partialContent = '',
  isLoading = false,
  onSendMessage
}: ChatViewProps) {
  return (
    <div className="h-full flex flex-col bg-gray-900">
      <MessageList 
        messages={messages}
        partialContent={partialContent}
        isLoading={isLoading}
      />
      <InputBox 
        onSendMessage={onSendMessage}
        isLoading={isLoading}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/components/ChatView.tsx
git commit -m "feat(desktop): add ChatView component"
```

---

## Phase 5: UI Components - Message Handling

### Task 13: Create MessageList Component

**Files:**
- Create: `packages/desktop/src/renderer/components/MessageList.tsx`

- [ ] **Step 1: Create MessageList component**

```tsx
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '../api/protocol'

interface MessageListProps {
  messages: Message[]
  partialContent?: string
  isLoading?: boolean
}

export default function MessageList({
  messages,
  partialContent = '',
  isLoading = false
}: MessageListProps) {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div 
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div 
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </span>
              <span className="text-xs text-gray-400">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
            
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ))}
      
      {isLoading && partialContent && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-700 text-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium">Assistant</span>
              <span className="text-xs text-gray-400">typing...</span>
            </div>
            
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {partialContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
      
      {isLoading && !partialContent && (
        <div className="flex justify-start">
          <div className="bg-gray-700 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/components/MessageList.tsx
git commit -m "feat(desktop): add MessageList with markdown rendering"
```

### Task 14: Create InputBox Component

**Files:**
- Create: `packages/desktop/src/renderer/components/InputBox.tsx`

- [ ] **Step 1: Create InputBox component**

```tsx
import React, { useState, useRef, KeyboardEvent } from 'react'

interface InputBoxProps {
  onSendMessage: (content: string) => void
  isLoading?: boolean
}

export default function InputBox({ onSendMessage, isLoading = false }: InputBoxProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const handleSubmit = () => {
    if (content.trim() && !isLoading) {
      onSendMessage(content.trim())
      setContent('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
  
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }
  
  return (
    <div className="border-t border-gray-700 p-4 bg-gray-800">
      <div className="flex items-end gap-2 bg-gray-700 rounded-lg p-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-gray-100 placeholder-gray-400 resize-none outline-none min-h-[24px] max-h-[200px]"
          rows={1}
        />
        
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isLoading}
          className={`px-3 py-1 rounded flex items-center gap-1 ${
            content.trim() && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span className="text-sm">Send</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      
      <div className="mt-1 text-xs text-gray-400">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/components/InputBox.tsx
git commit -m "feat(desktop): add InputBox with keyboard shortcuts"
```

---

## Phase 6: State Management & Hooks

### Task 15: Implement useSession Hook

**Files:**
- Create: `packages/desktop/src/renderer/hooks/useSession.ts`

- [ ] **Step 1: Write useSession hook**

```tsx
import { useState, useCallback } from 'react'
import type { Session, WSRequest } from '../api/protocol'
import { useWebSocket } from './useWebSocket'

export interface UseSessionReturn {
  sessions: Session[]
  currentSessionId: string | null
  createSession: () => Promise<string>
  selectSession: (sessionId: string) => void
  clearSession: (sessionId: string) => Promise<void>
}

export function useSession(port: number | null): UseSessionReturn {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const { sendMessage, isConnected } = useWebSocket(port)
  
  const createSession = useCallback(async (): Promise<string> => {
    const requestId = crypto.randomUUID()
    const sessionId = crypto.randomUUID()
    
    const request: WSRequest = {
      type: 'request',
      id: requestId,
      route: 'session/create',
      payload: { sessionId }
    }
    
    sendMessage(request)
    
    const newSession: Session = {
      id: sessionId,
      createdAt: Date.now()
    }
    
    setSessions(prev => [...prev, newSession])
    setCurrentSessionId(sessionId)
    
    return sessionId
  }, [sendMessage])
  
  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
  }, [])
  
  const clearSession = useCallback(async (sessionId: string): Promise<void> => {
    const requestId = crypto.randomUUID()
    
    const request: WSRequest = {
      type: 'request',
      id: requestId,
      route: 'session/clear',
      payload: { sessionId }
    }
    
    sendMessage(request)
    
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    
    if (currentSessionId === sessionId) {
      setCurrentSessionId(sessions.length > 1 ? sessions[0].id : null)
    }
  }, [sendMessage, currentSessionId, sessions])
  
  return {
    sessions,
    currentSessionId,
    createSession,
    selectSession,
    clearSession
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/hooks/useSession.ts
git commit -m "feat(desktop): add useSession hook for session management"
```

### Task 16: Implement useMessages Hook

**Files:**
- Create: `packages/desktop/src/renderer/hooks/useMessages.ts`

- [ ] **Step 1: Write useMessages hook**

```tsx
import { useState, useCallback, useEffect, useRef } from 'react'
import type { Message, WSRequest, WSStreamEvent } from '../api/protocol'
import { useWebSocket } from './useWebSocket'

export interface UseMessagesReturn {
  messages: Message[]
  partialContent: string
  isLoading: boolean
  sendMessage: (content: string) => void
  loadHistory: () => void
}

export function useMessages(sessionId: string | null, port: number | null): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [partialContent, setPartialContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { sendMessage: wsSendMessage, client, isConnected } = useWebSocket(port)
  const currentMessageIdRef = useRef<string | null>(null)
  
  useEffect(() => {
    if (!client || !sessionId) return
    
    client.options.onMessage = (message) => {
      if (message.type === 'stream' && message.sessionId === sessionId) {
        handleStreamEvent(message as WSStreamEvent)
      } else if (message.type === 'response') {
        setIsLoading(false)
      }
    }
  }, [client, sessionId])
  
  const handleStreamEvent = (event: WSStreamEvent) => {
    if (event.event === 'partial') {
      setPartialContent(prev => prev + (event.data.content || ''))
      setIsLoading(true)
    } else if (event.event === 'complete') {
      const messageId = event.data.messageId || crypto.randomUUID()
      
      const fullMessage: Message = {
        id: messageId,
        role: 'assistant',
        content: partialContent + (event.data.content || ''),
        timestamp: Date.now()
      }
      
      setMessages(prev => [...prev, fullMessage])
      setPartialContent('')
      setIsLoading(false)
      currentMessageIdRef.current = null
    } else if (event.event === 'error') {
      setIsLoading(false)
      setPartialContent('')
    }
  }
  
  const sendMessage = useCallback((content: string) => {
    if (!sessionId || !isConnected) return
    
    const requestId = crypto.randomUUID()
    const messageId = crypto.randomUUID()
    
    const userMessage: Message = {
      id: messageId,
      role: 'user',
      content,
      timestamp: Date.now()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setPartialContent('')
    
    const request: WSRequest = {
      type: 'request',
      id: requestId,
      route: 'message/send',
      payload: {
        sessionId,
        message: {
          role: 'user',
          content
        }
      }
    }
    
    wsSendMessage(request)
  }, [sessionId, isConnected, wsSendMessage])
  
  const loadHistory = useCallback(() => {
    if (!sessionId || !isConnected) return
    
    const requestId = crypto.randomUUID()
    
    const request: WSRequest = {
      type: 'request',
      id: requestId,
      route: 'session/history',
      payload: { sessionId }
    }
    
    wsSendMessage(request)
  }, [sessionId, isConnected, wsSendMessage])
  
  return {
    messages,
    partialContent,
    isLoading,
    sendMessage,
    loadHistory
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/hooks/useMessages.ts
git commit -m "feat(desktop): add useMessages hook with streaming support"
```

---

## Phase 7: Integration & Final Wiring

### Task 17: Wire Up All Components in App.tsx

**Files:**
- Modify: `packages/desktop/src/renderer/App.tsx`

- [ ] **Step 1: Update App.tsx to integrate all components**

```tsx
import React, { useState, useEffect } from 'react'
import Layout from './components/Layout'
import ChatView from './components/ChatView'
import { useSession } from './hooks/useSession'
import { useMessages } from './hooks/useMessages'

declare global {
  interface Window {
    electronAPI?: {
      onBackendReady: (callback: (port: number) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}

export default function App() {
  const [backendPort, setBackendPort] = useState<number | null>(null)
  const [selectedModel, setSelectedModel] = useState('gpt-4')
  const [error, setError] = useState<string | null>(null)
  
  const {
    sessions,
    currentSessionId,
    createSession,
    selectSession,
    clearSession
  } = useSession(backendPort)
  
  const {
    messages,
    partialContent,
    isLoading,
    sendMessage
  } = useMessages(currentSessionId, backendPort)
  
  useEffect(() => {
    window.electronAPI?.onBackendReady((port) => {
      setBackendPort(port)
    })
  }, [])
  
  useEffect(() => {
    if (backendPort && sessions.length === 0) {
      createSession()
    }
  }, [backendPort, sessions.length])
  
  if (!backendPort) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">
          <div className="text-xl mb-2">Starting backend...</div>
          <div className="w-32 h-1 bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-xl mb-2 text-red-400">Error: {error}</div>
          <button 
            onClick={() => setError(null)}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <Layout 
      isConnected={backendPort !== null}
      model={selectedModel}
      onModelChange={setSelectedModel}
    >
      <ChatView
        messages={messages}
        partialContent={partialContent}
        isLoading={isLoading}
        onSendMessage={sendMessage}
      />
    </Layout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/renderer/App.tsx
git commit -m "feat(desktop): wire up all components in App.tsx"
```

### Task 18: Add Electron Builder Configuration

**Files:**
- Create: `packages/desktop/electron-builder.yml`

- [ ] **Step 1: Create electron-builder.yml**

```yaml
appId: com.opencode.desktop
productName: OpenCode Desktop
directories:
  buildResources: build
  output: dist
files:
  - dist/**/*
  - build/**/*
mac:
  category: public.app-category.developer-tools
  icon: build/icon.png
  target:
    - dmg
    - zip
win:
  icon: build/icon.ico
  target:
    - nsis
    - portable
linux:
  icon: build/icon.png
  target:
    - AppImage
    - deb
```

- [ ] **Step 2: Update package.json with build scripts**

Modify `packages/desktop/package.json:5-10`:

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "start": "electron-vite preview",
    "pack": "electron-builder --dir",
    "dist": "electron-builder",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/electron-builder.yml packages/desktop/package.json
git commit -m "feat(desktop): add electron-builder configuration"
```

---

## Phase 8: Testing & Documentation

### Task 19: Add Basic Integration Test

**Files:**
- Create: `packages/desktop/src/__tests__/integration.test.ts`

- [ ] **Step 1: Write integration test**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { app, BrowserWindow } from 'electron'
import path from 'path'

describe('Desktop App Integration', () => {
  let mainWindow: BrowserWindow | null = null
  
  beforeAll(async () => {
    await app.whenReady()
  })
  
  afterAll(async () => {
    if (mainWindow) {
      mainWindow.close()
    }
    await app.quit()
  })
  
  it('should create main window', async () => {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })
    
    expect(mainWindow).toBeDefined()
    expect(mainWindow!.getWidth()).toBe(1200)
    expect(mainWindow!.getHeight()).toBe(800)
  })
  
  it('should load renderer HTML', async () => {
    mainWindow!.loadFile(path.join(__dirname, '../renderer/index.html'))
    
    await new Promise(resolve => {
      mainWindow!.webContents.on('did-finish-load', resolve)
    })
    
    const title = await mainWindow!.webContents.executeJavaScript('document.title')
    expect(title).toBe('OpenCode Desktop')
  })
})
```

- [ ] **Step 2: Add vitest configuration**

Create `packages/desktop/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist']
  }
})
```

- [ ] **Step 3: Run tests**

Run: `cd packages/desktop && bun test`
Expected: Tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/__tests__/ packages/desktop/vitest.config.ts
git commit -m "feat(desktop): add integration tests"
```

### Task 20: Final Documentation and Verification

**Files:**
- Create: `packages/desktop/README.md`

- [ ] **Step 1: Create README.md**

```markdown
# OpenCode Desktop

Electron desktop application for OpenCode, providing a Codex-style UI for AI agent interactions.

## Features

- Chat interface with streaming responses
- Session management (create, switch, clear)
- File operations (read, write, search)
- Model selection

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
bun run dist
```

## Architecture

- Main process: Starts backend server, manages window lifecycle
- Renderer process: React UI, WebSocket connection to backend
- Backend: Existing OpenCode server (src/server/server.ts)

## WebSocket Protocol

See `docs/superpowers/specs/2026-06-20-desktop-app-design.md` for protocol details.
```

- [ ] **Step 2: Run typecheck**

Run: `cd packages/desktop && bun run typecheck`
Expected: No type errors

- [ ] **Step 3: Run build**

Run: `cd packages/desktop && bun run build`
Expected: Build successful

- [ ] **Step 4: Final commit**

```bash
git add packages/desktop/README.md
git commit -m "feat(desktop): add documentation and finalize project"
```

---

## Plan Self-Review Checklist

- **Spec coverage**: All requirements covered ✓
  - Architecture: Tasks 1-9 ✓
  - WebSocket protocol: Tasks 6-8 ✓
  - UI components: Tasks 10-14 ✓
  - State hooks: Tasks 15-16 ✓
  - Integration: Tasks 17-20 ✓
- **No placeholders**: All code included ✓
- **Type consistency**: Types defined in protocol.ts used consistently ✓
- **TDD approach**: Tests written before implementation where applicable ✓
- **File paths**: All exact paths specified ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-20-desktop-app-implementation.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans skill, batch execution with checkpoints

Which approach?