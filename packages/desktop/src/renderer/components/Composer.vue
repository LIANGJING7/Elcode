<template>
  <div class="composer-container px-4 pb-4 pt-2">
    <div
      class="composer max-w-chat-max mx-auto bg-bg-surface border rounded-2xl shadow-lg transition-all duration-normal"
      :class="isFocused
        ? 'border-accent/50 shadow-glow'
        : 'border-border/80 hover:border-border-light'"
    >
      <!-- Attachment Bar (chips row) -->
      <AttachmentBar
        :attachments="attachments"
        @remove="handleRemoveAttachment"
      />

      <div class="flex items-end gap-2 px-4 py-3">
        <!-- Attachment Button (left) -->
        <AttachmentButton
          :disabled="disabled || isStreaming"
          @at-file="handleAtFile"
          @attach="handleAttach"
        />

        <!-- Composer Input (center) -->
        <div class="input-container flex-1 min-w-0">
          <ComposerInput
            ref="inputRef"
            v-model="inputValue"
            :disabled="disabled || isStreaming"
            :placeholder="placeholder"
            :history="inputHistory"
            @send="handleSend"
            @slash-command="handleSlashCommand"
            @focus="isFocused = true"
            @blur="isFocused = false"
          />
        </div>

        <!-- SessionOptions + Send/Stop (right) -->
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <SessionOptions
            v-model:options="sessionOptions"
            :editing-session="hasActiveSession"
          />

          <!-- Send/Stop Button -->
          <button
            v-if="!isStreaming"
            class="send-button w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-fast"
            :class="canSend
              ? 'bg-accent hover:bg-accent-hover text-white shadow-sm hover:shadow-glow active:scale-95'
              : 'bg-bg-hover text-text-muted cursor-not-allowed'"
            :disabled="!canSend"
            title="Send (Enter)"
            @click="handleManualSend"
          >
            <SendIcon class="w-3.5 h-3.5" />
          </button>
          <button
            v-else
            class="stop-button w-8 h-8 flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all duration-fast"
            title="Stop"
            @click="handleInterrupt"
          >
            <StopIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Footer hints -->
      <div
        v-if="inputValue.length > 0 && !isStreaming"
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
import ComposerInput from './composer/ComposerInput.vue'
import AttachmentButton from './composer/AttachmentButton.vue'
import AttachmentBar from './composer/AttachmentBar.vue'
import SessionOptions from './composer/SessionOptions.vue'
import SendIcon from './icons/SendIcon.vue'
import StopIcon from './icons/StopIcon.vue'

interface Attachment {
  type: 'file' | 'at'
  name: string
  path: string
}

const props = withDefaults(defineProps<{
  disabled?: boolean
  placeholder?: string
  isStreaming?: boolean
  hasActiveSession?: boolean
}>(), {
  disabled: false,
  placeholder: 'Ask anything... (Shift+Enter for new line)',
  isStreaming: false,
  hasActiveSession: true
})

const emit = defineEmits<{
  send: [content: string, options: Record<string, unknown>]
  attach: []
  atFile: []
  interrupt: []
  slashCommand: [command: string]
}>()

const inputRef = ref<{ focus: () => void } | null>(null)
const inputValue = ref('')
const isFocused = ref(false)
const attachments = ref<Attachment[]>([])
const sessionOptions = ref<Record<string, unknown>>({ mode: 'build', model: '' })

// History of sent messages (for up-arrow navigation)
const inputHistory = ref<string[]>([])

const canSend = computed(() => !props.disabled && !props.isStreaming && inputValue.value.trim().length > 0)

watch(() => props.disabled, (val) => {
  if (!val && !props.isStreaming) {
    nextTick(() => inputRef.value?.focus())
  }
})

function handleSend(content: string) {
  emit('send', content, sessionOptions.value)
  // Add to history
  if (content.trim()) {
    inputHistory.value.push(content.trim())
    if (inputHistory.value.length > 50) {
      inputHistory.value.shift()
    }
  }
}

function handleManualSend() {
  if (canSend.value) {
    handleSend(inputValue.value)
    inputValue.value = ''
  }
}

function handleInterrupt() {
  emit('interrupt')
}

function handleAttach() {
  emit('attach')
}

function handleAtFile() {
  emit('atFile')
}

function handleRemoveAttachment(index: number) {
  attachments.value.splice(index, 1)
}

function handleSlashCommand(command: string) {
  emit('slashCommand', command)
  if (command === 'plan') {
    sessionOptions.value.mode = 'plan'
  } else if (command === 'build') {
    sessionOptions.value.mode = 'build'
  }
}
</script>

<style scoped>
.composer {
  backdrop-filter: blur(12px);
}
</style>