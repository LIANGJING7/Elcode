<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDebounceFn } from '@vueuse/core'
import { X, Loader2 } from 'lucide-vue-next'
import { useSessionStore } from '../../stores/session'
import { useWorkspaceStore } from '../../stores/workspace'
import { useUiStore } from '../../stores/ui'
import { useStreamingStore } from '../../stores/streaming'

const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const ui = useUiStore()
const streamingStore = useStreamingStore()

// 使用新的分层结构
const { state, pagination, hasMore } = storeToRefs(sessionStore)
const { currentWorkspace } = storeToRefs(workspaceStore)
const currentSessionId = computed(() => sessionStore.currentSessionId)

// Debug: watch conversations changes
watch(
  () => state.value.conversations,
  (convs) => {
    console.log('[SIDEBAR_SESSIONS] Conversations updated:', convs.length, 'items')
    if (convs.length > 0) {
      console.log('[SIDEBAR_SESSIONS] First conversation:', JSON.stringify(convs[0]).slice(0, 150))
      
      // Check for child sessions (should not exist)
      const childSessions = convs.filter(c => c.parentID !== null && c.parentID !== undefined)
      console.log('[SIDEBAR_SESSIONS] Child sessions in list (SHOULD BE 0):', childSessions.length)
      if (childSessions.length > 0) {
        console.error('[SIDEBAR_SESSIONS] BUG: Child sessions appearing in Sidebar!', 
          childSessions.map(c => ({ id: c.id, title: c.title, parentID: c.parentID })))
      }
    }
  },
  { immediate: true }
)

// Debug: watch loading state
watch(
  () => state.value.isLoading,
  (loading) => {
    console.log('[SIDEBAR_SESSIONS] isLoading changed to:', loading)
  }
)

// Debug: watch error state
watch(
  () => state.value.error,
  (error) => {
    if (error) {
      console.error('[SIDEBAR_SESSIONS] Error detected:', error)
    }
  }
)

// 搜索输入（debounce 300ms 在 UI 层处理）
const searchInput = ref('')
const debouncedSearch = useDebounceFn((value: string) => {
  sessionStore.setSearch(value)
  sessionStore.reload()
}, 300)

watch(searchInput, (value) => {
  debouncedSearch(value)
})

// 滚动容器 ref
const scrollContainer = ref<HTMLElement | null>(null)

// 滚动检测 - 触发加载更多
const SCROLL_THRESHOLD = 100  // 距底部 100px 触发

function onScroll() {
  if (!scrollContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  
  // 检测是否接近底部
  if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
    sessionStore.tryLoadMore()  // UI 不需要知道内部判断
  }
}

// 删除确认状态
const showDeleteConfirm = ref(false)
const deletingSessionId = ref<string | null>(null)
const deletingSessionTitle = ref('')
const isDeleting = ref(false)

// 选择会话
function select(id: string) {
  console.log('[DEBUG SidebarSessions] select called, id:', id)
  sessionStore.selectSession(id)
  // Don't need to call ui.setView('chat') - effectiveView handles this
}

// 点击删除按钮：显示确认对话框
function handleDelete(id: string) {
  const conv = state.value.conversations.find(c => c.id === id)
  deletingSessionId.value = id
  deletingSessionTitle.value = conv?.title || '此会话'
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  if (!deletingSessionId.value) return
  isDeleting.value = true
  await sessionStore.deleteSession(deletingSessionId.value)
  isDeleting.value = false
  showDeleteConfirm.value = false
  deletingSessionId.value = null
}

// 取消删除
function cancelDelete() {
  showDeleteConfirm.value = false
  deletingSessionId.value = null
}

// 检查会话是否正在流式
function isSessionStreaming(sessionId: string): boolean {
  return streamingStore.isStreaming(sessionId)
}
</script>

<template>
  <div class="sidebar-sessions flex flex-col h-full min-h-0 px-2 py-2">
    <!-- 搜索框 -->
    <div class="px-1 mb-2 shrink-0">
      <input
        data-testid="search"
        v-model="searchInput"
        type="text"
        placeholder="Search conversations..."
        class="w-full px-2.5 py-1.5 bg-bg-surface border border-border hover:border-border-light focus:border-accent/50 rounded-lg text-text text-xs placeholder:text-text-muted outline-none transition-all duration-fast"
      />
    </div>

    <!-- 列表容器：滚动监听 -->
    <ul 
      ref="scrollContainer"
      v-if="state.conversations.length > 0 || state.isLoading"
      @scroll="onScroll"
      class="flex-1 min-h-0 overflow-y-auto space-y-0.5"
    >
      <!-- Skeleton loading -->
      <div v-if="state.isLoading && state.conversations.length === 0" class="py-4 text-center">
        <Loader2 class="w-4 h-4 animate-spin text-text-muted mx-auto" />
        <span class="text-xs text-text-muted mt-2">Loading...</span>
      </div>
      
      <!-- 会话列表 -->
      <li v-for="c in state.conversations" :key="c.id">
        <div
          :data-session-id="c.id"
          role="button"
          tabindex="0"
          class="session-row group w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-xs transition-colors duration-fast cursor-pointer"
          :class="[
            c.id === currentSessionId
              ? 'is-active bg-accent-muted text-accent'
              : 'text-text-secondary hover:bg-bg-hover hover:text-text',
            isSessionStreaming(c.id) ? 'streaming-session' : ''
          ]"
          @click="select(c.id)"
          @keydown.enter="select(c.id)"
          @keydown.space.prevent="select(c.id)"
        >
          <span class="truncate flex-1">{{ c.title }}</span>
          <!-- 流式状态指示器 -->
          <Loader2 
            v-if="isSessionStreaming(c.id)" 
            class="w-3.5 h-3.5 text-accent animate-spin shrink-0"
          />
          <!-- 删除按钮：悬停时显示 -->
          <button
            class="delete-btn opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-active text-text-muted hover:text-text transition-all duration-fast shrink-0"
            @click.stop="handleDelete(c.id)"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </li>
      
      <!-- 加载更多指示器 -->
      <div v-if="state.isLoadingMore" class="py-3 text-center">
        <Loader2 class="w-4 h-4 animate-spin text-text-muted mx-auto" />
        <span class="text-xs text-text-muted mt-1">Loading more...</span>
      </div>
      
      <!-- 没有更多 -->
      <div 
        v-if="!hasMore && state.conversations.length > 0 && !state.isLoadingMore" 
        class="py-2 text-center text-text-muted text-xs"
      >
        暂无更多会话
      </div>
    </ul>

    <!-- 空状态 -->
    <div
      v-if="!state.isLoading && state.conversations.length === 0"
      class="flex-1 flex items-center justify-center text-text-muted text-xs text-center px-4 min-h-0"
    >
      <span v-if="searchInput">No conversations match "{{ searchInput }}"</span>
      <span v-else>No conversations yet</span>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-sm p-5">
        <h3 class="text-sm font-medium text-text mb-2">确认删除</h3>
        <p class="text-xs text-text-muted mb-4">
          确定要删除「{{ deletingSessionTitle }}」吗？此操作不可撤销。
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
            {{ isDeleting ? '删除中...' : '删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 选中会话样式 */
.session-row.is-active {
  background-color: var(--color-accent-muted);
  font-weight: 500;
}

/* 正在生成的会话样式 */
.streaming-session {
  position: relative;
  overflow: hidden;
}

/* 添加左侧进度条动画 */
.streaming-session::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--color-accent) 50%,
    transparent 100%
  );
  animation: slideDown 1.5s ease-in-out infinite;
}

@keyframes slideDown {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100%);
  }
}

/* 让删除按钮在 streaming 时始终可见（与 loading 竞争位置时隐藏） */
.streaming-session .delete-btn {
  opacity: 0;
}

.streaming-session:hover .delete-btn {
  opacity: 1;
}
</style>