<script setup lang="ts">
import { Sparkles, Zap, Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useUiStore, type View } from '../../stores/ui'
import { useSessionStore } from '../../stores/session'
import { useWorkspaceStore } from '../../stores/workspace'
import { navigationRegistry } from '../../navigation/navigationRegistry'

const ui = useUiStore()
const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const { currentWorkspace } = storeToRefs(workspaceStore)
const emit = defineEmits<{
  'select-nav': [view: Exclude<View, 'welcome' | 'chat' | 'settings'>]
  'enter-settings': [section?: string]
}>()

const sorted = [...navigationRegistry].sort((a, b) => a.order - b.order)

// icon mapping
function iconComponent(name: string) {
  switch (name) {
    case 'sparkles': return Sparkles
    case 'bolt': return Zap
    default: return null
  }
}

function handleClick(item: typeof navigationRegistry[0]) {
  if (item.enterSettings) {
    emit('enter-settings', item.settingsSection)
  } else {
    emit('select-nav', item.view)
  }
}

// 新建会话: 置 currentSessionId=null + isPendingNewSession=true.
// 不在这里 setView — effectiveView (App.vue) 据业务态自动落到 newSession 视图.
// 无当前 workspace 时禁用: createSession 需要目录锚点, 否则是 no-op.
function newSession() {
  sessionStore.startNewSession()
}
</script>

<template>
  <div class="sidebar-header px-3 pb-3 pt-0">
    <nav class="nav-list flex flex-col gap-0.5">
      <Button
        v-for="item in sorted"
        :key="item.id"
        :data-nav-id="item.id"
        variant="ghost"
        class="flex items-center justify-start w-full gap-2 px-2 py-1.5 text-sm text-left"
        :class="{ 'bg-accent/10 text-accent': item.enterSettings ? (ui.view === 'settings' && ui.settingsSection === item.settingsSection) : (ui.view === item.view) }"
        @click="handleClick(item)"
      >
        <component :is="iconComponent(item.icon)" v-if="iconComponent(item.icon)" class="w-4 h-4 shrink-0" />
        <span class="truncate">{{ item.label }}</span>
      </Button>
    </nav>

    <!-- 新建会话: 技能 nav 下方, 始终可见的主操作 CTA -->
    <button
      data-testid="new-session"
      type="button"
      class="new-session-btn mt-2 w-full inline-flex items-center justify-center gap-2 h-8 rounded-md px-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors duration-fast shrink-0"
      :disabled="!currentWorkspace"
      :title="!currentWorkspace ? '请先选择工作区' : undefined"
      @click="newSession"
    >
      <Plus class="w-4 h-4 shrink-0" />
      <span>新建会话</span>
    </button>
  </div>
</template>
