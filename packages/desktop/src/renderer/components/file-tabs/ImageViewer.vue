<script setup lang="ts">
import { ref } from 'vue'
import type { ImageModel } from '../../types/presentation'

const props = defineProps<{
  model: ImageModel
  status: 'loading' | 'ready' | 'error'
}>()

const loaded = ref(false)
const error = ref(false)
const enlarged = ref(false)

function handleLoad() { loaded.value = true }
function handleError() { error.value = true }
</script>

<template>
  <div class="image-viewer h-full flex flex-col">
    <!-- Header -->
    <div class="viewer-header px-3 py-2 text-xs text-text-muted border-b border-border bg-bg-surface shrink-0">
      <slot name="toolbar">
        <span class="font-mono">
          <span class="text-text-primary">{{ model.fileName }}</span>
          <span v-if="model.directory" class="text-text-muted ml-1">{{ model.directory }}</span>
        </span>
      </slot>
    </div>

    <!-- Image body -->
    <div class="image-body flex-1 overflow-auto p-4 flex items-center justify-center bg-bg-surface">
      <div v-if="!loaded && !error" class="text-text-muted text-sm animate-pulse">加载中...</div>
      <div v-if="error" class="text-error text-sm">图片加载失败</div>
      <img
        v-show="loaded"
        :src="model.dataUrl"
        :alt="model.filePath"
        loading="lazy"
        class="max-w-full max-h-full rounded border border-border cursor-pointer hover:opacity-80 transition-opacity"
        @load="handleLoad"
        @error="handleError"
        @click="enlarged = !enlarged"
      />
    </div>

    <!-- Enlarged overlay -->
    <div
      v-if="enlarged"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      @click="enlarged = false"
    >
      <img :src="model.dataUrl" :alt="model.filePath" class="max-w-[90vw] max-h-[90vh]" />
    </div>
  </div>
</template>
