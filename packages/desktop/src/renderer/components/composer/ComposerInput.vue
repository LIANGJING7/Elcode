<template>
  <div class="composer-input relative flex-1 min-h-0 flex flex-col">
    <textarea
      ref="textareaRef"
      :value="internalValue"
      :disabled="disabled"
      :placeholder="effectivePlaceholder"
      class="flex-1 min-h-0 w-full bg-transparent text-text text-sm leading-relaxed resize-none outline-none placeholder:text-text-muted disabled:opacity-50"
      @input="handleInput"
      @focus="emit('focus')"
      @blur="handleBlur"
      @keydown="handleKeydown"
      @paste="handlePaste"
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
  queueCount?: number
  mentionVisible?: boolean
}>(), {
  value: '',
  placeholder: 'Ask anything... (Shift+Enter for new line)',
  disabled: false,
  history: () => [],
  queueCount: 0,
  mentionVisible: false
})

const emit = defineEmits<{
  'update:value': [value: string]
  'send': [content: string]
  'slashCommand': [command: string]
  'pasteImage': [image: { name: string; mime: string; url: string }]
  'focus': []
  'blur': []
  'mention-check': [text: string, cursorPos: number]
  'mention-key': [e: KeyboardEvent]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const internalValue = ref(props.value)
const showSlashMenu = ref(false)
const historyIndex = ref(-1)
const blurTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const effectivePlaceholder = computed(() => {
  if (props.queueCount > 0) return `继续输入以排队（已有 ${props.queueCount} 条）后续修改...`
  return props.placeholder
})

watch(() => props.value, (val) => {
  internalValue.value = val
  showSlashMenu.value = false
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
  historyIndex.value = -1
  showSlashMenu.value = false
  emit('mention-check', newValue, target.selectionStart)
}

function handleKeydown(e: KeyboardEvent) {
  if (props.mentionVisible) {
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
      e.preventDefault()
      emit('mention-key', e)
      return
    }
  }

  if (showSlashMenu.value) {
    if (e.key === 'Escape') { showSlashMenu.value = false; e.preventDefault(); return }
    if (e.key === 'Tab' || e.key === 'Enter') { selectSlashCommand(slashCommands[0]); e.preventDefault(); return }
  }

  if (!showSlashMenu.value && props.history.length > 0) {
    if (e.key === 'ArrowUp' && !e.shiftKey) {
      const textarea = textareaRef.value
      const atStart = textarea && textarea.selectionStart === 0 && textarea.selectionEnd === 0
      if (internalValue.value === '' || atStart) {
        if (historyIndex.value < props.history.length - 1) {
          historyIndex.value++
          const hv = props.history[props.history.length - 1 - historyIndex.value]
          internalValue.value = hv; emit('update:value', hv)
          nextTick(() => {
            if (textareaRef.value) {
              textareaRef.value.value = hv
              textareaRef.value.selectionStart = hv.length
              textareaRef.value.selectionEnd = hv.length
            }
          })
        }
        e.preventDefault(); return
      }
    }
    if (e.key === 'ArrowDown' && !e.shiftKey) {
      if (historyIndex.value > -1) {
        historyIndex.value--
        if (historyIndex.value === -1) {
          internalValue.value = ''; emit('update:value', '')
          nextTick(() => { if (textareaRef.value) textareaRef.value.value = '' })
        } else {
          const hv = props.history[props.history.length - 1 - historyIndex.value]
          internalValue.value = hv; emit('update:value', hv)
          nextTick(() => {
            if (textareaRef.value) {
              textareaRef.value.value = hv
              textareaRef.value.selectionStart = hv.length
              textareaRef.value.selectionEnd = hv.length
            }
          })
        }
        e.preventDefault()
      }
      return
    }
  }

  if (e.key === 'Enter') {
    if (e.shiftKey) return
    if (internalValue.value.trim()) {
      emit('send', internalValue.value)
      internalValue.value = ''; emit('update:value', '')
      showSlashMenu.value = false; historyIndex.value = -1
      nextTick(() => { if (textareaRef.value) textareaRef.value.value = '' })
    }
    e.preventDefault()
  }
}

function handleBlur() {
  blurTimer.value = setTimeout(() => emit('mention-check', '', 0), 200)
  emit('blur')
}

function selectSlashCommand(cmd: { name: string; description: string }) {
  emit('slashCommand', cmd.name)
  internalValue.value = ''; emit('update:value', '')
  showSlashMenu.value = false
}

function handlePaste(e: ClipboardEvent) {
  console.log('[DEBUG ComposerInput] paste event fired')
  const items = e.clipboardData?.items
  if (!items) {
    console.log('[DEBUG ComposerInput] no clipboard items')
    return
  }

  console.log('[DEBUG ComposerInput] clipboard items:', items.length)
  for (const item of items) {
    console.log('[DEBUG ComposerInput] item type:', item.type)
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        console.log('[DEBUG ComposerInput] image file found:', file.name, file.type)
        const reader = new FileReader()
        reader.onload = () => {
          const url = reader.result as string
          console.log('[DEBUG ComposerInput] emitting pasteImage, url length:', url.length)
          emit('pasteImage', {
            name: `image-${Date.now()}`,
            mime: file.type,
            url
          })
        }
        reader.readAsDataURL(file)
        e.preventDefault()
        return
      }
    }
  }
}


defineExpose({ focus: () => textareaRef.value?.focus(), textareaRef })
</script>

<style scoped>
.slash-command-menu { min-width: 200px; max-width: 300px; }
</style>
