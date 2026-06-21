<template>
  <div class="composer flex items-end gap-3 p-4 bg-bg-secondary border-t border-border">
    <button class="attachment-button p-2 text-text-muted hover:text-accent transition-colors duration-fast" title="Attach file" @click="handleAttach">
      <AttachmentIcon class="w-5 h-5" />
    </button>

    <div class="input-container flex-1">
      <textarea ref="inputRef" v-model="inputValue" :disabled="disabled" placeholder="Send a message..." rows="1" class="input-field w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text text-sm resize-none outline-none focus:border-accent transition-colors duration-fast placeholder:text-text-muted disabled:opacity-50" @keydown.enter="handleEnter" @input="adjustHeight" />
    </div>

    <select v-model="selectedModel" class="model-selector px-3 py-2 bg-bg-tertiary border border-border rounded text-text text-xs outline-none focus:border-accent">
      <option value="default">Default</option>
      <option value="claude">Claude</option>
      <option value="gpt4">GPT-4</option>
    </select>

    <button class="send-button p-2 rounded-lg transition-colors duration-fast" :class="canSend ? 'bg-accent hover:bg-accent-hover text-white' : 'bg-bg-tertiary text-text-muted cursor-not-allowed'" :disabled="!canSend" @click="handleSend">
      <SendIcon class="w-5 h-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
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

const canSend = computed(() => !props.disabled && inputValue.value.trim().length > 0)

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