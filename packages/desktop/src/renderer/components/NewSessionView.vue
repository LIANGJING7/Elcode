<script setup lang="ts">
import { onMounted, nextTick } from 'vue'
import { useSessionStore } from '../stores/session'
import { useUiStore } from '../stores/ui'
import Composer from './Composer.vue'

const sessionStore = useSessionStore()
const ui = useUiStore()

onMounted(() => nextTick())

async function handleSend(content: string, options: Record<string, unknown>) {
  if (!sessionStore.currentSessionId && !sessionStore.isPendingNewSession) {
    sessionStore.startNewSession()
  }
  const mode = options.mode as string
  const agent = mode === 'plan' ? 'plan' : 'build'
  await sessionStore.sendMessage(content, { agent })
}

function handleInterrupt() {}
</script>

<template>
  <div class="new-session-view flex-1 flex items-center justify-center bg-bg">
    <div class="w-full max-w-2xl mx-6">
      <div class="text-4xl font-bold text-text-muted/30 mb-4 text-center select-none">
        ELCODE
      </div>
      <Composer
        :has-active-session="false"
        :is-streaming="false"
        :queue-count="0"
        @send="handleSend"
        @interrupt="handleInterrupt"
      />
    </div>
  </div>
</template>

<style scoped>
.new-session-view {
  background-image:
    radial-gradient(ellipse at top left, var(--color-accent-glow) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, var(--color-accent-muted) 0%, transparent 50%);
}
</style>
