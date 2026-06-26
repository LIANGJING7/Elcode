<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ title: string; sessionId: string; pinned?: boolean }>()
const emit = defineEmits<{
  rename: [title: string]
  copy: []
  pin: []
  delete: []
  export: []
}>()

const editing = ref(false)
const draft = ref('')
const menuOpen = ref(false)

function startEdit() {
  editing.value = true
  draft.value = props.title
}

function commitEdit() {
  editing.value = false
  if (draft.value && draft.value !== props.title) {
    emit('rename', draft.value)
  }
}

function closeMenu() {
  menuOpen.value = false
}
</script>

<template>
  <div class="chat-header flex items-center gap-2 px-4 py-2 border-b border-surface">
    <!-- 标题 / inline rename -->
    <button
      v-if="!editing"
      data-testid="title"
      class="text-lg font-medium truncate hover:bg-surface-hover px-2 py-1 rounded"
      @click="startEdit"
    >
      {{ title }}
    </button>
    <input
      v-else
      data-testid="rename-input"
      v-model="draft"
      class="text-lg font-medium px-2 py-1 rounded border border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      @keyup.enter="commitEdit"
      @blur="commitEdit"
    />

    <!-- 置顶标记 -->
    <span v-if="pinned" class="text-accent-muted">📌</span>

    <!-- 菜单按钮 -->
    <button
      data-testid="menu-btn"
      class="px-2 py-1 rounded hover:bg-surface-hover"
      @click="menuOpen = !menuOpen"
    >
      ⋯
    </button>

    <!-- 下拉菜单 -->
    <ul
      v-if="menuOpen"
      class="menu absolute right-4 top-10 bg-surface border border-surface rounded shadow-lg py-1 z-50"
    >
      <li>
        <button data-testid="menu-item" class="w-full px-4 py-2 hover:bg-surface-hover" @click="emit('copy'); closeMenu()">
          复制
        </button>
      </li>
      <li>
        <button data-testid="menu-item" class="w-full px-4 py-2 hover:bg-surface-hover" @click="startEdit(); closeMenu()">
          重命名
        </button>
      </li>
      <li>
        <button data-testid="menu-item" class="w-full px-4 py-2 hover:bg-surface-hover" @click="emit('pin'); closeMenu()">
          {{ pinned ? '取消置顶' : '置顶' }}
        </button>
      </li>
      <li>
        <button data-testid="menu-item" class="w-full px-4 py-2 hover:bg-surface-hover text-error" @click="emit('delete'); closeMenu()">
          删除
        </button>
      </li>
      <li>
        <button data-testid="menu-item" class="w-full px-4 py-2 hover:bg-surface-hover" @click="emit('export'); closeMenu()">
          导出 Markdown
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.menu {
  min-width: 160px;
}
</style>