<script setup lang="ts">
import type { FileTab } from '../../types/presentation'

defineProps<{
  tabs: FileTab[]
  activeId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  close: [id: string]
  closeAll: []
}>()
</script>

<template>
  <div class="file-tabs-header flex items-center bg-bg-elevated border-b border-border shrink-0">
    <!-- 标签列表 -->
    <div class="tabs-scroll flex-1 flex overflow-x-auto">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :data-tab-id="tab.id"
        :class="[
          'tab-item flex items-center gap-1 px-3 py-2 text-xs border-r border-border',
          'hover:bg-bg-surface transition-colors whitespace-nowrap',
          tab.id === activeId ? 'bg-bg-surface font-medium' : ''
        ]"
        @click="emit('select', tab.id)"
      >
        <span :class="tab.id === activeId ? 'text-text' : 'text-text-muted'">
          {{ tab.title }}
        </span>
        <span v-if="tab.subtitle" class="text-text-muted text-[10px]">
          {{ tab.subtitle }}
        </span>
        <span
          :data-close-id="tab.id"
          class="close-btn text-text-muted hover:text-error ml-1 px-0.5"
          @click.stop="emit('close', tab.id)"
        >
          ✕
        </span>
      </button>
    </div>

    <!-- 关闭全部 -->
    <button
      v-if="tabs.length > 1"
      data-testid="close-all"
      class="close-all px-3 py-2 text-xs text-text-muted hover:text-text border-l border-border shrink-0"
      @click="emit('closeAll')"
    >
      关闭全部
    </button>
  </div>
</template>
