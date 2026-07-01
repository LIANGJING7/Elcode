import { spawn, ChildProcess } from "child_process"
import path from "path"
import { fileURLToPath } from "url"
import http from "http"
import fs from "fs"
import type { SessionListQuery, SessionListResult } from "../types/session"
import type { Conversation } from "../types/ipc"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let backendProcess: ChildProcess | null = null
let backendPort: number | null = null
let backendReady = false

const request = (method: string, pathname: string, body?: unknown): Promise<unknown> => {
  if (!backendPort || !backendReady) {
    throw new Error("Backend not ready")
  }
  
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${backendPort}${pathname}`
    const payload = body ? JSON.stringify(body) : undefined
    
    const req = http.request(url, {
      method,
      headers: payload ? { "Content-Type": "application/json" } : {},
    }, (res) => {
      let data = ""
      res.on("data", chunk => data += chunk)
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : null)
          } catch {
            resolve(data)
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })
    
    req.on("error", reject)
    if (payload) req.write(payload)
    req.end()
  })
}

export async function startBackend(): Promise<{ port: number }> {
  if (backendReady && backendPort) {
    return { port: backendPort }
  }

  const projectRoot = path.resolve(__dirname, "../../../..")

  console.log("=== Starting backend ===")
  console.log(`Project root: ${projectRoot}`)

  return new Promise((resolve, reject) => {
    // Run the launcher. In development, we use the source file directly.
    // In production (packaged), we use the compiled JS in dist/main/.
    // The launcher lives at packages/desktop/src/main/backend-launcher.ts
    // or dist/main/backend-launcher.js after build (same directory as index.js).
    const launcherPath = path.resolve(__dirname, "./backend-launcher.js")
    const fallbackLauncherPath = path.resolve(__dirname, "../../src/main/backend-launcher.ts")
    const actualLauncherPath = fs.existsSync(launcherPath) ? launcherPath : fallbackLauncherPath
    console.log(`Launcher path: ${actualLauncherPath}`)
    
    // The backend is a local, loopback-only subprocess that we spawn and talk
    // to ourselves — there's no network exposure to protect. The core server
    // enables HTTP Basic Auth whenever LCODE_SERVER_PASSWORD is set (see
    // packages/core/src/server/auth.ts), and our own request() helper below
    // sends no Authorization header, so any inherited password would make
    // every request come back 401. Strip the auth env vars so the server runs
    // unauthenticated, matching the desktop client's credential-less calls.
    const childEnv = { ...process.env }
    delete (childEnv as Record<string, string | undefined>).LCODE_SERVER_PASSWORD
    delete (childEnv as Record<string, string | undefined>).LCODE_SERVER_USERNAME
    backendProcess = spawn("bun", ["run", actualLauncherPath], {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
      env: childEnv,
      shell: process.platform === "win32",
      windowsHide: true,
    })

    let portFound = false
    let stdout = ""
    let stderr = ""
    let settled = false

    const fail = (msg: string) => {
      if (settled) return
      settled = true
      backendReady = false
      const detail = (stderr.trim() || stdout.trim()).slice(0, 2000)
      reject(new Error(`${msg}${detail ? "\n--- backend output ---\n" + detail : ""}`))
    }

    backendProcess.stdout?.on("data", (data: Buffer) => {
      const text = data.toString()
      stdout += text
      console.log("[Backend]", text.trim())

      const match = text.match(/PORT:(\d+)/)
      if (match && !portFound) {
        portFound = true
        settled = true
        backendPort = parseInt(match[1], 10)
        backendReady = true
        console.log(`✓ Backend ready on port ${backendPort}`)
        resolve({ port: backendPort })
      }
    })

    backendProcess.stderr?.on("data", (data: Buffer) => {
      const text = data.toString()
      stderr += text
      console.error("[Backend err]", text.trim())
    })

    backendProcess.on("error", (err: Error) => {
      fail(`Failed to spawn backend: ${err.message}`)
    })

    backendProcess.on("exit", (code: number) => {
      backendReady = false
      if (!portFound) fail(`Backend exited early (code ${code})`)
    })

    setTimeout(() => {
      if (!portFound) {
        fail("Backend startup timeout (15s)")
        stopBackend()
      }
    }, 15000)
  })
}

async function killProcessTree(proc: ChildProcess): Promise<void> {
  if (!proc || proc.exitCode !== null) return
  const procPid = proc.pid
  try {
    if (process.platform === "win32") {
      // taskkill /T kills the whole process tree; /F forces it.
      spawn("taskkill", ["/pid", String(procPid), "/T", "/F"], { windowsHide: true })
    } else {
      proc.kill("SIGTERM")
    }
  } catch {
    // ignore — process may already be gone
  }
  await new Promise<void>((r) => {
    proc.once("exit", () => r())
    setTimeout(() => {
      try {
        if (process.platform !== "win32") proc.kill("SIGKILL")
      } catch {}
      r()
    }, 3000)
  })
}

export async function stopBackend(): Promise<void> {
  if (backendProcess) {
    await killProcessTree(backendProcess)
    backendProcess = null
    backendReady = false
  }
}

export const backend = {
  session: {
    create: async (directory: string, workspaceID?: string): Promise<string> => {
      const params = new URLSearchParams({ directory })
      if (workspaceID) params.set("workspaceID", workspaceID)
      const result = await request("POST", `/session?${params.toString()}`)
      return (result as { id: string }).id
    },
    
    get: async (sessionID: string, directory?: string): Promise<unknown> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("GET", `/session/${sessionID}?${params}`)
    },
    
    list: async (directory?: string, workspaceID?: string): Promise<unknown[]> => {
      const params = new URLSearchParams()
      if (directory) params.set("directory", directory)
      if (workspaceID) params.set("workspaceID", workspaceID)
      return request("GET", `/session?${params.toString()}`) as Promise<unknown[]>
    },
    
    messages: async (sessionID: string, limit?: number, directory?: string): Promise<unknown[]> => {
      const params = new URLSearchParams({ limit: String(limit || 100) })
      if (directory) params.set("directory", directory)
      return request("GET", `/session/${sessionID}/message?${params.toString()}`) as Promise<unknown[]>
    },
    
    prompt: async (sessionID: string, payload: { parts: unknown[]; model?: { providerID: string; id: string; variant?: string }; agent?: string }, directory?: string): Promise<void> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      await request("POST", `/session/${sessionID}/prompt_async?${params}`, payload)
    },
    
    interrupt: async (sessionID: string, directory?: string): Promise<void> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      await request("POST", `/session/${sessionID}/abort?${params}`)
    },
    
    resume: async (sessionID: string, directory?: string): Promise<void> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      await request("POST", `/session/${sessionID}/prompt_async?${params}`, { prompt: [] })
    },

    remove: async (sessionID: string, directory?: string): Promise<boolean> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      const result = await request("DELETE", `/session/${sessionID}?${params}`)
      return result === true || result === null
    },
    
    update: async (sessionID: string, patch: { title?: string }, directory?: string): Promise<unknown> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("PATCH", `/session/${sessionID}?${params}`, patch)
    },
    
    events: (sessionID: string, onEvent: (event: unknown) => void, directory?: string): (() => void) => {
      if (!backendPort) return () => {}
      
      const params = new URLSearchParams()
      if (directory) params.set("directory", directory)
      // 后端 SSE 端点是 /event（不是 /session/:id/events）
      const url = `http://localhost:${backendPort}/event?${params.toString()}`
      console.log('[SSE CONNECT] url:', url)
      console.log('[SSE CONNECT] sessionID:', sessionID)
      console.log('[SSE CONNECT] directory param:', directory)
      const req = http.request(url, { method: "GET" }, (res) => {
        if (res.statusCode !== 200) {
          console.error('[SSE CONNECT] HTTP', res.statusCode, res.statusMessage)
          return
        }
        console.log('[SSE CONNECT] connected (200)')
        let buffer = ""
        let eventCount = 0
        res.on("data", (chunk) => {
          buffer += chunk.toString()
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""
          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith("data:")) {
              try {
                const payload = JSON.parse(trimmed.slice(5))
                eventCount++
                // DEBUG: Enhanced logging for all events including content events
                if (payload.type?.startsWith('session.next.') || payload.type?.startsWith('message.part')) {
                  console.log('[SSE RAW #' + eventCount + '] CONTENT:', payload.type, 'full:', JSON.stringify(payload).slice(0, 500))
                } else if (payload.type && !payload.type.startsWith('server.')) {
                  console.log('[SSE RAW #' + eventCount + '] type:', payload.type)
                  console.log('[SSE RAW #' + eventCount + '] full:', JSON.stringify(payload).slice(0, 500))
                } else {
                  console.log('[SSE RAW #' + eventCount + '] type:', payload.type)
                }
                onEvent(payload)
              } catch (e) {
                console.error('[SSE PARSE] failed:', trimmed.slice(0, 100), e)
              }
            }
          }
        })
        res.on("end", () => {
          console.log('[SSE] stream ended, total events:', eventCount)
          // Notify renderer that stream is fully complete
          onEvent({ type: 'stream.ended', sessionID })
        })
      })
      req.on("error", (e) => console.error('[SSE CONNECT] request error:', e.message))
      req.end()
      
      return () => {
        console.log('[SSE] destroying request')
        req.destroy()
      }
    },
  },
  
  file: {
    read: async (filePath: string, directory?: string): Promise<string> => {
      const params = new URLSearchParams({ path: filePath })
      if (directory) params.set("directory", directory)
      return request("GET", `/file?${params.toString()}`) as Promise<string>
    },
    
    write: async (filePath: string, content: string, directory?: string): Promise<void> => {
      const params = new URLSearchParams({ path: filePath })
      if (directory) params.set("directory", directory)
      await request("POST", `/file?${params.toString()}`, { content })
    },
    
    list: async (cwd: string, pattern?: string, directory?: string): Promise<unknown[]> => {
      const params = new URLSearchParams({ cwd })
      if (pattern) params.set("pattern", pattern)
      if (directory) params.set("directory", directory)
      return request("GET", `/file/list?${params.toString()}`) as Promise<unknown[]>
    },
  },
  
  config: {
    get: async (key: string, directory?: string): Promise<unknown> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("GET", `/config/${key}?${params}`)
    },

    set: async (key: string, value: unknown, directory?: string): Promise<void> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      // Use PATCH /config to update config (supports partial updates)
      // The key is mapped to the config field name
      await request("PATCH", `/config?${params}`, { [key]: value })
    },

    models: async (directory?: string): Promise<{ all: unknown[]; default: string[]; connected: string[] }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("GET", `/provider?${params}`) as Promise<{ all: unknown[]; default: string[]; connected: string[] }>
    },
  },

  console: {
    get: async (directory?: string): Promise<{ consoleManagedProviders: string[]; activeOrgName?: string; switchableOrgCount: number }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("GET", `/experimental/console?${params}`) as Promise<{ consoleManagedProviders: string[]; activeOrgName?: string; switchableOrgCount: number }>
    },
  },

  provider: {
    authMethods: async (directory?: string): Promise<Record<string, unknown[]>> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("GET", `/provider/auth?${params}`) as Promise<Record<string, unknown[]>>
    },

    authorize: async (providerID: string, method: number, inputs?: Record<string, string>, directory?: string): Promise<{ url?: string; method: string; instructions?: string }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("POST", `/provider/${providerID}/oauth/authorize?${params}`, { method, inputs }) as Promise<{ url?: string; method: string; instructions?: string }>
    },

    authCallback: async (providerID: string, method: number, code?: string, directory?: string): Promise<boolean> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("POST", `/provider/${providerID}/oauth/callback?${params}`, { method, code }) as Promise<boolean>
    },

    add: async (config: { name: string; apiKey: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; provider?: unknown; error?: string }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("POST", `/provider?${params}`, config) as Promise<{ success: boolean; provider?: unknown; error?: string }>
    },

    update: async (providerId: string, config: { apiKey?: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; provider?: unknown; error?: string }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("PATCH", `/provider/${providerId}?${params}`, config) as Promise<{ success: boolean; provider?: unknown; error?: string }>
    },

    delete: async (providerId: string, directory?: string): Promise<{ success: boolean; error?: string }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("DELETE", `/provider/${providerId}?${params}`) as Promise<{ success: boolean; error?: string }>
    },

    test: async (providerIdOrConfig: string | { name: string; apiKey: string; baseUrl?: string }, directory?: string): Promise<{ success: boolean; modelCount?: number; error?: string }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      if (typeof providerIdOrConfig === 'string') {
        return request("POST", `/provider/${providerIdOrConfig}/test?${params}`) as Promise<{ success: boolean; modelCount?: number; error?: string }>
      } else {
        return request("POST", `/provider/test?${params}`, providerIdOrConfig) as Promise<{ success: boolean; modelCount?: number; error?: string }>
      }
    },

    refreshModels: async (providerId: string, directory?: string): Promise<{ success: boolean; models?: unknown[]; changed?: boolean; error?: string }> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("POST", `/provider/${providerId}/refresh-models?${params}`) as Promise<{ success: boolean; models?: unknown[]; changed?: boolean; error?: string }>
    },
  },
  
  // Phase 5: Skills & MCP
  skill: {
    list: async (directory?: string): Promise<unknown[]> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("GET", `/api/skill?${params}`) as Promise<unknown[]>
    },
  },
  
  mcp: {
    status: async (directory?: string): Promise<unknown> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("GET", `/mcp?${params}`)
    },
    
    add: async (name: string, config: unknown, directory?: string): Promise<unknown> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("POST", `/mcp?${params}`, { name, config })
    },
    
    connect: async (name: string, directory?: string): Promise<boolean> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("POST", `/mcp/${name}/connect?${params}`) as Promise<boolean>
    },
    
    disconnect: async (name: string, directory?: string): Promise<boolean> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("POST", `/mcp/${name}/disconnect?${params}`) as Promise<boolean>
    },
  },

// Experimental API with pagination support
  experimental: {
    session: {
      /**
       * List sessions - using Instance API /session
       * Supports start, search, limit parameters
       * Note: Instance API doesn't support cursor pagination
       */
      list: async (query: SessionListQuery): Promise<SessionListResult> => {
        if (!backendPort || !backendReady) {
          throw new Error("Backend not ready")
        }
        
        const params = new URLSearchParams()
        if (query.directory) params.set('directory', query.directory)
        if (query.workspace) params.set('workspaceID', query.workspace)
        if (query.start) params.set('start', String(query.start))
        if (query.search) params.set('search', query.search)
        if (query.limit) params.set('limit', String(query.limit))
        
        const url = `http://localhost:${backendPort}/session?${params.toString()}`
        
        return new Promise((resolve, reject) => {
          const req = http.request(url, { method: "GET" }, (res) => {
            let data = ""
            res.on("data", chunk => data += chunk)
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const rawSessions = data ? JSON.parse(data) : []
                  const conversations = (rawSessions as Array<Record<string, unknown>>).map(toConversation)
                  resolve({
                    conversations: conversations,
                    nextCursor: undefined  // Instance API doesn't support cursor pagination
                  })
                } catch {
                  reject(new Error(`Failed to parse response: ${data}`))
                }
              } else {
                reject(new Error(`HTTP ${res.statusCode}: ${data}`))
              }
            })
          })
          req.on("error", reject)
          req.end()
        })
      },
    },
  },
}

/**
 * Map a raw backend session to the renderer's Conversation shape.
 */
function toConversation(raw: Record<string, unknown>): Conversation {
  const time = (raw.time ?? {}) as { created?: number; updated?: number }
  return {
    id: String(raw.id),
    title: String(raw.title ?? 'Untitled'),
    messages: [],
    createdAt: new Date(time.created ?? Date.now()),
    updatedAt: new Date(time.updated ?? time.created ?? Date.now()),
    directory: String(raw.directory ?? ''),
  }
}

export { request }