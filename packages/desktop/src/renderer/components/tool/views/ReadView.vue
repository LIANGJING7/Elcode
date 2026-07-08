<script setup lang="ts">
/**
 * ReadView — renders a ReadViewModel, discriminated by variant:
 *   - file:      line-numbered code content
 *   - directory: entry list
 *   - image:     inline <img>
 */
import { computed } from 'vue'
import type { ReadViewModel } from '../../../tool/rules/read'

const props = defineProps<{ vm: ReadViewModel }>()

const isFile = computed(() => props.vm.variant === 'file')
const isDir = computed(() => props.vm.variant === 'directory')
const isImage = computed(() => props.vm.variant === 'image')

// Extract file name from path
const fileName = computed(() => {
  if (!props.vm.filePath) return ''
  const parts = props.vm.filePath.split(/[\\/]/)
  return parts[parts.length - 1] || props.vm.filePath
})

// Build numbered lines for the file variant
const numberedLines = computed(() => {
  if (!isFile.value) return []
  const vm = props.vm as Extract<ReadViewModel, { variant: 'file' }>
  return vm.content.split('\n').map((text, i) => ({
    no: vm.lineStart + i,
    text,
  }))
})

const dirEntries = computed(() => {
  if (!isDir.value) return []
  return (props.vm as Extract<ReadViewModel, { variant: 'directory' }>).entries
})

const imgVm = computed(() => props.vm as Extract<ReadViewModel, { variant: 'image' }>)
const fileVm = computed(() => props.vm as Extract<ReadViewModel, { variant: 'file' }>)
</script>

<template>
  <div class="read-view text-xs">
    <!-- File content -->
    <template v-if="isFile">
      <div class="flex items-center gap-2 text-text-muted mb-2 font-mono">
        <span class="text-text flex-shrink-0">读取</span>
        <span class="font-medium text-text" :title="fileVm.filePath">{{ fileName }}</span>
        <span v-if="fileVm.options?.offset != null" class="text-text-muted">offset={{ fileVm.options.offset }}</span>
        <span v-if="fileVm.options?.limit != null" class="text-text-muted">limit={{ fileVm.options.limit }}</span>
      </div>
      <div class="bg-code-bg rounded overflow-x-auto max-h-96 overflow-y-auto font-mono">
        <div
          v-for="l in numberedLines"
          :key="l.no"
          class="flex gap-2 px-1 hover:bg-bg-surface"
        >
          <span class="text-text-muted shrink-0 w-10 text-right select-none">{{ l.no }}</span>
          <span class="text-text-primary whitespace-pre">{{ l.text }}</span>
        </div>
      </div>
    </template>

    <!-- Directory listing -->
    <template v-else-if="isDir">
      <div class="flex items-center gap-2 text-text-muted mb-2 font-mono">
        <span class="text-text flex-shrink-0">读取</span>
        <span class="font-medium text-text">{{ (vm as any).path }}</span>
        <span v-if="(vm as any).totalEntries != null" class="text-text-muted">{{ (vm as any).totalEntries }} entries</span>
      </div>
      <div class="max-h-96 overflow-y-auto space-y-0.5 font-mono">
        <div
          v-for="e in dirEntries"
          :key="e"
          class="px-1 py-0.5 hover:bg-bg-surface rounded truncate text-text-primary"
        >
          {{ e }}
        </div>
      </div>
    </template>

    <!-- Image -->
    <template v-else-if="isImage">
      <div class="flex items-center gap-2 text-text-muted mb-2 font-mono">
        <span class="text-text flex-shrink-0">读取</span>
        <span class="font-medium text-text">{{ imgVm.fileName }}</span>
      </div>
      <img :src="imgVm.dataUrl" :alt="imgVm.filePath" class="max-w-full rounded border border-border" />
    </template>
  </div>
</template>
