<script setup lang="ts">
import { ref, watch, nextTick, provide, onMounted } from 'vue'
import type { Message, ToolCall, PromptOptions } from '../../../types/ipc'
import type { PendingMessage } from '../../stores/session'
import type { ChatTimelineExpose } from './ChatTimeline.vue'
import ChatTimeline from './ChatTimeline.vue'
import ChatTodo from './ChatTodo.vue'
import Composer from '../Composer.vue'
import MentionAutocomplete from '../composer/MentionAutocomplete.vue'
import { useMention } from '../../composables/useMention'
import { useStreamingStore } from '../../stores/streaming'
import { useSessionStore } from '../../stores/session'
import type { MentionItem, MentionState } from '../../types/mention'

const props = defineProps<{
  sessionId: string
  messages: Message[]
  streamingMessage: Message | null
}>()

const emit = defineEmits<{
  openFile: [tool: ToolCall]
  openOriginalFile: [{ filePath: string; diff: string }]
  openDiffFile: [string]
}>()

const timelineRef = ref<ChatTimelineExpose>()
const needInitialScroll = ref(false)
const streamingStore = useStreamingStore()
const sessionStore = useSessionStore()

const { searchAll, loadAgents, loadResources, loading: mentionLoading } = useMention()
const mentionState = ref<MentionState>({
  visible: false, query: '', atIndex: 0, selectedIndex: 0, items: []
})
let mentionQuerySeq = 0

async function showMentionMenu(atIndex: number, query: string) {
  const seq = ++mentionQuerySeq
  mentionState.value.atIndex = atIndex
  mentionState.value.query = query
  mentionState.value.visible = true
  mentionState.value.selectedIndex = 0
  const items = await searchAll(query)
  if (seq === mentionQuerySeq) mentionState.value.items = items
}

function hideMention() {
  mentionState.value.visible = false
  mentionState.value.items = []
}

function handleMentionSelect(item: MentionItem) {
  hideMention()
}

onMounted(() => {
  loadAgents()
  loadResources()
})

const mentionVisible = ref(false)

provide('mention', {
  showMenu: showMentionMenu,
  hideMenu: hideMention,
  visible: mentionVisible,
})

async function handleSend(content: string, options: Record<string, unknown>, _attachments: unknown[]) {
  const mode = options.mode as string | undefined
  const agent = mode === 'plan' ? 'plan' : 'build'
  const promptOptions: PromptOptions = { agent }
  sessionStore.sendMessage(content, promptOptions)
  await nextTick()
  requestAnimationFrame(() => {
    timelineRef.value?.scrollToBottom({ behavior: 'smooth' })
    needInitialScroll.value = false
  })
}

function handleInterrupt() {
  if (props.sessionId) sessionStore.interrupt(props.sessionId)
}

function handleFlushQueued(pending: PendingMessage) { sessionStore.flushMessage(pending) }
function handleEditQueued(pending: PendingMessage) { sessionStore.editMessage(pending.id) }
function handleRemoveQueued(pendingId: string) { sessionStore.removeMessage(pendingId) }

watch(() => sessionStore.currentSessionId, () => { needInitialScroll.value = true }, { immediate: true })

watch(() => sessionStore.currentMessages.length, async (length) => {
  if (!needInitialScroll.value) return
  if (length === 0) return
  await nextTick()
  requestAnimationFrame(() => {
    timelineRef.value?.scrollToBottom({ behavior: 'auto' })
    needInitialScroll.value = false
  })
})
</script>

<template>
  <div class="chat-view flex-1 flex flex-col min-h-0 min-w-0 bg-bg overflow-hidden">
    <ChatTimeline
      ref="timelineRef"
      :messages="messages"
      :streaming-message="streamingMessage"
      @open-file="emit('openFile', $event)"
      @open-original-file="emit('openOriginalFile', $event)"
      @open-diff-file="emit('openDiffFile', $event)"
    />
    <ChatTodo class="flex-shrink-0" />
    <Composer
      :has-active-session="true"
      :is-streaming="streamingStore.isCurrentStreaming.value"
      :queue-count="sessionStore.currentPendingQueue.length"
      :pending-queue="sessionStore.currentPendingQueue"
      class="flex-shrink-0"
      @send="handleSend"
      @interrupt="handleInterrupt"
      @flush-queued="handleFlushQueued"
      @edit-queued="handleEditQueued"
      @remove-queued="handleRemoveQueued"
    />
    <MentionAutocomplete
      :state="mentionState"
      :loading="mentionLoading"
      @select="handleMentionSelect"
      @hide="hideMention"
    />
  </div>
</template>
