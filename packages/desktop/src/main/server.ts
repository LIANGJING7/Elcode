import { spawn, ChildProcess } from "child_process"
import path from "path"
import fs from "fs"

let backendProcess: ChildProcess | null = null
let backendPort: number | null = null

// Backend launcher - spawns OpenCode server directly
export async function startBackend(): Promise<{ port: number }> {
  const projectRoot = path.resolve(__dirname, "../../../..")
  
  console.log("=== Starting backend ===")
  console.log(`Project root: ${projectRoot}`)
  
  // Create a temporary launcher script
  const tempLauncher = path.join(projectRoot, ".backend-launcher-temp.ts")
  const launcherCode = `
import { listen } from './src/server/server.ts'
listen({ port: 0, hostname: 'localhost', mdns: false })
  .then(l => console.log('PORT:' + l.port))
  .catch(e => { console.error(e); process.exit(1) })
`
  
  fs.writeFileSync(tempLauncher, launcherCode)
  
  return new Promise((resolve, reject) => {
    backendProcess = spawn("cmd", ["/c", "bun", "run", tempLauncher], {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
      shell: process.platform === "win32",
    })
    
    let portFound = false
    let output = ""
    
    backendProcess.stdout?.on("data", (data: Buffer) => {
      const text = data.toString()
      output += text
      console.log("[Backend]", text.trim())
      
      const match = text.match(/PORT:(\d+)/)
      if (match && !portFound) {
        portFound = true
        backendPort = parseInt(match[1], 10)
        console.log(`✓ Backend ready on port ${backendPort}`)
        // Clean up temp file
        try { fs.unlinkSync(tempLauncher) } catch {}
        resolve({ port: backendPort })
      }
    })
    
    backendProcess.stderr?.on("data", (data: Buffer) => {
      console.error("[Backend err]", data.toString().trim())
    })
    
    backendProcess.on("error", (err: Error) => {
      try { fs.unlinkSync(tempLauncher) } catch {}
      if (!portFound) reject(err)
    })
    
    backendProcess.on("exit", (code: number) => {
      try { fs.unlinkSync(tempLauncher) } catch {}
      if (!portFound) reject(new Error(`Backend failed (${code}): ${output}`))
    })
    
    setTimeout(() => {
      try { fs.unlinkSync(tempLauncher) } catch {}
      if (!portFound) {
        reject(new Error("Backend timeout (15s)"))
        stopBackend()
      }
    }, 15000)
  })
}

export async function stopBackend(): Promise<void> {
  if (backendProcess) {
    backendProcess.kill("SIGTERM")
    await new Promise<void>((r) => {
      backendProcess?.on("exit", () => { backendProcess = null; r() })
      setTimeout(() => { backendProcess?.kill("SIGKILL"); backendProcess = null; r() }, 3000)
    })
  }
}