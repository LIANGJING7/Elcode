<script setup lang="ts">
defineProps<{ content: string; tokens?: number }>()
</script>

<template>
  <details class="reasoning-block my-2 rounded">
    <summary class="flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary font-medium cursor-pointer hover:bg-bg-surface rounded transition-colors">
      <svg class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      Reasoning
      <span v-if="tokens" class="text-text-muted ml-auto text-xs">{{ tokens }} tokens</span>
    </summary>
    <div class="px-3 pb-2 pt-1 text-xs text-text-muted whitespace-pre-wrap leading-relaxed">{{ content }}</div>
  </details>
</template>