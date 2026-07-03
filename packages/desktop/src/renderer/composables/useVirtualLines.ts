/**
 * Virtual Lines Composable.
 *
 * Determines whether to use virtual scrolling and provides
 * the virtualizer configuration. Used by CodeLines internally.
 */

import { ref, computed, watch, onMounted, type Ref, type ComputedRef } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'

/** Thresholds for enabling virtual scroll */
const LINE_THRESHOLD = 800
const VIEWPORT_MULTIPLIER = 3

/** Default line height in pixels */
export const DEFAULT_LINE_HEIGHT = 24

/** Overscan buffer (lines rendered outside viewport) */
const OVERSCAN = 10

/**
 * Check if virtual scrolling should be enabled.
 *
 * Criteria:
 * - Line count > 800
 * - OR estimated height > viewport height * 3
 *
 * This ensures performance is maintained for large files
 * while keeping small files simple (no virtual overhead).
 */
export function shouldVirtualize(
  lineCount: number,
  estimatedHeight: number,
  viewportHeight: number
): boolean {
  return (
    lineCount > LINE_THRESHOLD ||
    estimatedHeight > viewportHeight * VIEWPORT_MULTIPLIER
  )
}

/**
 * Create a virtualizer for code lines.
 *
 * @param lines - Computed ref of lines to virtualize
 * @param scrollElement - Ref to the scroll container element
 * @param lineHeight - Height of each line (default: 24px)
 * @returns Virtualizer helper functions
 */
export function useVirtualLines(
  lines: ComputedRef<Array<{ id: string; text: string }>>,
  scrollElement: Ref<HTMLElement | undefined>,
  lineHeight: number = DEFAULT_LINE_HEIGHT
) {
  // Get the virtualizer
  const virtualizer = useVirtualizer({
    count: lines.value.length,
    getScrollElement: () => scrollElement.value ?? null,
    estimateSize: () => lineHeight,
    overscan: OVERSCAN,
  })

  // Get virtual items
  const virtualItems = computed(() => virtualizer.value.getVirtualItems())

  // Get total size
  const totalSize = computed(() => virtualizer.value.getTotalSize())

  return {
    virtualizer,
    virtualItems,
    totalSize,
  }
}

/**
 * Hook to determine if virtual scrolling should be used.
 *
 * Automatically checks on mount and when lines change.
 */
export function useVirtualDecision(
  lines: ComputedRef<Array<{ id: string; text: string }>>,
  scrollElement: Ref<HTMLElement | undefined>
) {
  const shouldVirtual = ref(false)

  // Check viewport height and line count
  function checkVirtualize() {
    if (!scrollElement.value) {
      // No scroll element yet, assume based on line count
      shouldVirtual.value = lines.value.length > LINE_THRESHOLD
      return
    }

    const viewportHeight = scrollElement.value.getBoundingClientRect().height
    const estimatedHeight = lines.value.length * DEFAULT_LINE_HEIGHT

    shouldVirtual.value = shouldVirtualize(
      lines.value.length,
      estimatedHeight,
      viewportHeight
    )
  }

  return {
    shouldVirtual,
    checkVirtualize,
  }
}