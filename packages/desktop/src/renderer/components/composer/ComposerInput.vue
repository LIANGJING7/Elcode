<template>
  <div class="composer-input relative">
    <textarea
      ref="textareaRef"
      :value="internalValue"
      :disabled="disabled"
      :placeholder="placeholder"
      rows="1"
      class="w-full bg-transparent text-text text-sm leading-relaxed resize-none outline-none placeholder:text-text-muted disabled:opacity-50"
      @input="handleInput"
      @focus="emit('focus')"
      @blur="emit('blur')"
      @keydown="handleKeydown"
    />

    <!-- Slash Command Menu -->
    <div
      v-if="showSlashMenu"
      class="slash-command-menu absolute bottom-full left-0 mb-2 bg-bg-elevated border border-border rounded-lg shadow-lg overflow-hidden z-10"
    >
      <div class="p-1">
        <button
          v-for="cmd in slashCommands"
          :key="cmd.name"
          class="slash-command-item w-full px-3 py-2 text-left text-sm text-text hover:bg-bg-hover rounded transition-colors flex items-center gap-2"
          @click="selectSlashCommand(cmd)"
        >
          <span class="text-accent font-mono">/{{ cmd.name }}</span>
          <span class="text-text-muted">{{ cmd.description }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  value?: string
  placeholder?: string
  disabled?: boolean
  history?: string[]
}>(), {
  value: '',
  placeholder: 'Ask anything... (Shift+Enter for new line)',
  disabled: false,
  history: () => []
})

const emit = defineEmits<{
  'update:value': [value: string]
  'send': [content: string]
  'slashCommand': [command: string]
  'focus': []
  'blur': []
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const internalValue = ref(props.value)
const showSlashMenu = ref(false)
const historyIndex = ref(-1) // -1 = current input, 0+ = history position

// Sync internal value with prop
watch(() => props.value, (val) => {
  internalValue.value = val
  // Show slash menu when input is just '/'
  showSlashMenu.value = val === '/'
})

const slashCommands = [
  { name: 'plan', description: '切换到规划模式' },
  { name: 'build', description: '切换到构建模式' },
  { name: 'clear', description: '清空当前会话' },
  { name: 'compact', description: '压缩会话历史' },
  { name: 'model', description: '选择模型' },
]

function handleInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  const newValue = target.value
  internalValue.value = newValue
  emit('update:value', newValue)
  adjustHeight()
  // Reset history navigation when user types
  historyIndex.value = -1
  // Show slash menu if input is '/'
  showSlashMenu.value = newValue === '/'
}

function handleKeydown(e: KeyboardEvent) {
  // Slash command menu navigation
  if (showSlashMenu.value) {
    if (e.key === 'Escape') {
      showSlashMenu.value = false
      e.preventDefault()
      return
    }
    // Tab or Enter selects first command
    if (e.key === 'Tab' || e.key === 'Enter') {
      selectSlashCommand(slashCommands[0])
      e.preventDefault()
      return
    }
  }

  // History navigation (only when not showing slash menu and textarea is empty or at start)
  if (!showSlashMenu.value && props.history.length > 0) {
    if (e.key === 'ArrowUp' && !e.shiftKey) {
      // Only navigate history if textarea is empty or cursor is at start
      const textarea = textareaRef.value
      const atStart = textarea && textarea.selectionStart === 0 && textarea.selectionEnd === 0
      if (internalValue.value === '' || atStart) {
        if (historyIndex.value < props.history.length - 1) {
          historyIndex.value++
          const historyValue = props.history[props.history.length - 1 - historyIndex.value]
          internalValue.value = historyValue
          emit('update:value', historyValue)
          nextTick(() => {
            if (textareaRef.value) {
              textareaRef.value.value = historyValue
              textareaRef.value.selectionStart = historyValue.length
              textareaRef.value.selectionEnd = historyValue.length
            }
          })
        }
        e.preventDefault()
        return
      }
    }

    if (e.key === 'ArrowDown' && !e.shiftKey) {
      if (historyIndex.value > -1) {
        historyIndex.value--
        if (historyIndex.value === -1) {
          internalValue.value = ''
          emit('update:value', '')
          nextTick(() => {
            if (textareaRef.value) {
              textareaRef.value.value = ''
            }
          })
        } else {
          const historyValue = props.history[props.history.length - 1 - historyIndex.value]
          internalValue.value = historyValue
          emit('update:value', historyValue)
          nextTick(() => {
            if (textareaRef.value) {
              textareaRef.value.value = historyValue
              textareaRef.value.selectionStart = historyValue.length
              textareaRef.value.selectionEnd = historyValue.length
            }
          })
        }
        e.preventDefault()
      }
      return
    }
  }

  // Enter: send (without shift), newline (with shift)
  if (e.key === 'Enter') {
    if (e.shiftKey) {
      // Allow newline
      return
    }
    // Send message
    if (internalValue.value.trim()) {
      emit('send', internalValue.value)
      internalValue.value = ''
      emit('update:value', '')
      showSlashMenu.value = false
      historyIndex.value = -1
      nextTick(() => {
        if (textareaRef.value) {
          textareaRef.value.value = ''
        }
      })
    }
    e.preventDefault()
  }
}

function selectSlashCommand(cmd: { name: string; description: string }) {
  emit('slashCommand', cmd.name)
  internalValue.value = ''
  emit('update:value', '')
  showSlashMenu.value = false
}

function adjustHeight() {
  if (!textareaRef.value) return
  textareaRef.value.style.height = 'auto'
  const scrollHeight = textareaRef.value.scrollHeight
  const maxHeight = 200
  textareaRef.value.style.height = Math.min(scrollHeight, maxHeight) + 'px'
}

// Expose for parent to focus
defineExpose({
  focus: () => textareaRef.value?.focus()
})
</script>

<style scoped>
.slash-command-menu {
  min-width: 200px;
  max-width: 300px;
}
</style>