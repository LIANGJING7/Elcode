import { ref, computed } from 'vue'
import { useWorkspaceStore } from '../stores/workspace'
import type { MentionItem } from '../../types/mention'

export function useMention() {
  const workspaceStore = useWorkspaceStore()
  
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const directory = computed(() => workspaceStore.currentWorkspace?.path)
  
  async function searchFiles(query: string): Promise<MentionItem[]> {
    if (!query || query.length < 1) return []
    
    try {
      loading.value = true
      const files = await window.desktop.file.search(query, directory.value)
      
      return files.map(file => ({
        kind: 'file' as const,
        value: file.relativePath,
        display: `@${file.relativePath}`,
        directory: file.isDirectory,
        mime: file.mimeType,
        url: file.url
      }))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to search files'
      return []
    } finally {
      loading.value = false
    }
  }
  
  async function getAgents(): Promise<MentionItem[]> {
    try {
      loading.value = true
      const agents = await window.desktop.session.agents(directory.value)
      
      return agents
        .filter(a => a.mode === 'subagent')
        .map(a => ({
          kind: 'agent' as const,
          value: a.name,
          display: `@${a.name}`,
          description: a.description
        }))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get agents'
      return []
    } finally {
      loading.value = false
    }
  }
  
  async function getResources(): Promise<MentionItem[]> {
    try {
      loading.value = true
      const resources = await window.desktop.mcp.resources(directory.value)
      
      return Object.entries(resources).map(([name, res]: [string, any]) => ({
        kind: 'resource' as const,
        value: name,
        display: `@${name}`,
        description: res.description,
        mime: res.mimeType,
        url: res.uri
      }))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get resources'
      return []
    } finally {
      loading.value = false
    }
  }
  
  async function searchAll(query: string): Promise<MentionItem[]> {
    const [files, agents, resources] = await Promise.all([
      searchFiles(query),
      query.length === 0 ? getAgents() : Promise.resolve([]),
      query.length === 0 ? getResources() : Promise.resolve([])
    ])
    
    return [...files, ...agents, ...resources]
  }
  
  return {
    loading,
    error,
    searchFiles,
    getAgents,
    getResources,
    searchAll
  }
}
