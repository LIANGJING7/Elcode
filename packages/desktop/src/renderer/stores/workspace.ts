import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Workspace } from '../../types/ipc'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([])
  const currentWorkspace = ref<Workspace | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const hasWorkspaces = computed(() => workspaces.value.length > 0)
  const hasCurrentWorkspace = computed(() => currentWorkspace.value !== null)

  async function loadWorkspaces() {
    isLoading.value = true
    error.value = null
    try {
      const list = await window.desktop.workspace.list()
      workspaces.value = list
      
      const cwd = await window.desktop.workspace.getCwd()
      
      const matchByCwd = workspaces.value.find(w => w.path === cwd)
      if (matchByCwd) {
        currentWorkspace.value = matchByCwd
      } else if (workspaces.value.length > 0) {
        currentWorkspace.value = workspaces.value[0]
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load workspaces'
      workspaces.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function addWorkspace(path?: string) {
    isLoading.value = true
    error.value = null
    try {
      const newWorkspace = await window.desktop.workspace.add(path)
      if (!newWorkspace) {
        return null
      }
      
      const existing = workspaces.value.find(w => w.path === newWorkspace.path)
      if (existing) {
        await selectWorkspace(existing.path)
        return existing
      }
      
      workspaces.value.unshift(newWorkspace)
      await selectWorkspace(newWorkspace.path)
      return newWorkspace
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to add workspace'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function selectWorkspace(path: string) {
    error.value = null
    try {
      const success = await window.desktop.workspace.select(path)
      if (!success) {
        error.value = 'Workspace not found'
        return false
      }
      
      const workspace = workspaces.value.find(w => w.path === path)
      if (workspace) {
        currentWorkspace.value = workspace
        
        const index = workspaces.value.findIndex(w => w.path === path)
        if (index > 0) {
          workspaces.value.splice(index, 1)
          workspaces.value.unshift(workspace)
        }
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to select workspace'
      return false
    }
  }

  async function removeWorkspace(path: string) {
    error.value = null
    try {
      const success = await window.desktop.workspace.remove(path)
      if (!success) {
        return false
      }
      
      workspaces.value = workspaces.value.filter(w => w.path !== path)
      
      if (currentWorkspace.value?.path === path) {
        currentWorkspace.value = workspaces.value[0] || null
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove workspace'
      return false
    }
  }

  async function openFolderPicker() {
    return await window.desktop.workspace.openFolder()
  }

  async function pickAndAddWorkspace() {
    const path = await openFolderPicker()
    if (!path) return // 用户取消
    await addWorkspace(path)
  }

  return {
    workspaces,
    currentWorkspace,
    isLoading,
    error,
    hasWorkspaces,
    hasCurrentWorkspace,
    loadWorkspaces,
    addWorkspace,
    selectWorkspace,
    removeWorkspace,
    openFolderPicker,
    pickAndAddWorkspace
  }
})