<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronRight, ChevronDown } from 'lucide-vue-next'
import { useSessionTodoStore } from '../../stores/sessionTodo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

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
      <Card class="todo-card">
        <!-- Header with count and collapse button -->
        <div class="todo-header" @click="collapsed = !collapsed">
          <Button variant="ghost" size="sm" class="collapse-btn">
            <ChevronRight v-if="collapsed" class="w-3.5 h-3.5" />
            <ChevronDown v-else class="w-3.5 h-3.5" />
            <span class="todo-count">Tasks</span>
          </Button>
          <Badge variant="success" class="todo-badge">
            {{ completedCount }}/{{ totalCount }} completed
          </Badge>
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
      </Card>
    </div>
  </div>
</template>

<style scoped>
.todo-panel-container {
  margin-bottom: -16px;
  position: relative;
  z-index: 1;
}

.todo-card {
  padding: 0;
  margin-bottom: 0;
  background: rgba(31, 31, 35, 0.5);
  border-color: rgba(39, 39, 42, 0.6);
}

:deep(.todo-card > div[data-slot="card"]) {
  padding: 12px 16px;
  gap: 0;
}

.todo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #71717a;
  cursor: pointer;
  user-select: none;
}

.todo-header:hover .todo-count {
  color: #e4e4e7;
}

.todo-count {
  color: #a1a1aa;
  margin-left: 4px;
}

.todo-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  border: none;
}

.collapse-btn {
  padding: 0 6px;
  height: 24px;
  color: #a1a1aa;
}

.collapse-btn :deep(svg) {
  color: #71717a;
}

.collapse-btn:hover {
  background: rgba(39, 39, 42, 0.3);
}

.collapse-btn:hover :deep(svg) {
  color: #e4e4e7;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 500px;
  overflow: hidden;
  transition: max-height 0.5s ease, opacity 0.5s ease;
}

.todo-list.collapsed {
  max-height: 0;
  opacity: 0;
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