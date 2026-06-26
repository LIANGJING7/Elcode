<script setup lang="ts">
import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiStore } from '../../stores/ui'
import type { ArtifactInstance } from '../../artifacts/artifactRegistry'
import DiffView from './DiffView.vue'
import TodoView from './TodoView.vue'

const props = defineProps<{ artifacts: ArtifactInstance[] }>()
const emit = defineEmits<{ inspect: [id: string] }>()

const ui = useUiStore()
const { activeToolCallId } = storeToRefs(ui)

// 自动展开规则: artifacts.length 0→>0 且用户未主动关 → 自动开
watch(
  () => props.artifacts.length,
  (newLen, oldLen) => {
    if (oldLen === 0 && newLen > 0) {
      ui.openArtifactPanelAutomatically()
    }
  }
)

// 根据 artifact.type 选渲染器
function renderComponent(type: string) {
  if (type === 'diff') return DiffView
  if (type === 'todo') return TodoView
  return null // 其他类型暂不渲染
}

function handleInspect(id: string) {
  emit('inspect', id)
}
</script>

<template>
  <div class="artifact-panel bg-surface border-l border-surface w-64 flex flex-col">
    <!-- 头部 + 收起按钮 -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-surface">
      <span class="text-sm font-medium">Artifacts</span>
      <button data-testid="close-btn" class="text-accent-muted hover:text-accent" @click="ui.closeArtifactPanel">
        ✕
      </button>
    </div>

    <!-- 产物列表 -->
    <div class="flex-1 overflow-y-auto p-2 space-y-2">
      <div
        v-for="art in artifacts"
        :key="art.id"
        class="artifact-card bg-surface-hover rounded p-2 cursor-pointer hover:bg-surface"
        :data-artifact-id="art.id"
        @click="handleInspect(art.id)"
      >
        <!-- 标题 -->
        <div class="text-sm font-medium">{{ art.toolCall.name }}</div>

        <!-- 渲染器 -->
        <component
          :is="renderComponent(art.type)"
          v-if="renderComponent(art.type)"
          :tool-call="art.toolCall"
        />
      </div>
    </div>
  </div>
</template>