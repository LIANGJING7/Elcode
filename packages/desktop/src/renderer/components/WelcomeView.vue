<script setup lang="ts">
defineEmits<{ openFolder: [] }>()
</script>

<template>
  <div class="empty-state flex-1 flex items-center justify-center animate-fade-in">
    <div class="text-center max-w-md">
      <div class="w-20 h-20 mx-auto mb-6 rounded-2xl bg-bg-surface flex items-center justify-center shadow-lg">
        <svg class="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-text mb-2">Welcome to OpenCode</h2>
      <p class="text-sm text-text-muted mb-6 leading-relaxed">
        Open a folder to start chatting with your codebase.
        OpenCode can read, write, and edit files, run commands, and help you build faster.
      </p>
      <button
        class="open-folder-button inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-xl transition-all duration-fast shadow-md hover:shadow-glow active:scale-[0.98]"
        @click="$emit('openFolder')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>Open Folder</span>
      </button>
      <p class="text-2xs text-text-muted mt-4">
        <kbd class="bg-bg-surface px-1.5 py-0.5 rounded font-mono">Ctrl</kbd>
        +
        <kbd class="bg-bg-surface px-1.5 py-0.5 rounded font-mono">O</kbd>
        to open quickly
      </p>
    </div>
  </div>
</template>