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
    />

    <!-- Local Mention Autocomplete (fallback when no context provided) -->
    <MentionAutocomplete
      v-if="!mentionCtx"
      ref="localMentionRef"
      :state="localMentionState"
      :loading="localMentionLoading"
      @select="handleLocalMentionSelect"
      @hide="hideLocalMention"
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
import { ref, computed, watch, nextTick, onMounted, inject } from 'vue'
import MentionAutocomplete from './MentionAutocomplete.vue'
import { useMention } from '../../composables/useMention'
import type { MentionItem, MentionState } from '../../../types/mention'

const props = withDefaults(defineProps<{
  value?: string
  placeholder?: string
  disabled?: boolean
  history?: string[]
  queueCount?: number
}>(), {
  value: '',
  placeholder: 'Ask anything... (Shift+Enter for new line)',
  disabled: false,
  history: () => [],
  queueCount: 0
})

const emit = defineEmits<{
  'update:value': [value: string]
  'send': [content: string]
  'slashCommand': [command: string]
  'focus': []
  'blur': []
}>()

const mentionCtx = inject<any>('mention', null)

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const localMentionRef = ref<InstanceType<typeof MentionAutocomplete> | null>(null)
const internalValue = ref(props.value)
const showSlashMenu = ref(false)
const historyIndex = ref(-1)
const blurTimer = ref<ReturnType<typeof setTimeout> | null>(null)
let mentionQuerySeq = 0

const effectivePlaceholder = computed(() => {
  if (props.queueCount > 0) return `继续输入以排队（已有 ${props.queueCount} 条）后续修改...`
  return props.placeholder
})

watch(() => props.value, (val) => {
  internalValue.value = val
  showSlashMenu.value = val === '/'
})

const { searchAll, loadAgents, loadResources, loading: localMentionLoading } = useMention()
const localMentionState = ref<MentionState>({
  visible: false, query: '', atIndex: 0, selectedIndex: 0, items: []
})

async function showLocalMentionMenu(atIndex: number, query: string) {
  const seq = ++mentionQuerySeq
  localMentionState.value.atIndex = atIndex
  localMentionState.value.query = query
  localMentionState.value.visible = true
  localMentionState.value.selectedIndex = 0
  const items = await searchAll(query)
  if (seq === mentionQuerySeq) localMentionState.value.items = items
}

function hideLocalMention() {
  localMentionState.value.visible = false
  localMentionState.value.items = []
}

function handleLocalMentionSelect(item: MentionItem) {
  const before = internalValue.value.slice(0, localMentionState.value.atIndex)
  const after = internalValue.value.slice(textareaRef.value!.selectionStart)
  const insertText = `@${item.value} `
  internalValue.value = before + insertText + after
  emit('update:value', internalValue.value)
  hideLocalMention()
  nextTick(() => {
    if (textareaRef.value) {
      const pos = before.length + insertText.length
      textareaRef.value.selectionStart = pos
      textareaRef.value.selectionEnd = pos
      textareaRef.value.focus()
    }
  })
}

onMounted(() => {
  loadAgents()
  loadResources()
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
  showSlashMenu.value = newValue === '/'
  checkMentionTrigger(newValue, target.selectionStart)
}

function checkMentionTrigger(text: string, cursorPos: number) {
  let atIndex = -1
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (text[i] === '@') { atIndex = i; break }
    if (text[i] === ' ' || text[i] === '\n') break
  }
  if (atIndex === -1) {
    mentionCtx ? mentionCtx.hideMenu() : hideLocalMention()
    return
  }
  const query = text.slice(atIndex + 1, cursorPos)
  if (query.includes(' ') || query.includes('\n')) {
    mentionCtx ? mentionCtx.hideMenu() : hideLocalMention()
    return
  }
  if (mentionCtx) {
    mentionCtx.showMenu(atIndex, query)
  } else {
    showLocalMentionMenu(atIndex, query)
  }
}

function handleKeydown(e: KeyboardEvent) {
  const isMentionVisible = mentionCtx ? mentionCtx.visible.value : localMentionState.value.visible
  if (isMentionVisible) {
    if (mentionCtx) {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(e.key)) return
      if (e.key === 'Escape') { e.preventDefault(); mentionCtx.hideMenu(); return }
    } else {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
        e.preventDefault()
        localMentionRef.value?.handleKeydown(e)
        return
      }
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
  blurTimer.value = setTimeout(() => {
    if (mentionCtx) mentionCtx.hideMenu()
    else hideLocalMention()
  }, 200)
  emit('blur')
}

function selectSlashCommand(cmd: { name: string; description: string }) {
  emit('slashCommand', cmd.name)
  internalValue.value = ''; emit('update:value', '')
  showSlashMenu.value = false
}

defineExpose({ focus: () => textareaRef.value?.focus() })
</script>

<style scoped>
.slash-command-menu { min-width: 200px; max-width: 300px; }
</style>
