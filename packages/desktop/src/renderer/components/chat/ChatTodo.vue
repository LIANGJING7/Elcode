<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSessionTodoStore } from '../../stores/sessionTodo'
const sessionTodoStore = useSessionTodoStore()
const { currentTodos } = storeToRefs(sessionTodoStore)
// Filter out cancelled tasks
const showItems = computed(() =>
  currentTodos.value.filter(t => t.status !== 'cancelled')
)
// Count statistics
const completedCount = computed(() =>
  showItems.value.filter(t => t.status === 'completed').length
)
const totalCount = computed(() => showItems.value.length)
// Has active (non-completed) tasks
const hasActive = computed(() =>
  showItems.value.some(t => t.status !== 'completed')
)
// Show panel only when there are active tasks
const show = computed(() => hasActive.value && totalCount.value > 0)
// Collapse state (not persisted)
const collapsed = ref(false)
</script>

<template>
  <div v-if="show" class="todo-panel-container">
    <div class="max-w-chat-max mx-auto px-6">
      <div class="todo-panel">
        <!-- Header with count and collapse button -->
        <div class="todo-header">
          <button class="collapse-btn" @click="collapsed = !collapsed">
            <span class="collapse-arrow">{{ collapsed ? '▶' : '▼' }}</span>
            <span class="todo-count">Tasks</span>
          </button>
          <span class="todo-progress">{{ completedCount }}/{{ totalCount }} completed</span>
        </div>

        <!-- Todo list (collapsed controls visibility) -->
        <div class="todo-list" :class="{ collapsed }">
          <!-- Single v-for loop preserving order -->
          <div
            v-for="(item, i) in showItems"
            :key="i"
            class="todo-item"
          >
            <!-- Status dot (8px colored circle) -->
            <div class="todo-dot" :class="item.status"></div>
            <!-- Task content with conditional styling for completed -->
            <div
              class="todo-content"
              :class="{ completed: item.status === 'completed' }"
            >
              {{ item.content }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.todo-panel-container {
  margin-bottom: 0;
}
.todo-panel {
  background: rgba(31, 31, 35, 0.5);
  border-top: 1px solid rgba(39, 39, 42, 0.6);
  border-radius: 0;
  padding: 12px 16px;
}
.todo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #71717a;
}
.todo-count {
  color: #a1a1aa;
}
.todo-progress {
  color: #22c55e;
}
.collapse-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #a1a1aa;
  cursor: pointer;
  padding: 0;
  background: transparent;
  border: none;
  transition: color 0.15s ease;
}
.collapse-btn:hover {
  color: #e4e4e7;
}
.collapse-arrow {
  font-size: 10px;
  color: #71717a;
}
.collapse-btn:hover {
  color: #a1a1aa;
}
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 300px;
  overflow-y: auto;
  transition: opacity 0.15s ease;
}
.todo-list.collapsed {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}
.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-size: 13px;
  border-radius: 4px;
  transition: background 0.15s ease;
}
.todo-item:hover {
  background: rgba(39, 39, 42, 0.3);
}
.todo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.todo-dot.completed {
  background: #22c55e;
}
.todo-dot.in-progress {
  background: #6366f1;
}
.todo-dot.pending {
  background: #71717a;
}
.todo-content {
  color: #e4e4e7;
  line-height: 1.4;
  word-wrap: break-word;
}
.todo-content.completed {
  opacity: 0.5;
  color: #a1a1aa;
}
.todo-list::-webkit-scrollbar {
  width: 4px;
}
.todo-list::-webkit-scrollbar-track {
  background: rgba(39, 39, 42, 0.3);
  border-radius: 2px;
}
.todo-list::-webkit-scrollbar-thumb {
  background: rgba(113, 113, 122, 0.5);
  border-radius: 2px;
}
.todo-list::-webkit-scrollbar-thumb:hover {
  background: rgba(113, 113, 122, 0.8);
}
</style>