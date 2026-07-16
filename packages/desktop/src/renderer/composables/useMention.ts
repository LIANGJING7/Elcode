import { ref, computed, watch } from 'vue'
import { useWorkspaceStore } from '../stores/workspace'
import fuzzysort from 'fuzzysort'
import type { MentionItem } from '../../types/mention'

export function useMention() {
  const workspaceStore = useWorkspaceStore()
  
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const directory = computed(() => workspaceStore.currentWorkspace?.path)
  
  const cachedAgents = ref<MentionItem[]>([])
  const cachedResources = ref<MentionItem[]>([])
  const agentsLoaded = ref(false)
  const resourcesLoaded = ref(false)
  
  async function loadAgents() {
    if (agentsLoaded.value) return
    try {
      loading.value = true
      console.log('[useMention] Loading agents for directory:', directory.value)
      const agents = await window.desktop.session.agents(directory.value)
      console.log('[useMention] Raw agents response:', agents)
      cachedAgents.value = agents
        .filter((a: any) => a.mode !== 'primary')
        .map((a: any) => ({
          kind: 'agent' as const,
          value: a.name,
          display: `@${a.name}`,
          description: a.description
        }))
      console.log('[useMention] Filtered agents:', cachedAgents.value)
      agentsLoaded.value = true
    } catch (err) {
      console.error('[useMention] Failed to load agents:', err)
      error.value = err instanceof Error ? err.message : 'Failed to get agents'
    } finally {
      loading.value = false
    }
  }
  
  async function loadResources() {
    if (resourcesLoaded.value) return
    try {
      loading.value = true
      const resources = await window.desktop.mcp.resources(directory.value)
      cachedResources.value = Object.entries(resources).map(([name, res]: [string, any]) => ({
        kind: 'resource' as const,
        value: name,
        display: `@${name}`,
        description: res.description,
        mime: res.mimeType,
        url: res.uri
      }))
      resourcesLoaded.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get resources'
    } finally {
      loading.value = false
    }
  }
  
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
  
  async function searchAll(query: string): Promise<MentionItem[]> {
    const nonFiles = [...cachedAgents.value, ...cachedResources.value]
    console.log('[searchAll] query:', query, 'cachedAgents:', cachedAgents.value.length, 'cachedResources:', cachedResources.value.length, 'nonFiles:', nonFiles.length)
    
    const files = await searchFiles(query)
    
    if (!query) {
      console.log('[searchAll] No query, returning first 10 nonFiles:', nonFiles.slice(0, 10))
      return [...nonFiles.slice(0, 10), ...files.slice(0, 10)]
    }
    
    const fuzzied = fuzzysort.go(query, nonFiles, {
      keys: ['value', 'description'],
      limit: 10,
      scoreFn: (objResults) => {
        let score = objResults.score
        const displayResult = objResults[0]
        if (displayResult && displayResult.target.startsWith(query)) {
          score *= 2
        }
        return score
      },
    }).map(r => r.obj)
    
    console.log('[searchAll] fuzzied results:', fuzzied.length, fuzzied)
    return [...fuzzied, ...files.slice(0, 10)]
  }
  
  watch(directory, () => {
    agentsLoaded.value = false
    resourcesLoaded.value = false
    cachedAgents.value = []
    cachedResources.value = []
  })
  
  return {
    loading,
    error,
    cachedAgents,
    cachedResources,
    agentsLoaded,
    resourcesLoaded,
    loadAgents,
    loadResources,
    searchFiles,
    searchAll
  }
}
