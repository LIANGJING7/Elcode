import { ipcMain, app, dialog } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { CHANNELS } from './channels'
import type { Workspace, WorkspacePersistence } from '../../types/ipc'

const WORKSPACES_FILE = 'workspaces.json'

function getWorkspacesFilePath(): string {
  return path.join(app.getPath('userData'), WORKSPACES_FILE)
}

async function readWorkspacesFile(): Promise<WorkspacePersistence> {
  const filePath = getWorkspacesFilePath()
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(content)
    return {
      workspaces: data.workspaces?.map((w: any) => ({
        ...w,
        lastAccessed: new Date(w.lastAccessed)
      })) || [],
      currentWorkspacePath: data.currentWorkspacePath || null
    }
  } catch {
    return { workspaces: [], currentWorkspacePath: null }
  }
}

async function writeWorkspacesFile(data: WorkspacePersistence): Promise<void> {
  const filePath = getWorkspacesFilePath()
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Resolve the currently-selected workspace root (the renderer's trusted
 * working directory). Used by the capability guards so file/config IPC can
 * be confined to within the active workspace instead of the whole disk.
 */
let activeWorkspaceRoot: string | null = null

export function setActiveWorkspaceRoot(root: string | null): void {
  activeWorkspaceRoot = root
}

export function getActiveWorkspaceRoot(): string | null {
  return activeWorkspaceRoot
}

export function registerWorkspaceHandlers() {
  console.log('[Workspace] Registering handlers...')
  
  ipcMain.handle(CHANNELS.WORKSPACE_LIST, async () => {
    console.log('[Workspace] LIST called')
    const data = await readWorkspacesFile()
    return data.workspaces.sort((a, b) => 
      new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
    )
  })

  ipcMain.handle(CHANNELS.WORKSPACE_ADD, async (_event, workspacePath?: string) => {
    console.log('[Workspace] ADD called with path:', workspacePath)
    let selectedPath = workspacePath
    
    if (!selectedPath) {
      console.log('[Workspace] Opening folder picker dialog...')
      const { getMainWindow } = await import('../window')
      const mainWindow = getMainWindow()
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory'],
        title: 'Select Workspace Folder'
      })
      console.log('[Workspace] Dialog result:', JSON.stringify(result))
      if (result.canceled || result.filePaths.length === 0) {
        console.log('[Workspace] Dialog canceled or no selection')
        return null
      }
      selectedPath = result.filePaths[0]
    }

    console.log('[Workspace] Selected path:', selectedPath)

    const data = await readWorkspacesFile()
    
    const existing = data.workspaces.find(w => w.path === selectedPath)
    if (existing) {
      existing.lastAccessed = new Date()
      data.currentWorkspacePath = selectedPath
      await writeWorkspacesFile(data)
      setActiveWorkspaceRoot(selectedPath)
      return existing
    }

    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name: path.basename(selectedPath),
      path: selectedPath,
      lastAccessed: new Date()
    }

    data.workspaces.push(newWorkspace)
    data.currentWorkspacePath = selectedPath
    await writeWorkspacesFile(data)
    setActiveWorkspaceRoot(selectedPath)

    return newWorkspace
  })

  ipcMain.handle(CHANNELS.WORKSPACE_REMOVE, async (_event, workspacePath: string) => {
    const data = await readWorkspacesFile()
    const index = data.workspaces.findIndex(w => w.path === workspacePath)
    if (index === -1) return false
    
    data.workspaces.splice(index, 1)
    
    if (data.currentWorkspacePath === workspacePath) {
      data.currentWorkspacePath = data.workspaces[0]?.path || null
    }
    
    await writeWorkspacesFile(data)
    return true
  })

  ipcMain.handle(CHANNELS.WORKSPACE_SELECT, async (_event, workspacePath: string) => {
    const data = await readWorkspacesFile()
    const workspace = data.workspaces.find(w => w.path === workspacePath)
    if (!workspace) return false
    
    workspace.lastAccessed = new Date()
    data.currentWorkspacePath = workspacePath
    await writeWorkspacesFile(data)
    setActiveWorkspaceRoot(workspacePath)
    return true
  })

  ipcMain.handle(CHANNELS.WORKSPACE_OPEN_FOLDER, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
}