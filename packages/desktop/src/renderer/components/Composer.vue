<template>
  <div class="pb-6 pt-4">
    <div class="max-w-chat-max mx-auto px-6">
      <!-- Queued messages chips (above input box) -->
      <div
        v-if="pendingQueue.length > 0"
        class="queued-messages mb-3 space-y-2"
      >
        <QueuedMessageChip
          v-for="(pending, index) in pendingQueue"
          :key="pending.id"
          :pending="pending"
          :index="index"
          @flush="handleFlushQueued"
          @edit="handleEditQueued"
          @remove="handleRemoveQueued"
        />
      </div>

      <div
        class="composer bg-bg-elevated border border-border rounded-2xl shadow transition-all duration-200 flex flex-col min-h-[120px] relative"
        :class="isFocused
          ? 'border-border-light shadow-sm'
          : 'border-border hover:border-border-light'"
      >
      <!-- Attachment Bar (chips row) -->
      <AttachmentBar
        :attachments="attachments"
        @remove="handleRemoveAttachment"
      />

      <!-- Composer Input (top, takes remaining space) -->
      <div class="flex-1 min-h-0 px-3 pt-3 pb-1 relative">
        <!-- Mention Autocomplete -->
        <MentionAutocomplete
          ref="mentionAutocompleteRef"
          :state="mentionState"
          @select="handleMentionSelect"
          @hide="hideMention"
        />
        <ComposerInput
          ref="inputRef"
          v-model:value="inputValue"
          :disabled="disabled"
          :placeholder="placeholder"
          :history="inputHistory"
          :queue-count="queueCount"
          :mention-visible="mentionState.visible"
          @send="handleSend"
          @slash-command="handleSlashCommand"
          @mention-check="checkMentionTrigger"
          @mention-key="(e: KeyboardEvent) => mentionAutocompleteRef?.handleKeydown(e)"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
      </div>

      <!-- Bottom bar: Plus + Options + Send -->
      <div class="flex items-center gap-2 px-3 py-2 flex-shrink-0">
        <!-- Plus Button (left) -->
        <button
          class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-bg-hover hover:bg-bg-tertiary text-text-muted transition-colors"
          :disabled="disabled || isStreaming"
          @click="handleAttach"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>

        <!-- Spacer -->
        <div class="flex-1"></div>

        <!-- SessionOptions + Send/Stop (right) -->
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <SessionOptions
            v-model:options="sessionOptions"
            :editing-session="hasActiveSession"
          />

          <!-- Send/Stop Button -->
          <!-- Send Button (always visible) -->
          <button
            class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors relative"
            :class="canSend
              ? 'bg-accent hover:bg-accent-hover text-white'
              : 'bg-bg-hover text-text-muted'"
            :disabled="!canSend"
            title="Send (Enter)"
            @click="handleManualSend"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
            <!-- Queue count badge -->
            <span
              v-if="queueCount > 0"
              class="queue-badge absolute -top-1 -right-1 bg-bg-elevated text-xs text-accent px-1.5 py-0.5 rounded-full font-mono"
            >{{ queueCount }}</span>
          </button>
          <!-- Stop Button (visible during streaming) -->
          <button
            v-if="isStreaming"
            class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors ml-1.5"
            title="Stop"
            @click="handleInterrupt"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"></rect>
            </svg>
          </button>
        </div>
      </div>

      <!-- Footer hints -->
      <div
        v-if="inputValue.length > 0 && !isStreaming"
        class="composer-footer flex items-center justify-end px-4 py-1.5 border-t border-border/60"
      >
        <div class="flex items-center gap-2">
          <kbd class="text-xs text-text-muted bg-bg-hover px-1.5 py-0.5 rounded font-mono">Enter</kbd>
          <span class="text-xs text-text-muted">to send</span>
          <span class="text-border mx-0.5">·</span>
          <kbd class="text-xs text-text-muted bg-bg-hover px-1.5 py-0.5 rounded font-mono">Shift+Enter</kbd>
          <span class="text-xs text-text-muted">new line</span>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import ComposerInput from './composer/ComposerInput.vue'
import AttachmentBar from './composer/AttachmentBar.vue'
import SessionOptions from './composer/SessionOptions.vue'
import QueuedMessageChip from './composer/QueuedMessageChip.vue'
import MentionAutocomplete from './composer/MentionAutocomplete.vue'
import { useMention } from '../composables/useMention'
import { useModelsStore } from '../stores/models'
import type { PendingMessage } from '../stores/session'
import type { MentionItem, MentionState } from '../../types/mention'

interface Attachment {
  type: 'file' | 'at'
  name: string
  path: string
  content?: string
  url?: string
  mime?: string
}

const props = withDefaults(defineProps<{
  disabled?: boolean
  placeholder?: string
  isStreaming?: boolean
  hasActiveSession?: boolean
  queueCount?: number
  pendingQueue?: PendingMessage[]
}>(), {
  disabled: false,
  placeholder: 'Ask anything... (Shift+Enter for new line)',
  isStreaming: false,
  hasActiveSession: true,
  queueCount: 0,
  pendingQueue: () => []
})

const emit = defineEmits<{
  send: [content: string, options: Record<string, unknown>, attachments: Attachment[]]
  attach: []
  atFile: []
  interrupt: []
  slashCommand: [command: string]
  flushQueued: [pending: PendingMessage]
  editQueued: [pending: PendingMessage]
  removeQueued: [pendingId: string]
}>()

const modelsStore = useModelsStore()

const inputRef = ref<{ focus: () => void } | null>(null)
const inputValue = ref('')
const isFocused = ref(false)
const attachments = ref<Attachment[]>([])
const sessionOptions = ref<Record<string, unknown>>({ mode: 'build', model: '' })

// 初始化模型选择 - 从持久化配置恢复
onMounted(() => {
  if (modelsStore.selectedModel) {
    sessionOptions.value.model = modelsStore.selectedModel
  }
})

// 监听 modelsStore.selectedModel 变化（如首次加载完成后）
watch(() => modelsStore.selectedModel, (newModel) => {
  if (newModel && !sessionOptions.value.model) {
    sessionOptions.value.model = newModel
  }
})

// History of sent messages (for up-arrow navigation)
const inputHistory = ref<string[]>([])

const canSend = computed(() => !props.disabled && inputValue.value.trim().length > 0)

watch(() => props.disabled, (val) => {
  if (!val && !props.isStreaming) {
    nextTick(() => inputRef.value?.focus())
  }
})

function handleSend(content: string) {
    console.log('[DEBUG Composer] === handleSend CALLED ===')
    console.log('[DEBUG Composer] Content:', content.slice(0, 50))
    console.log('[DEBUG Composer] sessionOptions:', JSON.stringify(sessionOptions.value))
    console.log('[DEBUG Composer] attachments:', attachments.value.length)

    console.log('[DEBUG Composer] Emitting send event')

    emit('send', content, sessionOptions.value, attachments.value)

    // Add to history
    if (content.trim()) {
      inputHistory.value.push(content.trim())
      if (inputHistory.value.length > 50) {
        inputHistory.value.shift()
      }
    }
    // Clear attachments after sending
    attachments.value = []
    console.log('[DEBUG Composer] ✓ send event emitted')
  }

function handleManualSend() {
    console.log('[DEBUG Composer] === handleManualSend CALLED ===')
    console.log('[DEBUG Composer] canSend:', canSend.value)
    console.log('[DEBUG Composer] inputValue:', inputValue.value.slice(0, 50))

    if (canSend.value) {
      handleSend(inputValue.value)
      inputValue.value = ''
      console.log('[DEBUG Composer] ✓ inputValue cleared')
      nextTick(() => inputRef.value?.focus())
    } else {
      console.log('[DEBUG Composer] ✗ Cannot send - canSend is false')
    }
  }

function handleInterrupt() {
  emit('interrupt')
}

async function handleAttach() {
  try {
    const result = await window.desktop.file.pick()
    if (result) {
      attachments.value.push({
        type: 'file',
        name: result.name,
        path: result.filePath,
        content: result.content
      })
    }
  } catch (err) {
    console.error('Failed to pick file:', err)
  }
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

const { searchAll, loadAgents, loadResources } = useMention()
const mentionAutocompleteRef = ref<InstanceType<typeof MentionAutocomplete> | null>(null)
const mentionState = ref<MentionState>({
  visible: false, query: '', atIndex: 0, selectedIndex: 0, items: []
})
let mentionQuerySeq = 0

onMounted(() => {
  loadAgents()
  loadResources()
})

async function showMentionMenu(atIndex: number, query: string) {
  const seq = ++mentionQuerySeq
  mentionState.value = { visible: true, query, atIndex, selectedIndex: 0, items: [] }
  const items = await searchAll(query)
  if (seq === mentionQuerySeq) mentionState.value.items = items
}

function hideMention() {
  mentionState.value.visible = false
}

function handleMentionSelect(item: MentionItem) {
  const before = inputValue.value.slice(0, mentionState.value.atIndex)
  const textarea = inputRef.value as any
  const selStart = textarea?.textareaRef?.selectionStart ?? inputValue.value.length
  const after = inputValue.value.slice(selStart)
  const insertText = `@${item.value} `
  inputValue.value = before + insertText + after
  hideMention()
}

function checkMentionTrigger(text: string, cursorPos: number) {
  let atIndex = -1
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (text[i] === '@') { atIndex = i; break }
    if (text[i] === ' ' || text[i] === '\n') break
  }
  if (atIndex === -1) { hideMention(); return }
  const query = text.slice(atIndex + 1, cursorPos)
  if (query.includes(' ') || query.includes('\n')) { hideMention(); return }
  showMentionMenu(atIndex, query)
}

function handleFlushQueued(pending: PendingMessage) {
  emit('flushQueued', pending)
}

function handleEditQueued(pending: PendingMessage) {
  // Move queued message content back into the input box
  inputValue.value = pending.content
  emit('editQueued', pending)
}

function handleRemoveQueued(pendingId: string) {
  emit('removeQueued', pendingId)
}
</script>

<style scoped>
.composer-container {
  background: transparent;
}

.composer {
  /* Light theme composer styles */
}
</style>