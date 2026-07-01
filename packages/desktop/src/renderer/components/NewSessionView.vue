<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useSessionStore } from '../stores/session'
import { useModelsStore } from '../stores/models'
import { useUiStore } from '../stores/ui'
import ComposerInput from './composer/ComposerInput.vue'
import SessionOptions from './composer/SessionOptions.vue'
import WorkspaceSelector from './composer/WorkspaceSelector.vue'

const sessionStore = useSessionStore()
const modelsStore = useModelsStore()
const ui = useUiStore()

const inputRef = ref<{ focus: () => void } | null>(null)
const inputValue = ref('')
const isFocused = ref(false)
const sessionOptions = ref<Record<string, unknown>>({ mode: 'build', model: '' })

// 初始化模型选择
onMounted(() => {
  if (modelsStore.selectedModel) {
    sessionOptions.value.model = modelsStore.selectedModel
  }
  nextTick(() => inputRef.value?.focus())
})

const canSend = computed(() => inputValue.value.trim().length > 0)

async function handleSend(content: string) {
    console.log('[DEBUG NewSessionView] === handleSend CALLED ===')
    console.log('[DEBUG NewSessionView] Content:', content.slice(0, 50))
    
    const mode = sessionOptions.value.mode as string
    const finalContent = mode === 'plan' && !content.startsWith('[mode=plan]')
      ? `[mode=plan]\n${content}`
      : content

    console.log('[DEBUG NewSessionView] Final content:', finalContent.slice(0, 50))
    console.log('[DEBUG NewSessionView] Calling sessionStore.sendMessage')
    
    await sessionStore.sendMessage(finalContent)
    
    console.log('[DEBUG NewSessionView] ✓ sendMessage completed')
    ui.setView('chat')
  }

function handleManualSend() {
  if (canSend.value) {
    handleSend(inputValue.value)
    inputValue.value = ''
  }
}
</script>

<template>
  <div class="new-session-view flex-1 flex items-center justify-center bg-bg">
    <div class="w-full max-w-2xl mx-6">
      <!-- LCODE 标识 -->
      <div class="text-4xl font-bold text-text-muted/30 mb-4 text-center select-none">
        LCODE
      </div>

      <!-- 工作区选择器（左对齐） -->
      <div class="flex justify-start mb-6">
        <WorkspaceSelector />
      </div>

      <!-- 输入卡片 -->
      <div
        class="bg-bg-elevated rounded-2xl shadow-lg transition-all duration-200 flex flex-col"
        :class="isFocused ? 'shadow-md' : 'shadow-lg'"
      >
        <!-- 输入区域 -->
        <div class="flex-1 min-h-[80px] px-3 pt-3 pb-1">
          <ComposerInput
            ref="inputRef"
            v-model:value="inputValue"
            placeholder="Ask anything... (Shift+Enter for new line)"
            @send="handleSend"
            @focus="isFocused = true"
            @blur="isFocused = false"
          />
        </div>

        <!-- 底部工具栏 -->
        <div class="flex items-center gap-2 px-3 py-2 flex-shrink-0">
          <!-- Plus Button -->
          <button
            class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-bg-hover hover:bg-bg-tertiary text-text-muted transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <!-- Spacer -->
          <div class="flex-1"></div>

          <!-- SessionOptions + Send -->
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <SessionOptions
              v-model:options="sessionOptions"
              :editing-session="false"
            />

            <!-- Send Button -->
            <button
              class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              :class="canSend
                ? 'bg-accent hover:bg-accent-hover text-white'
                : 'bg-bg-hover text-text-muted'"
              :disabled="!canSend"
              title="Send (Enter)"
              @click="handleManualSend"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <!-- Footer hints -->
        <div
          v-if="inputValue.length > 0"
          class="flex items-center justify-end px-4 py-1.5 border-t border-border/60"
        >
          <div class="flex items-center gap-2">
            <kbd class="text-xs text-text-muted bg-bg-hover px-1.5 py-0.5 rounded font-mono">Enter</kbd>
            <span class="text-xs text-text-muted">to send</span>
            <span class="text-border mx-0.5">·</span>
            <kbd class="text-xs text-text-muted bg-bg-hover px-1.5 py-0.5 rounded font-mono">Shift+Enter</kbd>
            <span class="text-xs text-text-muted">new line</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.new-session-view {
  background-image:
    radial-gradient(ellipse at top left, var(--color-accent-glow) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, var(--color-accent-muted) 0%, transparent 50%);
}
</style>