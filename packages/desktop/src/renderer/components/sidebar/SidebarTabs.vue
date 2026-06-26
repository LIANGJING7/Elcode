<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import SidebarWorkspaces from './SidebarWorkspaces.vue'
import SidebarSessions from './SidebarSessions.vue'
import { useWorkspaceStore } from '../../stores/workspace'

// 两 Tab: Workspaces(多目录管理) / 当前目录(当前 workspace 的会话).
// 无当前 workspace 时 sessions tab 禁用 — 没有锚点就没法列会话.
const workspace = useWorkspaceStore()
const { currentWorkspace } = storeToRefs(workspace)
const tab = ref<'workspaces' | 'sessions'>('workspaces')

// 当前 workspace 被移除(变为 null)时, sessions tab 失去锚点 → 退回 workspaces tab,
// 避免 sessions tab 渲染空列表且 New Session 变 no-op 的降级态.
watch(currentWorkspace, (ws) => {
  if (!ws) tab.value = 'workspaces'
})
</script>

<template>
  <div class="sidebar-tabs flex flex-col flex-1 min-h-0">
    <div class="tab-row flex px-2 pt-2 border-b border-border/60">
      <button
        data-tab="workspaces"
        class="flex-1 px-2 py-1.5 text-xs font-medium border-b-2 transition-colors duration-fast"
        :class="tab === 'workspaces'
          ? 'is-active border-accent text-text'
          : 'border-transparent text-text-muted hover:text-text-secondary'"
        @click="tab = 'workspaces'"
      >
        Workspaces
      </button>
      <button
        data-tab="sessions"
        class="flex-1 px-2 py-1.5 text-xs font-medium border-b-2 transition-colors duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
        :class="tab === 'sessions'
          ? 'is-active border-accent text-text'
          : 'border-transparent text-text-muted hover:text-text-secondary'"
        :disabled="!currentWorkspace"
        @click="tab = 'sessions'"
      >
        当前目录<span v-if="currentWorkspace" class="ml-1 text-text-muted">({{ currentWorkspace.name }})</span>
      </button>
    </div>

    <SidebarWorkspaces v-if="tab === 'workspaces'" />
    <SidebarSessions v-else />
  </div>
</template>

<style scoped>
.is-active {
  font-weight: 600;
}
</style>
