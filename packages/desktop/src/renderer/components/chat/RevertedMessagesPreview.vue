<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, ChevronDown, Undo2 } from 'lucide-vue-next'
import { useSessionStore } from '../../stores/session'
import { Card } from '@/components/ui/card'

const sessionStore = useSessionStore()

const messages = computed(() => sessionStore.revertedMessages)
const collapsed = ref(false)

async function handleRecover(messageId: string) {
  if (!sessionStore.currentSessionId) return
  await sessionStore.recoverMessage(sessionStore.currentSessionId, messageId)
}
</script>

<template>
  <div v-if="messages.length > 0" class="reverted-panel-container">
    <div class="max-w-chat-max mx-auto">
      <Card class="reverted-card rounded-b-none border-b-0">
        <div class="reverted-header" @click="collapsed = !collapsed">
          <div class="header-left">
            <span class="header-text">{{ messages.length }} 条已撤销的消息</span>
            <ChevronDown v-if="!collapsed" class="header-chevron w-4 h-4" />
            <ChevronRight v-else class="header-chevron w-4 h-4" />
          </div>
        </div>

        <div class="reverted-list" :class="{ collapsed }">
          <div class="reverted-list-inner">
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="reverted-item"
            >
              <span class="item-content">{{ msg.content || '(仅文件)' }}</span>
              <button
                @click.stop="handleRecover(msg.id)"
                :disabled="sessionStore.isReverting"
                class="recover-btn"
              >
                <Undo2 class="w-3.5 h-3.5" />
                <span>恢复消息</span>
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.reverted-panel-container {
  margin-bottom: -24px;
  position: relative;
  z-index: 0;
}

.reverted-card {
  padding: 0;
  margin-bottom: 0;
  background: rgba(31, 31, 35, 0.5);
  border-color: rgba(39, 39, 42, 0.6);
  border-radius: 8px 8px 0 0;
  border-bottom-width: 0;
  box-shadow: none;
}

:deep(.reverted-card > div[data-slot="card"]) {
  padding: 0 16px 12px 16px;
}

.reverted-header {
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
  color: #e4e4e7;
  font-weight: 500;
}

.header-chevron {
  color: #71717a;
  transition: transform 0.2s ease;
}

.reverted-list {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.4s ease-in-out, opacity 0.4s ease-in-out;
}

.reverted-list.collapsed {
  grid-template-rows: 0fr;
  opacity: 0;
}

.reverted-list-inner {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 8px 8px 8px;
}

.reverted-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(39, 39, 42, 0.4);
  border-radius: 6px;
  border: 1px solid rgba(63, 63, 70, 0.4);
}

.item-content {
  font-size: 13px;
  color: #a1a1aa;
  line-height: 1.4;
  word-wrap: break-word;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recover-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: #d4d0c8;
  background: rgba(63, 63, 70, 0.4);
  border: 1px solid rgba(82, 82, 91, 0.5);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.recover-btn:hover:not(:disabled) {
  background: rgba(63, 63, 70, 0.6);
  border-color: rgba(113, 113, 122, 0.6);
}

.recover-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>