<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-vue-next'
import { useWorkspaceStore } from '../../stores/workspace'

const store = useWorkspaceStore()
const { workspaces, currentWorkspace } = storeToRefs(store)

// + Add Workspace = 显式调 openFolderPicker(弹目录对话框), 拿到 path 再 addWorkspace.
// 与 SidebarSessions 的 + New Session(createSession, 不弹目录) 语义区分开.
async function add() {
  const path = await store.openFolderPicker()
  if (path) await store.addWorkspace(path)
}

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

    <Button
      variant="outline"
      data-testid="add-workspace"
      size="sm"
      class="mt-1 w-full gap-2"
      @click="add"
    >
      <Plus class="w-4 h-4" />
      <span>Add Workspace</span>
    </Button>
  </div>
</template>

<style scoped>
.is-current {
  font-weight: 600;
}
</style>
