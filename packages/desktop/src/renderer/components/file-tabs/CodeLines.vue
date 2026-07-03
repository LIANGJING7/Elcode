<script setup lang="ts">
/**
 * CodeLines — renders RenderLine[] with optional syntax highlighting.
 *
 * This component handles rendering and automatically decides
 * whether to use virtual scrolling based on line count.
 *
 * Virtual scroll threshold:
 * - Line count > 800
 * - OR estimated height > viewport height * 3
 *
 * This ensures large files perform well while keeping
 * small files simple (no virtual overhead).
 */
import { ref, computed, watch, onMounted } from 'vue'
import type { RenderLine, RenderToken } from '../../types/render'
import { useVirtualLines, useVirtualDecision, shouldVirtualize, DEFAULT_LINE_HEIGHT } from '../../composables/useVirtualLines'

const props = withDefaults(defineProps<{
  lines: RenderLine[]
  lineNoWidth?: string
  wrap?: boolean
  showLineNumbers?: boolean
}>(), {
  lineNoWidth: '4ch',
  wrap: false,
  showLineNumbers: true,
})

const emit = defineEmits<{
  scroll: [scrollTop: number]
  selectLine: [lineId: string]
}>()

// Scroll container ref
const scrollElement = ref<HTMLElement>()

// Lines as ref for virtualizer
const linesRef = computed(() => props.lines)

// Virtual decision
const { shouldVirtual, checkVirtualize } = useVirtualDecision(linesRef, scrollElement)

// Virtualizer (only used when shouldVirtual is true)
const { virtualizer, virtualItems, totalSize } = useVirtualLines(linesRef, scrollElement)

// Check on mount and when lines change
onMounted(() => {
  checkVirtualize()
})

watch(() => props.lines.length, () => {
  checkVirtualize()
})

// Computed style for token
function tokenStyle(token: RenderToken): Record<string, string> {
  const style: Record<string, string> = {}

  if (token.color) {
    style.color = token.color
  }

  if (token.fontStyle !== undefined) {
    switch (token.fontStyle) {
      case 1: // italic
        style.fontStyle = 'italic'
        break
      case 2: // bold
        style.fontWeight = 'bold'
        break
      case 4: // underline
        style.textDecoration = 'underline'
        break
      case 3: // italic + bold
        style.fontStyle = 'italic'
        style.fontWeight = 'bold'
        break
      case 5: // italic + underline
        style.fontStyle = 'italic'
        style.textDecoration = 'underline'
        break
      case 6: // bold + underline
        style.fontWeight = 'bold'
        style.textDecoration = 'underline'
        break
      case 7: // italic + bold + underline
        style.fontStyle = 'italic'
        style.fontWeight = 'bold'
        style.textDecoration = 'underline'
        break
    }
  }

  return style
}

// Handle scroll event
function handleScroll(event: Event) {
  emit('scroll', (event.target as HTMLElement).scrollTop)
}

// Handle line click
function handleLineClick(lineId: string) {
  emit('selectLine', lineId)
}
</script>

<template>
  <!-- Scroll container -->
  <div
    ref="scrollElement"
    class="code-lines font-mono text-sm overflow-auto"
    :class="wrap ? 'whitespace-pre-wrap' : 'whitespace-pre'"
    @scroll="handleScroll"
  >
    <!-- Virtual rendering (large files) -->
    <template v-if="shouldVirtual">
      <div
        class="virtual-container relative"
        :style="{ height: `${totalSize}px` }"
      >
        <div
          v-for="virtualItem in virtualItems"
          :key="virtualItem.key"
          class="code-line flex gap-3 px-3 py-0.5 hover:bg-bg-surface cursor-pointer absolute top-0 left-0 w-full"
          :style="{ transform: `translateY(${virtualItem.start}px)` }"
          @click="handleLineClick(lines[virtualItem.index].id)"
        >
          <!-- Line number -->
          <span
            v-if="showLineNumbers"
            class="line-no text-right text-text-muted select-none shrink-0"
            :style="{ width: lineNoWidth }"
          >
            {{ lines[virtualItem.index].number }}
          </span>

          <!-- Line content with tokens -->
          <pre v-if="lines[virtualItem.index].tokens?.length" class="line-text flex-1 min-w-0">
            <span
              v-for="(token, i) in lines[virtualItem.index].tokens"
              :key="i"
              :style="tokenStyle(token)"
            >{{ token.content }}</span>
          </pre>

          <!-- Plain text -->
          <pre v-else class="line-text text-text-primary flex-1 min-w-0">
            {{ lines[virtualItem.index].text }}
          </pre>

          <!-- Slot for extra content -->
          <slot name="line-extra" :line="lines[virtualItem.index]" />
        </div>
      </div>
    </template>

    <!-- Static rendering (small files) -->
    <template v-else>
      <div
        v-for="line in lines"
        :key="line.id"
        class="code-line flex gap-3 px-3 py-0.5 hover:bg-bg-surface cursor-pointer"
        @click="handleLineClick(line.id)"
      >
        <!-- Line number -->
        <span
          v-if="showLineNumbers"
          class="line-no text-right text-text-muted select-none shrink-0"
          :style="{ width: lineNoWidth }"
        >
          {{ line.number }}
        </span>

        <!-- Line content with tokens -->
        <pre v-if="line.tokens && line.tokens.length > 0" class="line-text flex-1 min-w-0">
          <span
            v-for="(token, i) in line.tokens"
            :key="i"
            :style="tokenStyle(token)"
          >{{ token.content }}</span>
        </pre>

        <!-- Plain text -->
        <pre v-else class="line-text text-text-primary flex-1 min-w-0">{{ line.text }}</pre>

        <!-- Slot for extra content -->
        <slot name="line-extra" :line="line" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.code-lines {
  scrollbar-width: thin;
}

.code-lines::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.code-lines::-webkit-scrollbar-track {
  background: transparent;
}

.code-lines::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

.code-lines::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}

.virtual-container {
  contain: strict;
}

.line-text {
  margin: 0;
  padding: 0;
  font-family: inherit;
}

.code-line {
  min-height: 24px;
}
</style>