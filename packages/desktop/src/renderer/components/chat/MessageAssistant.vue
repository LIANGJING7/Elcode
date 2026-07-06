<script setup lang="ts">
import type { Message, ToolCall } from '../../../types/ipc'
import MessageTimeline from '../timeline/MessageTimeline.vue'

const props = defineProps<{ message: Message }>()
const emit = defineEmits<{ 
  openFile: [tool: ToolCall]
  openSubagentPanel: [sessionId: string]
}>()

function handleOpenSubagentPanel(sessionId: string) {
  console.log('[MessageAssistant] handleOpenSubagentPanel:', sessionId)
  emit('openSubagentPanel', sessionId)
}
</script>

<template>
  <div class="message-assistant mb-4">
    <div
      data-testid="assistant-bubble"
      class="max-w-[80%]"
    >
      <MessageTimeline
        :message="message"
        @open-file="emit('openFile', $event)"
        @open-subagent-panel="handleOpenSubagentPanel($event)"
      />
    </div>
  </div>
</template>