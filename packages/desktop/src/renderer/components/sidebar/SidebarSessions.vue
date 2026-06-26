<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '../../stores/session'
import { useWorkspaceStore } from '../../stores/workspace'
import { useUiStore } from '../../stores/ui'

const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const ui = useUiStore()
const { conversations, currentSessionId } = storeToRefs(sessionStore)
const { currentWorkspace } = storeToRefs(workspaceStore)

const search = ref('')

// 只列当前 workspace 的会话(按 primaryWorkspaceId 锚点), 再叠标题搜索.
const filtered = computed(() => {
  const cid = currentWorkspace.value?.id
  return conversations.value
    .filter(c => c.primaryWorkspaceId === cid)
    .filter(c => c.title.toLowerCase().includes(search.value.toLowerCase()))
})

// + New Session: 直接 createSession(当前 workspace), 不弹目录对话框.
// (与 SidebarWorkspaces 的 + Add Workspace 语义区分)
async function newSession() {
  const ws = currentWorkspace.value
  if (!ws) return
  await sessionStore.createSession({ workspaceId: ws.id, path: ws.path })
  ui.setView('chat')
}

// 选会话: 设 currentSessionId(驱动 currentConversation/currentMessages/hasActiveSession),
// 再切到 chat 视图. 会话消息的懒加载在 phase 3 messageStore 落地.
function select(id: string) {
  sessionStore.selectSession(id)
  ui.setView('chat')
}
</script>

<template>
  <div class="sidebar-sessions flex flex-col min-h-0 px-2 py-2">
    <div class="px-1 mb-2">
      <input
        data-testid="search"
        v-model="search"
        type="text"
        placeholder="Search conversations..."
        class="w-full px-2.5 py-1.5 bg-bg-surface border border-border hover:border-border-light focus:border-accent/50 rounded-lg text-text text-xs placeholder:text-text-muted outline-none transition-all duration-fast"
      />
    </div>

    <ul v-if="filtered.length > 0" class="flex-1 overflow-y-auto space-y-0.5">
      <li v-for="c in filtered" :key="c.id">
        <button
          :data-session-id="c.id"
          class="session-row w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-xs transition-colors duration-fast"
          :class="c.id === currentSessionId
            ? 'is-active bg-accent-muted text-accent ring-1 ring-accent/20'
            : 'text-text-secondary hover:bg-bg-hover hover:text-text'"
          @click="select(c.id)"
        >
          <span
            class="w-5 h-5 rounded flex items-center justify-center shrink-0 text-2xs font-bold"
            :class="c.id === currentSessionId ? 'bg-accent text-white' : 'bg-bg-active text-text-muted'"
          >{{ c.title.charAt(0).toUpperCase() }}</span>
          <span class="truncate">{{ c.title }}</span>
        </button>
      </li>
    </ul>

    <div
      v-else
      class="flex-1 flex items-center justify-center text-text-muted text-xs text-center px-4"
    >
      <span v-if="search">No conversations match "{{ search }}"</span>
      <span v-else>No conversations yet</span>
    </div>

    <button
      data-testid="new-session"
      class="new-session mt-1 w-full flex items-center gap-2 px-2.5 py-2 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-all duration-fast"
      @click="newSession"
    >
      <span class="text-sm leading-none">+</span>
      <span>New Session</span>
    </button>
  </div>
</template>
