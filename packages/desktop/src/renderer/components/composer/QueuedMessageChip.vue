<script setup lang="ts">
import type { PendingMessage } from '../../stores/session'

const props = defineProps<{
  pending: PendingMessage
  index: number
}>()

const emit = defineEmits<{
  flush: [pending: PendingMessage]
  edit: [pending: PendingMessage]
  remove: [pendingId: string]
}>()

function handleFlush(e: MouseEvent) {
  e.stopPropagation()
  emit('flush', props.pending)
}

function handleEdit(e: MouseEvent) {
  e.stopPropagation()
  emit('edit', props.pending)
}

function handleRemove(e: MouseEvent) {
  e.stopPropagation()
  emit('remove', props.pending.id)
}
</script>

<template>
  <div
    class="queued-chip group flex items-center gap-2 px-3 py-2 bg-bg-tertiary/80 rounded-lg border border-border/60 transition-colors hover:bg-bg-hover/60"
  >
    <!-- Drag handle (visual only) -->
    <span class="text-text-muted/40 select-none">
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9" cy="5" r="1.5"/>
        <circle cx="15" cy="5" r="1.5"/>
        <circle cx="9" cy="12" r="1.5"/>
        <circle cx="15" cy="12" r="1.5"/>
        <circle cx="9" cy="19" r="1.5"/>
        <circle cx="15" cy="19" r="1.5"/>
      </svg>
    </span>

    <!-- Chips container -->
    <div class="flex flex-col gap-1 flex-1 min-w-0">
      <!-- Agent chips -->
      <div
        v-if="pending.agents && pending.agents.length > 0"
        class="flex flex-wrap gap-1"
      >
        <div
          v-for="(agent, idx) in pending.agents"
          :key="'agent-' + idx"
          class="text-sm font-medium text-yellow-400"
        >
          @{{ agent.name }}
        </div>
      </div>

      <!-- File chips -->
      <div
        v-if="pending.files && pending.files.length > 0"
        class="flex flex-wrap gap-1"
      >
        <div
          v-for="(file, idx) in pending.files"
          :key="'file-' + idx"
          class="flex items-center gap-1 px-2 py-0.5 bg-bg-hover rounded text-xs text-text-muted"
        >
          <svg class="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
          <span class="truncate max-w-[100px]">{{ file.name }}</span>
        </div>
      </div>

      <!-- Message content -->
      <span class="text-sm text-text line-clamp-2 break-words whitespace-pre-wrap">
        {{ pending.content }}
      </span>
    </div>

    <!-- Action buttons -->
    <div class="flex items-center gap-1">
      <!-- Flush (立即) -->
      <button
        class="flex items-center gap-1 px-2 py-1 rounded text-xs text-accent hover:bg-bg-hover transition-colors"
        :title="'立即发送 (#' + (index + 1) + ')'"
        @click="handleFlush"
      >
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="19" x2="12" y2="5"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
        <span>立即</span>
      </button>

      <!-- Edit -->
      <button
        class="p-1 rounded text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
        title="编辑"
        @click="handleEdit"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 3a2.828 2.828 1 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
        </svg>
      </button>

      <!-- Delete -->
      <button
        class="p-1 rounded text-text-muted hover:text-red-500 hover:bg-bg-hover transition-colors"
        title="删除"
        @click="handleRemove"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  </div>
</template>