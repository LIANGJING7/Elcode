<template>
  <div class="composer-container px-4 pb-4 pt-2">
    <div
      class="composer max-w-chat-max mx-auto bg-bg-surface border rounded-2xl shadow-lg transition-all duration-normal"
      :class="isFocused
        ? 'border-accent/50 shadow-glow'
        : 'border-border/80 hover:border-border-light'"
    >
      <div class="flex items-end gap-2 px-4 py-3">
        <button
          class="attachment-button p-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent-muted transition-all duration-fast flex-shrink-0"
          :class="{ 'text-accent bg-accent-muted': isFocused }"
          title="Attach file (Ctrl+Shift+A)"
          :disabled="disabled"
          @click="handleAttach"
        >
          <AttachmentIcon class="w-4 h-4" />
        </button>

        <div class="input-container flex-1 min-w-0">
          <textarea
            ref="inputRef"
            v-model="inputValue"
            :disabled="disabled"
            placeholder="Ask anything... (Shift+Enter for new line)"
            rows="1"
            class="input-field w-full bg-transparent text-text text-sm leading-relaxed resize-none outline-none placeholder:text-text-muted disabled:opacity-50"
            @focus="isFocused = true"
            @blur="isFocused = false"
            @keydown.enter="handleEnter"
            @input="adjustHeight"
          />
        </div>

        <div class="flex items-center gap-1.5 flex-shrink-0">
          <select
            v-model="selectedModel"
            class="model-selector px-2.5 py-1.5 bg-bg-hover border border-border hover:border-border-light rounded-lg text-text text-2xs font-medium outline-none cursor-pointer transition-all duration-fast appearance-none"
            style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 6px center; background-size: 12px; padding-right: 24px;"
          >
            <option value="default">Default</option>
            <option value="claude">Claude</option>
            <option value="gpt4">GPT-4</option>
          </select>

          <button
            class="send-button w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-fast"
            :class="canSend
              ? 'bg-accent hover:bg-accent-hover text-white shadow-sm hover:shadow-glow active:scale-95'
              : 'bg-bg-hover text-text-muted cursor-not-allowed'"
            :disabled="!canSend"
            title="Send (Enter)"
            @click="handleSend"
          >
            <SendIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        v-if="inputValue.length > 0"
        class="composer-footer flex items-center justify-between px-4 py-2 border-t border-border/40 animate-fade-in"
      >
        <div class="flex items-center gap-3">
          <span class="text-2xs text-text-muted">{{ inputValue.length }} chars</span>
        </div>
        <div class="flex items-center gap-2">
          <kbd class="text-2xs text-text-muted bg-bg-hover px-1.5 py-0.5 rounded font-mono">Enter</kbd>
          <span class="text-2xs text-text-muted">to send</span>
          <span class="text-text-muted mx-0.5">&middot;</span>
          <kbd class="text-2xs text-text-muted bg-bg-hover px-1.5 py-0.5 rounded font-mono">Shift+Enter</kbd>
          <span class="text-2xs text-text-muted">new line</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import AttachmentIcon from './icons/AttachmentIcon.vue'
import SendIcon from './icons/SendIcon.vue'

const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
  attach: []
}>()

const inputValue = ref('')
const selectedModel = ref('default')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const isFocused = ref(false)

const canSend = computed(() => !props.disabled && inputValue.value.trim().length > 0)

watch(() => props.disabled, (val) => {
  if (!val) {
    nextTick(() => inputRef.value?.focus())
  }
})

function handleEnter(e: KeyboardEvent) {
  if (e.shiftKey) return
  e.preventDefault()
  handleSend()
}

function handleSend() {
  if (!canSend.value) return
  emit('send', inputValue.value)
  inputValue.value = ''
  nextTick(() => adjustHeight())
}

function handleAttach() {
  emit('attach')
}

function adjustHeight() {
  if (!inputRef.value) return
  inputRef.value.style.height = 'auto'
  const scrollHeight = inputRef.value.scrollHeight
  const maxHeight = 200
  inputRef.value.style.height = Math.min(scrollHeight, maxHeight) + 'px'
}
</script>

<style scoped>
.composer {
  backdrop-filter: blur(12px);
}

.input-field {
  field-sizing: content;
}

.input-field::placeholder {
  opacity: 0.5;
}

.model-selector option {
  background-color: var(--color-bg-elevated);
  color: var(--color-text);
}
</style>
