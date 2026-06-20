import { app, BrowserWindow } from "electron"
import path from "path"
import { startBackend } from "./server"

let mainWindow: BrowserWindow | null = null
let backendPort: number | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "OpenCode Desktop",
  })

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173")
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"))
  }

  mainWindow.webContents.on("did-finish-load", () => {
    if (backendPort && mainWindow) {
      mainWindow.webContents.send("backend-ready", backendPort)
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

async function bootstrap(): Promise<void> {
  try {
    const { port } = await startBackend()
    backendPort = port
    createWindow()
    console.log(`Backend started on port ${port}`)
  } catch (error) {
    console.error("Failed to start backend:", error)
    app.quit()
  }
}

app.whenReady().then(bootstrap)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("before-quit", () => {
  // Cleanup placeholder - will be implemented in Task 9
})