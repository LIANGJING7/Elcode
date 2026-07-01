<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

const src = computed(() => {
  return props.openToken.attrs?.find((a: any[]) => a[0] === 'src')?.[1] ?? ''
})
const alt = computed(() => props.openToken.content || '')

const loaded = ref(false)
const error = ref(false)
const enlarged = ref(false)
</script>

<template>
  <div class="my-2">
    <span v-if="!loaded && !error" class="text-text-muted text-xs animate-pulse">加载中...</span>
    <span v-if="error" class="text-error text-xs">图片加载失败</span>
    <img
      v-show="loaded"
      :src="src"
      :alt="alt"
      loading="lazy"
      class="max-w-full rounded border border-border cursor-pointer hover:opacity-80"
      @load="loaded = true"
      @error="error = true"
      @click="enlarged = !enlarged"
    />
    <div v-if="enlarged" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" @click="enlarged = false">
      <img :src="src" :alt="alt" class="max-w-[90vw] max-h-[90vh]" />
    </div>
  </div>
</template>
