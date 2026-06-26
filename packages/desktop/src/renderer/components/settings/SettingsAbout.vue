<template>
  <div class="settings-section">
    <h2 class="text-lg font-medium text-text mb-4">About</h2>

    <div class="space-y-4">
      <!-- App info -->
      <div class="p-4 rounded-lg bg-bg-hover border border-border">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <span class="text-accent font-bold text-lg">O</span>
          </div>
          <div>
            <h3 class="text-sm font-medium text-text">OpenCode Desktop</h3>
            <p class="text-2xs text-text-muted">AI-powered development assistant</p>
          </div>
        </div>

        <div class="text-2xs text-text-muted space-y-1">
          <p>Version: {{ version }}</p>
          <p>Electron: {{ electronVersion }}</p>
          <p>Platform: {{ platform }}</p>
        </div>
      </div>

      <!-- Links -->
      <div class="space-y-2">
        <a
          href="#"
          class="block p-3 rounded-lg bg-bg-hover border border-border hover:border-border-light text-sm text-text transition-colors"
          @click.prevent="openExternal('https://github.com/model-agent/opencode')"
        >
          GitHub Repository
        </a>
        <a
          href="#"
          class="block p-3 rounded-lg bg-bg-hover border border-border hover:border-border-light text-sm text-text transition-colors"
          @click.prevent="openExternal('https://opencode.dev/docs')"
        >
          Documentation
        </a>
      </div>

      <!-- Clear all sessions -->
      <div class="pt-4 border-t border-border">
        <h3 class="text-sm font-medium text-text mb-2">Danger Zone</h3>
        <button
          class="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 text-sm transition-colors"
          @click="handleClearAll"
        >
          Clear All Sessions
        </button>
        <p class="text-2xs text-text-muted mt-2">
          Delete all sessions for the current workspace
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWorkspaceStore } from '../../stores/workspace'
import { useSessionStore } from '../../stores/session'

const workspaceStore = useWorkspaceStore()
const sessionStore = useSessionStore()

const version = ref('0.1.0')
const electronVersion = ref(process.versions.electron || 'Unknown')
const platform = ref(process.platform)

function openExternal(url: string) {
  window.open(url, '_blank')
}

async function handleClearAll() {
  const ws = workspaceStore.currentWorkspace
  if (!ws) return
  
  const confirmed = confirm('Are you sure you want to delete all sessions? This cannot be undone.')
  if (!confirmed) return
  
  await sessionStore.clearAll(ws.id)
}
</script>

<style scoped>
.settings-section {
  /* Section styling */
}
</style>