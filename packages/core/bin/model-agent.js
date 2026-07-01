#!/usr/bin/env bun
// Global entrypoint for the `model-agent` CLI (see package.json `bin`).
// 
// This CLI has two modes:
// 1. Compiled mode (preferred for TUI): uses the standalone binary from `bun run build`
//    The binary contains pre-compiled JSX transformation and all dependencies bundled.
// 2. Source mode (fallback): runs TypeScript source directly with bun.
//    Non-TUI commands work fine, but TUI requires JSX runtime support that's only
//    available after compilation.
//
// To build the binary: `bun run build` (creates dist/<platform>/bin/opencode.exe)

import { existsSync } from "node:fs"
import { spawn } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { platform, arch } from "node:os"

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(__dirname, "..")
const monorepoRoot = join(packageRoot, "..", "..")

// Detect platform for compiled binary path
const platformName = platform() === "win32" ? "windows" : platform()
const archName = arch()
const binaryName = platform() === "win32" ? "opencode.exe" : "opencode"
const binaryPath = join(monorepoRoot, "dist", `opencode-${platformName}-${archName}`, "bin", binaryName)

// Check if compiled binary exists
if (existsSync(binaryPath)) {
  // Use compiled binary (full functionality including TUI)
  const child = spawn(binaryPath, process.argv.slice(2), {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env
  })
  child.on("exit", (code) => process.exit(code ?? 0))
  child.on("error", (err) => {
    console.error("Failed to run compiled binary:", err.message)
    process.exit(1)
  })
} else {
  // Fallback to source mode (limited functionality - TUI requires compilation)
  process.chdir(packageRoot)
  
  // Only initialize runtime plugin for non-TUI commands
  // (TUI commands will fail without compiled binary due to JSX runtime limitations)
  const args = process.argv.slice(2)
  const isTuiCommand = args.length === 0 || !args[0].startsWith("-") && ![
    "serve", "models", "providers", "agent", "upgrade", "uninstall", 
    "debug", "stats", "export", "import", "github", "pr", "session", 
    "plugin", "db", "completion", "acp", "mcp", "attach", "run", "web"
  ].includes(args[0])
  
  if (isTuiCommand) {
    console.error("TUI mode requires compiled binary. Run `bun run build` first.")
    console.error(`Expected binary at: ${binaryPath}`)
    process.exit(1)
  }
  
  // Non-TUI commands: run source directly
  const { pathToFileURL } = await import("node:url")
  const entry = pathToFileURL(join(packageRoot, "src", "index.ts")).href
  await import(entry)
}
