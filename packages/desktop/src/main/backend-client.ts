import { spawn, ChildProcess } from "child_process"
import path from "path"
import { fileURLToPath } from "url"
import http from "http"

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
    // Run the launcher from source (bun handles TS natively). The launcher lives
    // at packages/desktop/src/main/backend-launcher.ts; from dist/main that's
    // ../src/main/backend-launcher.ts. cwd is the repo root so the launcher's
    // relative imports resolve against the monorepo root.
    const launcherPath = path.resolve(__dirname, "../../src/main/backend-launcher.ts")
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
    backendProcess = spawn("bun", ["run", launcherPath], {
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
    
    prompt: async (sessionID: string, prompt: unknown[], directory?: string): Promise<void> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      await request("POST", `/session/${sessionID}/prompt_async?${params}`, { prompt })
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
    
    events: (sessionID: string, onEvent: (event: unknown) => void, directory?: string): (() => void) => {
      if (!backendPort) return () => {}
      
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      const url = `http://localhost:${backendPort}/session/${sessionID}/events?${params}`
      const req = http.request(url, { method: "GET" }, (res) => {
        let buffer = ""
        res.on("data", (chunk) => {
          buffer += chunk.toString()
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""
          for (const line of lines) {
            if (line.startsWith("data:")) {
              try {
                onEvent(JSON.parse(line.slice(5)))
              } catch {}
            }
          }
        })
      })
      req.on("error", () => {})
      req.end()
      
      return () => req.destroy()
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
      await request("POST", `/config/${key}?${params}`, { value })
    },
    
    models: async (directory?: string): Promise<unknown[]> => {
      const params = directory ? new URLSearchParams({ directory }).toString() : ""
      return request("GET", `/provider/models?${params}`) as Promise<unknown[]>
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
}

export { request }