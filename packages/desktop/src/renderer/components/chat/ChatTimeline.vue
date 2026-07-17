<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Message, ToolCall } from '../../../types/ipc'
import MessageUser from './MessageUser.vue'
import MessageAssistant from './MessageAssistant.vue'
import StreamingMessage from '../streaming/StreamingMessage.vue'
import SubagentViewer from '../subagent/SubagentViewer.vue'
import { useSubagentStore } from '../../stores/subagent'
import { useSessionStore } from '../../stores/session'
import { useUiStore } from '../../stores/ui'
import { useWorkspaceStore } from '../../stores/workspace'

const timelineContainerRef = ref<HTMLDivElement | null>(null)

const props = defineProps<{
  messages: Message[]
  streamingMessage: Message | null
}>()

const emit = defineEmits<{
  openFile: [tool: ToolCall]
  openOriginalFile: [{ filePath: string; diff: string }]
  openDiffFile: [string]
}>()

interface ScrollOptions {
  behavior?: ScrollBehavior
}

export interface ChatTimelineExpose {
  scrollToBottom(options?: ScrollOptions): boolean
}

function scrollToBottom(options?: ScrollOptions): boolean {
  if (!timelineContainerRef.value) return false
  const behavior = options?.behavior ?? 'auto'
  timelineContainerRef.value.scrollTo({
    top: timelineContainerRef.value.scrollHeight,
    behavior,
  })
  return true
}

// 一个 user turn 的多步 agentic 响应会被后端持久化为多条 assistant message
// (每个 step.started 都 appendMessage 一条)，每条各带自己的 reasoning。
// 流式时 timelineNodes 已把所有 reasoning 合并成单块；历史回看需对齐——
// 把两条 user message 之间连续的 assistant message 聚合成一条渲染，
// reasoning 拼接为单个块，避免出现多个 Reasoning。
interface TimelineItem {
  key: string
  role: 'user' | 'assistant'
  message: Message
}

const aggregatedItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []
  let group: Message[] = []
  let groupKeys: string[] = []

  const flush = () => {
    if (group.length === 0) return
    const reasoning = group
      .map(m => m.reasoning)
      .filter((r): r is string => Boolean(r))
      .join('\n\n')
    const content = group
      .map(m => m.content)
      .filter(c => Boolean(c && c.trim()))
      .join('\n\n')
    const toolCalls = group.flatMap(m => m.toolCalls ?? [])
    // Sum up durations from all assistant messages in the group
    const totalDuration = group.reduce((sum, m) => sum + (m.duration ?? 0), 0)
    // Only take error from the last message in the group — if the last step
    // succeeded, earlier errors are historical and should not be shown.
    const error = group[group.length - 1]?.error
    const merged: Message = {
      id: group[0].id,
      role: 'assistant',
      content,
      timestamp: group[0].timestamp,
      ...(reasoning ? { reasoning } : {}),
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
      ...(totalDuration > 0 ? { duration: totalDuration } : {}),
      ...(error ? { error } : {}),
    }
    items.push({ key: groupKeys.join('|'), role: 'assistant', message: merged })
    group = []
    groupKeys = []
  }

  // Filter out streaming assistant messages to avoid duplication with streamingMessage
  const streamingMessageId = props.streamingMessage?.id

  for (const msg of props.messages) {
    if (msg.role === 'user') {
      flush()
      items.push({ key: msg.id, role: 'user', message: msg })
    } else {
      // Skip assistant messages that match the streaming message (avoid duplication)
      if (streamingMessageId && msg.id === streamingMessageId) {
        console.log('[ChatTimeline] Skipping streaming message from history:', msg.id)
        continue
      }
      group.push(msg)
      groupKeys.push(msg.id)
    }
  }
  flush()
  return items
})

defineExpose<ChatTimelineExpose>({ scrollToBottom })

// Handle subagent panel open
async function handleOpenSubagentPanel(sessionId: string) {
  console.log('[ChatTimeline] handleOpenSubagentPanel START:', sessionId)
  const subagentStore = useSubagentStore()
  const sessionStore = useSessionStore()
  const uiStore = useUiStore()

  console.log('[ChatTimeline] subagentStore.watching:', subagentStore.watching)
  console.log('[ChatTimeline] subagentStore.currentSessionId:', subagentStore.currentSessionId)
  console.log('[ChatTimeline] sessionStore.currentSessionId:', sessionStore.currentSessionId)
  console.log('[ChatTimeline] subagentStore.tabs.size:', subagentStore.tabs.size)

  // Ensure we're watching the current session with messages loaded
  const watchingSessionId = subagentStore.currentSessionId
  if (!subagentStore.watching) {
    console.log('[ChatTimeline] Starting watch on current session')
    await subagentStore.watch(sessionStore.currentSessionId!, sessionStore.currentMessages)
  } else if (watchingSessionId !== sessionStore.currentSessionId) {
    // Watching wrong session, need to switch
    console.log('[ChatTimeline] Watching wrong session, switching from', watchingSessionId, 'to', sessionStore.currentSessionId)
    await subagentStore.watch(sessionStore.currentSessionId!, sessionStore.currentMessages)
  } else if (subagentStore.tabs.size === 0) {
    // Already watching but tabs empty - force bootstrap
    console.log('[ChatTimeline] Tabs empty, forcing bootstrap')
    await subagentStore.watch(sessionStore.currentSessionId!, sessionStore.currentMessages, true)
  }

  console.log('[ChatTimeline] After watch check, tabs.size:', subagentStore.tabs.size)

  // Find the tab and open panel
  const tab = subagentStore.tabs.get(sessionId)
  console.log('[ChatTimeline] Found tab for sessionId', sessionId.slice(0, 12), ':', tab ? { label: tab.label, status: tab.status } : 'undefined')

  if (tab) {
    console.log('[ChatTimeline] Opening panel with tab data')
    uiStore.openPanel({
      id: sessionId,
      type: 'subagent',
      title: tab.label,
      subtitle: tab.description,
      status: tab.status,
      component: SubagentViewer,
    })

    subagentStore.selectTab(sessionId)
    // Load child session messages and build detail commits
    const wsStore = useWorkspaceStore()
    subagentStore.loadDetail(sessionId, wsStore.currentWorkspace?.path)
    console.log('[ChatTimeline] Panel opened, tab selected, loading detail')
  } else {
    // Fallback: open panel even without tab data (use sessionId as title)
    console.log('[ChatTimeline] No tab found, opening panel with fallback title')
    uiStore.openPanel({
      id: sessionId,
      type: 'subagent',
      title: 'Subagent',
      subtitle: sessionId.slice(0, 8),
      status: 'running',
      component: SubagentViewer,
    })

    subagentStore.selectTab(sessionId)
    const wsStore = useWorkspaceStore()
    subagentStore.loadDetail(sessionId, wsStore.currentWorkspace?.path)
    console.log('[ChatTimeline] Fallback panel opened, loading detail')
  }
}
</script>

<template>
  <div ref="timelineContainerRef" class="chat-timeline flex-1 min-h-0 h-0 overflow-y-auto overflow-x-hidden py-4 mt-6 mb-6 px-6">
    <div class="max-w-chat-max mx-auto">
    <!-- 空态 placeholder -->
    <div v-if="messages.length === 0 && !streamingMessage" class="empty-state text-center py-8 text-accent-muted">
      开始新对话或选择一个会话
    </div>

    <!-- 消息列表（连续 assistant 已按 user turn 聚合） -->
    <div v-for="item in aggregatedItems" :key="item.key">
      <MessageUser v-if="item.role === 'user'" :message="item.message" />
      <MessageAssistant 
        v-else 
        :message="item.message"
        @open-file="emit('openFile', $event)"
        @open-original-file="emit('openOriginalFile', $event)"
        @open-diff-file="emit('openDiffFile', $event)"
        @open-subagent-panel="handleOpenSubagentPanel"
      />
    </div>

<!-- 流式消息 -->
    <div v-if="streamingMessage" class="streaming-container">
      <StreamingMessage
        @open-file="emit('openFile', $event)"
        @open-original-file="emit('openOriginalFile', $event)"
        @open-diff-file="emit('openDiffFile', $event)"
        @open-subagent-panel="handleOpenSubagentPanel"
      />
    </div>
    </div>
  </div>
</template>