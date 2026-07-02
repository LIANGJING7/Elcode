<template>
  <DropdownMenu v-model:open="dropdownOpen">
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
        class="px-3 py-1.5 text-sm text-text cursor-pointer flex items-center justify-between group"
        @click="handleSelect(ws.path)"
      >
        <span class="flex items-center">
          <span v-if="ws.path === currentPath" class="mr-2 text-accent">✓</span>
          <span v-else class="mr-2 w-4 inline-block"></span>
          {{ ws.name }}
        </span>
        <!-- 删除按钮：悬停时显示 -->
        <button
          class="delete-btn opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-active text-text-muted hover:text-text transition-all duration-fast shrink-0"
          @click.stop="handleRemove(ws)"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem class="px-3 py-1.5 text-sm text-text cursor-pointer" @click="handleAdd">
        <span class="mr-2">+</span>
        添加工作区
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <!-- 删除确认对话框 -->
  <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-sm p-5">
      <h3 class="text-sm font-medium text-text mb-2">确认移除</h3>
      <p class="text-xs text-text-muted mb-4">
        确定要移除工作区「{{ deletingWorkspaceName }}」吗？
      </p>
      <div class="flex gap-2 justify-end">
        <button
          class="px-4 py-2 text-xs bg-bg border border-border hover:border-border-light rounded text-text cursor-pointer transition-all duration-fast"
          @click="cancelDelete"
        >
          取消
        </button>
        <button
          class="px-4 py-2 text-xs bg-bg-active hover:bg-bg-hover rounded text-text-secondary hover:text-text cursor-pointer transition-all duration-fast"
          :disabled="isDeleting"
          @click="confirmDelete"
        >
          {{ isDeleting ? '移除中...' : '移除' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { X } from 'lucide-vue-next'
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

// 删除确认状态
const dropdownOpen = ref(false)
const showDeleteConfirm = ref(false)
const deletingWorkspacePath = ref<string | null>(null)
const deletingWorkspaceName = ref('')
const isDeleting = ref(false)

async function handleSelect(path: string) {
  await workspaceStore.selectWorkspace(path)
}

async function handleAdd() {
  await workspaceStore.pickAndAddWorkspace()
}

function handleRemove(ws: { name: string; path: string }) {
  dropdownOpen.value = false // 关闭下拉菜单
  deletingWorkspacePath.value = ws.path
  deletingWorkspaceName.value = ws.name
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deletingWorkspacePath.value) return
  
  isDeleting.value = true
  await workspaceStore.removeWorkspace(deletingWorkspacePath.value)
  isDeleting.value = false
  showDeleteConfirm.value = false
  deletingWorkspacePath.value = null
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deletingWorkspacePath.value = null
}
</script>
