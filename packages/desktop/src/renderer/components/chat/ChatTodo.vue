<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronRight, ChevronDown, Square, CheckSquare, Circle } from 'lucide-vue-next'
import { useSessionTodoStore } from '../../stores/sessionTodo'
import { Card } from '@/components/ui/card'

const sessionTodoStore = useSessionTodoStore()
const { currentTodos } = storeToRefs(sessionTodoStore)

const showItems = computed(() =>
  currentTodos.value.filter(t => t.status !== 'cancelled')
)

const completedCount = computed(() =>
  showItems.value.filter(t => t.status === 'completed').length
)
const totalCount = computed(() => showItems.value.length)

const hasActive = computed(() =>
  showItems.value.some(t => t.status !== 'completed')
)

const show = computed(() => hasActive.value && totalCount.value > 0)

const collapsed = ref(false)

function getStatusIcon(status: string) {
  if (status === 'completed') return CheckSquare
  if (status === 'in_progress') return Circle
  return Square
}
</script>

<template>
  <div v-if="show" class="todo-panel-container">
    <div class="max-w-chat-max mx-auto">
      <Card class="todo-card rounded-b-none border-b-0 !gap-0">
        <div class="todo-header" @click="collapsed = !collapsed">
          <div class="header-left">
            <span class="header-text">已完成 {{ completedCount }} 个任务（共 {{ totalCount }} 个）</span>
            <ChevronDown v-if="!collapsed" class="header-chevron w-4 h-4" />
            <ChevronRight v-else class="header-chevron w-4 h-4" />
          </div>
        </div>

        <div class="todo-list pb-2 pt-2" :class="{ collapsed }">
          <div class="todo-list-inner ">
            <div
              v-for="(item, i) in showItems"
              :key="i"
              class="todo-item"
            >
              <component
                :is="getStatusIcon(item.status)"
                class="todo-icon"
                :class="{ 'icon-completed': item.status === 'completed', 'icon-progress': item.status === 'in_progress' }"
              />
              <div
                class="todo-content"
                :class="{ completed: item.status === 'completed' }"
              >
                {{ item.content }}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.todo-panel-container {
  margin-bottom: -24px;
  position: relative;
}

.todo-card {
  padding: 0 0 10px 0;
  margin-bottom: 0;
  background: var(--color-bg-elevated);
  border-color: var(--color-border);
  border-radius: 8px 8px 0 0;
  border-bottom-width: 0;
  box-shadow: none;
}

:deep(.todo-card > div[data-slot="card"]) {
  padding: 0 16px 12px 16px;
}

.todo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  padding: 8px 0 5px 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-text {
  font-size: 14px;
  color: var(--color-text);
  font-weight: 500;
}

.header-chevron {
  color: var(--color-text-muted);
  transition: transform 0.2s ease;
}

.todo-list {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.4s ease-in-out, opacity 0.4s ease-in-out;
}

.todo-list.collapsed {
  grid-template-rows: 0fr;
  opacity: 0;
}

.todo-list-inner {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px 8px 8px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 8px;
  font-size: 13px;
}

.todo-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.todo-icon.icon-completed {
  color: var(--color-text-muted);
}

.todo-icon.icon-progress {
  color: var(--color-accent);
  fill: var(--color-accent);
  animation: pulse-ring 2s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.todo-content {
  color: var(--color-text);
  line-height: 1.5;
  word-wrap: break-word;
  flex: 1;
}

.todo-content.completed {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.todo-list-inner::-webkit-scrollbar {
  width: 4px;
}

.todo-list-inner::-webkit-scrollbar-track {
  background: var(--color-bg-surface);
  border-radius: 2px;
}

.todo-list-inner::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.todo-list-inner::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}
</style>
