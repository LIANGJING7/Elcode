import { ref, computed } from 'vue'
import { useWorkspaceStore } from '../stores/workspace'
import type { MentionItem } from '../../types/mention'

export function useMention() {
  const workspaceStore = useWorkspaceStore()
  
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const directory = computed(() => workspaceStore.currentWorkspace?.path)
  
  async function searchFiles(query: string): Promise<MentionItem[]> {
    console.log('[useMention] searchFiles called', { query, directory: directory.value })
    if (!query || query.length < 1) return []
    
    try {
      loading.value = true
      console.log('[useMention] calling window.desktop.file.search...')
      const files = await window.desktop.file.search(query, directory.value)
      console.log('[useMention] file.search result:', files)
      
      return files.map(file => ({
        kind: 'file' as const,
        value: file.relativePath,
        display: `@${file.relativePath}`,
        directory: file.isDirectory,
        mime: file.mimeType,
        url: file.url
      }))
    } catch (err) {
      console.error('[useMention] searchFiles error:', err)
      error.value = err instanceof Error ? err.message : 'Failed to search files'
      return []
    } finally {
      loading.value = false
    }
  }
  
  async function getAgents(): Promise<MentionItem[]> {
    console.log('[useMention] getAgents called', { directory: directory.value })
    try {
      loading.value = true
      console.log('[useMention] calling window.desktop.session.agents...')
      const agents = await window.desktop.session.agents(directory.value)
      console.log('[useMention] agents result:', agents)
      console.log('[useMention] first agent:', agents[0])
      console.log('[useMention] agent modes:', agents.map(a => a.mode))
      
      const filtered = agents.filter(a => a.mode === 'subagent')
      console.log('[useMention] filtered agents:', filtered.length, 'out of', agents.length)
      
      return filtered.map(a => ({
        kind: 'agent' as const,
        value: a.name,
        display: `@${a.name}`,
        description: a.description
      }))
    } catch (err) {
      console.error('[useMention] getAgents error:', err)
      error.value = err instanceof Error ? err.message : 'Failed to get agents'
      return []
    } finally {
      loading.value = false
    }
  }
  
  async function getResources(): Promise<MentionItem[]> {
    console.log('[useMention] getResources called', { directory: directory.value })
    try {
      loading.value = true
      console.log('[useMention] calling window.desktop.mcp.resources...')
      const resources = await window.desktop.mcp.resources(directory.value)
      console.log('[useMention] mcp.resources result:', resources)
      
      const entries = Object.entries(resources)
      console.log('[useMention] resources entries count:', entries.length)
      
      return entries.map(([name, res]: [string, any]) => ({
        kind: 'resource' as const,
        value: name,
        display: `@${name}`,
        description: res?.description,
        mime: res?.mimeType,
        url: res?.uri
      }))
    } catch (err) {
      console.error('[useMention] getResources error:', err)
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