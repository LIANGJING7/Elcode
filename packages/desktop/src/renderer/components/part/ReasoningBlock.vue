<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  content: string
  status: 'idle' | 'thinking' | 'done'
  duration?: number
}>()

const expanded = ref(props.status === 'thinking')

const durationText = computed(() => {
  if (!props.duration) return ''
  const ms = props.duration
  if (ms < 1000) return `${ms}ms`
  return `${Math.floor(ms / 1000)}s`
})
</script>

<template>
  <div v-if="status === 'idle' && !content" />
  <div v-else class="reasoning-block rounded border border-border my-2 overflow-hidden">
    <div
      class="reasoning-header flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none hover:bg-bg-surface"
      @click="expanded = !expanded"
    >
      <template v-if="status === 'thinking'">
        <svg
          class="w-3 h-3 text-text-muted transition-transform duration-150 shrink-0"
          :class="{ 'rotate-90': expanded }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-xs text-text-muted font-medium thinking-text">思考中</span>
      </template>
      <template v-else>
        <svg
          class="w-3 h-3 text-text-muted transition-transform duration-150 shrink-0"
          :class="{ 'rotate-90': expanded }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-xs text-text-muted font-medium">思考过程</span>
        <span v-if="durationText" class="text-xs text-text-muted"> &middot; {{ durationText }}</span>
      </template>
    </div>

    <div v-if="expanded" class="reasoning-body border-t border-border px-3 py-2">
      <div class="text-xs text-text-muted whitespace-pre-wrap leading-relaxed">{{ content }}</div>
      <div v-if="!content" class="text-xs text-text-muted animate-pulse opacity-50">...</div>
    </div>
  </div>
</template>

<style scoped>
.thinking-text {
  animation: thinking-fade 1.5s ease-in-out infinite;
}

@keyframes thinking-fade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
