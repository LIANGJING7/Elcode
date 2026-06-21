<template>
  <div class="app-container h-screen flex bg-bg">
    <div class="w-sidebar bg-bg-secondary border-r border-border flex flex-col">
      <div class="p-3">
        <h2 class="text-sm font-medium text-text-muted">Sidebar</h2>
      </div>
    </div>
    <main class="flex-1 flex flex-col">
      <div class="flex-1 flex items-center justify-center text-text-muted">
        Chat content area
      </div>
      <div class="p-4 bg-bg-secondary border-t border-border">
        <input 
          type="text" 
          placeholder="Type a message..." 
          class="w-full p-3 bg-bg-tertiary border border-border rounded-lg text-text text-sm focus:border-accent outline-none transition-border-color duration-fast"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  console.log('App mounted')
  console.log('Desktop API available:', window.desktop)
})
</script>