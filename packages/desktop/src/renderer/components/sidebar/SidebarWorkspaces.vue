<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useWorkspaceStore } from '../../stores/workspace'

const store = useWorkspaceStore()
const { workspaces, currentWorkspace } = storeToRefs(store)

function select(id: string) {
  const ws = workspaces.value.find(w => w.id === id)
  if (ws) store.selectWorkspace(ws.path)
}
</script>

<template>
  <div class="sidebar-workspaces px-2 py-2">
    <ul class="space-y-0.5">
      <li v-for="ws in workspaces" :key="ws.id">
        <button
          :data-workspace-id="ws.id"
          class="workspace-row w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-xs transition-colors duration-fast"
          :class="currentWorkspace?.id === ws.id
            ? 'is-current bg-accent-muted text-accent ring-1 ring-accent/20'
            : 'text-text-secondary hover:bg-bg-hover hover:text-text'"
          @click="select(ws.id)"
        >
          <span
            class="w-6 h-6 rounded flex items-center justify-center shrink-0 text-2xs font-bold"
            :class="currentWorkspace?.id === ws.id ? 'bg-accent text-bg' : 'bg-bg-active text-text-muted'"
          >{{ ws.name.charAt(0).toUpperCase() }}</span>
          <span class="truncate">{{ ws.name }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.is-current {
  font-weight: 600;
}
</style>
