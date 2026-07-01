<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        class="h-8 px-3 rounded-lg bg-bg-elevated hover:bg-bg-hover text-sm text-text flex items-center gap-2 transition-colors"
      >
        <svg class="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>{{ displayName }}</span>
        <svg class="w-3 h-3 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="start" :side-offset="4">
      <DropdownMenuItem
        v-for="ws in workspaces"
        :key="ws.path"
        class="px-3 py-1.5 text-sm text-text cursor-pointer"
        @click="handleSelect(ws.path)"
      >
        <span v-if="ws.path === currentPath" class="mr-2 text-accent">✓</span>
        <span v-else class="mr-2 w-4 inline-block"></span>
        {{ ws.name }}
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem class="px-3 py-1.5 text-sm text-text cursor-pointer" @click="handleAdd">
        <span class="mr-2">+</span>
        添加工作区
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useWorkspaceStore } from '../../stores/workspace'

const workspaceStore = useWorkspaceStore()

const workspaces = computed(() => workspaceStore.workspaces)
const currentWorkspace = computed(() => workspaceStore.currentWorkspace)
const currentPath = computed(() => currentWorkspace.value?.path)

const displayName = computed(() => {
  return currentWorkspace.value?.name ?? '选择工作区'
})

async function handleSelect(path: string) {
  await workspaceStore.selectWorkspace(path)
}

async function handleAdd() {
  await workspaceStore.pickAndAddWorkspace()
}
</script>
