<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '../../stores/session'

const sessionStore = useSessionStore()

const messages = computed(() => sessionStore.revertedMessages)

async function handleRecover(messageId: string) {
  if (!sessionStore.currentSessionId) return
  await sessionStore.recoverMessage(sessionStore.currentSessionId, messageId)
}
</script>

<template>
  <div v-if="messages.length > 0" class="mx-6 pb-2">
    <div class="max-w-chat-max mx-auto border rounded-lg bg-muted/30 p-3">
      <div class="text-xs text-text-muted mb-2">{{ messages.length }} 条已撤销的消息</div>
      <div class="space-y-2">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex items-center justify-between bg-bg/50 rounded px-3 py-2"
        >
          <div class="flex-1 min-w-0">
            <span class="text-xs text-text-muted mr-2">用户:</span>
            <span class="text-sm truncate">{{ msg.content || '(仅文件)' }}</span>
          </div>
          <button
            @click="handleRecover(msg.id)"
            :disabled="sessionStore.isReverting"
            class="text-xs text-primary hover:underline disabled:opacity-50 ml-2 flex-shrink-0"
          >
            恢复到此
          </button>
        </div>
      </div>
    </div>
  </div>
</template>