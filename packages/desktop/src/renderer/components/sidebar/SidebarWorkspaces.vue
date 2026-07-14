<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { X } from 'lucide-vue-next'
import { useWorkspaceStore } from '../../stores/workspace'

const store = useWorkspaceStore()
const { workspaces, currentWorkspace } = storeToRefs(store)

// 删除确认状态
const showDeleteConfirm = ref(false)
const deletingWorkspaceId = ref<string | null>(null)
const deletingWorkspaceName = ref('')
const isDeleting = ref(false)

function select(id: string) {
  const ws = workspaces.value.find(w => w.id === id)
  if (ws) store.selectWorkspace(ws.path)
}

// 点击删除按钮：显示确认对话框
function handleDelete(ws: { id: string; name: string; path: string }) {
  deletingWorkspaceId.value = ws.id
  deletingWorkspaceName.value = ws.name
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  if (!deletingWorkspaceId.value) return
  const ws = workspaces.value.find(w => w.id === deletingWorkspaceId.value)
  if (!ws) return
  
  isDeleting.value = true
  await store.removeWorkspace(ws.path)
  isDeleting.value = false
  showDeleteConfirm.value = false
  deletingWorkspaceId.value = null
}

// 取消删除
function cancelDelete() {
  showDeleteConfirm.value = false
  deletingWorkspaceId.value = null
}
</script>

<template>
  <div class="sidebar-workspaces px-2 py-2">
    <ul class="space-y-0.5">
      <li v-for="ws in workspaces" :key="ws.id">
        <button
          :data-workspace-id="ws.id"
          class="workspace-row group w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-xs transition-colors duration-fast"
          :class="currentWorkspace?.id === ws.id
            ? 'is-current bg-accent-muted text-accent ring-1 ring-accent/20'
            : 'text-text-secondary hover:bg-bg-hover hover:text-text'"
          @click="select(ws.id)"
        >
          <span
            class="w-6 h-6 rounded flex items-center justify-center shrink-0 text-2xs font-bold"
            :class="currentWorkspace?.id === ws.id ? 'bg-accent text-bg' : 'bg-bg-active text-text-muted'"
          >{{ ws.name.charAt(0).toUpperCase() }}</span>
          <span class="truncate flex-1">{{ ws.name }}</span>
          <!-- 删除按钮：悬停时显示 -->
          <span
            role="button"
            tabindex="0"
            class="delete-btn cursor-pointer opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-active text-text-muted hover:text-text transition-all duration-fast shrink-0"
            @click.stop="handleDelete(ws)"
            @keydown.enter.stop="handleDelete(ws)"
          >
            <X class="w-3.5 h-3.5" />
          </span>
        </button>
      </li>
    </ul>

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
  </div>
</template>

<style scoped>
.is-current {
  font-weight: 600;
}
</style>
