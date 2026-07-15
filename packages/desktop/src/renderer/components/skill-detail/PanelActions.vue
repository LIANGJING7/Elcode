<template>
  <div class="panel-actions flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
    <button
      class="action-btn"
      :class="{ copied }"
      @click="handleCopy"
    >
      <span class="btn-label relative inline-flex items-center gap-1.5">
        <Transition name="copy-feedback" mode="out-in">
          <span v-if="copied" key="copied">
            <span class="check-icon">&#10003;</span>
            Copied!
          </span>
          <span v-else key="copy">Copy</span>
        </Transition>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  content?: string
}>()

const copied = ref(false)
let timer: ReturnType<typeof setTimeout>

async function handleCopy() {
  if (!props.content) return

  try {
    await navigator.clipboard.writeText(props.content)
    copied.value = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>

<style scoped>
.panel-actions {
  flex-shrink: 0;
}

.action-btn {
  cursor: pointer;
  min-width: 80px;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--bg-elevated);
}

.action-btn.copied {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.btn-label {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.copy-feedback-enter-active {
  transition: all 0.25s ease-out;
}

.copy-feedback-leave-active {
  transition: all 0.15s ease-in;
}

.copy-feedback-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.copy-feedback-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.check-icon {
  font-size: 0.75rem;
}
</style>