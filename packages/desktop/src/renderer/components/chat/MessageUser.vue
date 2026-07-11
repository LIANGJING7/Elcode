<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Message, FilePart, AgentPart } from '../../../types/ipc'

const props = defineProps<{ message: Message }>()

// Debug log when message changes
watch(() => props.message, (msg) => {
  console.log('[MessageUser] === Message props ===')
  console.log('[MessageUser]   message.id:', msg.id)
  console.log('[MessageUser]   message.content:', msg.content?.slice(0, 50))
  console.log('[MessageUser]   message.files:', msg.files?.length, msg.files?.map(f => f.name))
  console.log('[MessageUser]   message.agents:', msg.agents?.length, msg.agents?.map(a => a.name))
}, { immediate: true })

// Compute highlighted segments based on agent mentions
const highlightedContent = computed(() => {
  const text = props.message.content || ''
  const agents = props.message.agents || []

  if (agents.length === 0) {
    return [{ text, type: undefined }] as { text: string; type?: 'agent' }[]
  }

  // Sort agents by start position
  const sortedAgents = agents
    .filter(a => a.source?.start !== undefined && a.source?.end !== undefined)
    .sort((a, b) => (a.source!.start || 0) - (b.source!.start || 0))

  const segments: { text: string; type?: 'agent' }[] = []
  let lastIndex = 0

  for (const agent of sortedAgents) {
    const start = agent.source!.start
    const end = agent.source!.end

    // Add text before this mention
    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start) })
    }

    // Add the @mention
    segments.push({ text: text.slice(start, end), type: 'agent' })
    lastIndex = end
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) })
  }

  return segments
})

const previewImage = ref<FilePart | null>(null)
const previewOpen = ref(false)
const imgError = ref<Set<string>>(new Set())

function imageFiles(files: FilePart[] | undefined) {
  if (!files) return []
  return files.filter(f => f.mime.startsWith('image/'))
}

function otherFiles(files: FilePart[] | undefined) {
  if (!files) return []
  return files.filter(f => !f.mime.startsWith('image/'))
}

function handleImageClick(file: FilePart) {
  if (imgError.value.has(file.url)) return
  previewImage.value = file
  previewOpen.value = true
}

function handleImgError(url: string) {
  imgError.value = new Set([...imgError.value, url])
}

function closePreview() {
  previewOpen.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closePreview()
}
</script>

<template>
  <div class="message-user flex justify-end mb-4">
    <div class="flex flex-col items-end gap-1 max-w-[80%]">
      <!-- Image thumbnails -->
      <div
        v-if="imageFiles(message.files).length > 0"
        class="flex flex-wrap gap-1 justify-end"
      >
        <div
          v-for="(file, index) in imageFiles(message.files)"
          :key="'img-' + index"
          class="w-16 h-16 rounded-lg overflow-hidden bg-bg-hover flex-shrink-0"
          :class="imgError.has(file.url) ? 'cursor-default' : 'cursor-pointer hover:opacity-90 transition-opacity'"
          @click="handleImageClick(file)"
        >
          <img
            v-if="!imgError.has(file.url)"
            :src="file.url"
            :alt="file.name || 'image'"
            class="w-full h-full object-cover"
            @error="handleImgError(file.url)"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-text-muted text-xs p-1 text-center leading-tight">
            {{ file.name || 'img' }}
          </div>
        </div>
      </div>

      <!-- Non-image file chips -->
      <div
        v-if="otherFiles(message.files).length > 0"
        class="flex flex-wrap gap-1 justify-end"
      >
        <div
          v-for="(file, index) in otherFiles(message.files)"
          :key="'file-' + index"
          class="flex items-center gap-1.5 bg-bg-hover rounded-lg px-2 py-1 text-xs text-text-muted"
        >
          <svg class="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
          <span class="truncate max-w-[120px]">{{ file.name }}</span>
        </div>
      </div>

      <!-- Text bubble (only show if there's actual text content) -->
      <div
        v-if="message.content && message.content.trim()"
        data-testid="user-bubble"
        class="bg-accent-muted text-surface px-4 py-2 rounded-lg"
      >
        <span
          v-for="(segment, index) in highlightedContent"
          :key="index"
          :class="segment.type === 'agent' ? 'text-yellow-400 font-medium' : ''"
        >
          {{ segment.text }}
        </span>
      </div>
    </div>
  </div>

  <!-- Image preview modal -->
  <div
    v-if="previewOpen && previewImage"
    class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm"
    @click="closePreview"
    @keydown="handleKeydown"
  >
    <div class="relative max-w-[90vw] max-h-[80vh] flex flex-col items-center">
      <button
        class="absolute -top-10 right-0 w-8 h-8 flex items-center justify-center rounded-lg bg-bg-elevated text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
        @click="closePreview"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <img
        :src="previewImage.url"
        :alt="previewImage.name || 'image'"
        class="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-lg"
        @error="closePreview"
      />

      <div v-if="previewImage.name" class="mt-2 text-sm text-text-muted">
        {{ previewImage.name }}
      </div>
    </div>
  </div>
</template>