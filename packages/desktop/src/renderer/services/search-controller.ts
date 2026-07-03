/**
 * Search Controller Service.
 *
 * Unified search interface for all Viewers.
 * Supports:
 * - TextViewer (file content search)
 * - DiffViewer (diff content search)
 * - TerminalViewer (log search)
 * - LogViewer (log search)
 *
 * This controller manages:
 * - Search query state
 * - Match positions (line, column range)
 * - Current match navigation (next/previous)
 * - Scroll to match
 */

import { ref, computed, type Ref } from 'vue'

/**
 * Search match position.
 * Stores exact location for precise highlighting.
 */
export interface SearchMatch {
  /** Line number (1-based) */
  line: number
  /** Column start position (0-based) */
  start: number
  /** Column end position (0-based, exclusive) */
  end: number
  /** Line index in the lines array (for virtual scroll) */
  lineIndex: number
}

/**
 * Search controller interface.
 * All viewers use this same interface for search functionality.
 */
export interface SearchController {
  /** Current search query */
  query: Ref<string>
  /** All matches found */
  matches: Ref<SearchMatch[]>
  /** Current match index (0-based) */
  current: Ref<number>
  /** Whether search is active */
  isActive: Ref<boolean>
  /** Total match count */
  count: ComputedRef<number>
  /** Current match (if any) */
  currentMatch: ComputedRef<SearchMatch | null>

  /** Search for text in lines */
  search(text: string): void
  /** Go to next match */
  next(): void
  /** Go to previous match */
  previous(): void
  /** Clear search */
  clear(): void
  /** Scroll to reveal a match */
  reveal(match: SearchMatch): number
  /** Toggle search panel */
  toggle(): void
}

/**
 * Create a search controller for a lines array.
 *
 * @param lines - Ref to array of lines with text content
 * @param onReveal - Optional callback when revealing a match (for scroll)
 * @returns SearchController instance
 */
export function createSearchController(
  lines: Ref<Array<{ id: string; number: number; text: string }>>,
  onReveal?: (lineIndex: number) => void
): SearchController {
  const query = ref('')
  const matches = ref<SearchMatch[]>([])
  const current = ref(0)
  const isActive = ref(false)

  const count = computed(() => matches.value.length)
  const currentMatch = computed(() =>
    matches.value.length > 0 && current.value >= 0 && current.value < matches.value.length
      ? matches.value[current.value]
      : null
  )

  /**
   * Search for text in all lines.
   * Case-insensitive search.
   */
  function search(text: string): void {
    if (!text || text.trim() === '') {
      clear()
      return
    }

    query.value = text
    matches.value = []
    current.value = 0

    const needle = text.toLowerCase()

    for (let lineIndex = 0; lineIndex < lines.value.length; lineIndex++) {
      const line = lines.value[lineIndex]
      const hay = line.text.toLowerCase()
      let at = hay.indexOf(needle)

      while (at !== -1) {
        matches.value.push({
          line: line.number,
          start: at,
          end: at + text.length,
          lineIndex,
        })
        at = hay.indexOf(needle, at + text.length)
      }
    }

    isActive.value = matches.value.length > 0
  }

  /**
   * Go to next match.
   * Wraps around to first match if at end.
   */
  function next(): void {
    if (matches.value.length === 0) return

    current.value = (current.value + 1) % matches.value.length

    // Reveal current match
    const match = matches.value[current.value]
    reveal(match)
  }

  /**
   * Go to previous match.
   * Wraps around to last match if at beginning.
   */
  function previous(): void {
    if (matches.value.length === 0) return

    current.value = current.value === 0
      ? matches.value.length - 1
      : current.value - 1

    // Reveal current match
    const match = matches.value[current.value]
    reveal(match)
  }

  /**
   * Clear search state.
   */
  function clear(): void {
    query.value = ''
    matches.value = []
    current.value = 0
    isActive.value = false
  }

  /**
   * Reveal a match by scrolling to its line.
   * Returns the line index for scroll position calculation.
   */
  function reveal(match: SearchMatch): number {
    if (onReveal) {
      onReveal(match.lineIndex)
    }
    return match.lineIndex
  }

  /**
   * Toggle search panel.
   */
  function toggle(): void {
    isActive.value = !isActive.value
    if (!isActive.value) {
      clear()
    }
  }

  return {
    query,
    matches,
    current,
    isActive,
    count,
    currentMatch,
    search,
    next,
    previous,
    clear,
    reveal,
    toggle,
  }
}

/**
 * Find matches in a single line.
 * Returns all match positions in the line.
 */
export function findMatchesInLine(lineText: string, query: string): Array<{ start: number; end: number }> {
  if (!query) return []

  const needle = query.toLowerCase()
  const hay = lineText.toLowerCase()
  const matches: Array<{ start: number; end: number }> = []

  let at = hay.indexOf(needle)
  while (at !== -1) {
    matches.push({ start: at, end: at + query.length })
    at = hay.indexOf(needle, at + query.length)
  }

  return matches
}