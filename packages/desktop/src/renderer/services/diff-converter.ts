/**
 * Diff Converter Service.
 *
 * Converts unified diff text to DiffRow[] model for split diff view.
 * This enables single scroll container, natural equal-height sides,
 * simple folding, and easy virtual scroll integration.
 */

import type { RenderLine, DiffRow, DiffHunk } from '../types/render'

/** Generate stable ID */
function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Parse unified diff text into DiffRow[].
 *
 * Input format (unified diff):
 *   --- a/file.ts
 *   +++ b/file.ts
 *   @@ -1,5 +1,6 @@
 *   context line
 *   -removed line
 *   +added line
 *   context line
 *
 * Output format (DiffRow):
 *   Each row represents a pair of lines to display together.
 */
export function parseDiffToRows(diffText: string): {
  rows: DiffRow[]
  hunks: DiffHunk[]
  statistics: { additions: number; deletions: number }
} {
  const lines = diffText.split('\n')
  const rows: DiffRow[] = []
  const hunks: DiffHunk[] = []
  const statistics = { additions: 0, deletions: 0 }

  let currentHunkId = ''
  let oldLine = 0
  let newLine = 0
  let hunkLineCount = 0

  // Buffer for paired changes (consecutive -/+ lines)
  let changeBuffer: Array<{ type: 'remove' | 'add'; text: string; line: number }> = []

  function flushChangeBuffer() {
    // Pair up changes: -old followed by +new becomes a change row
    // Unpaired - becomes deletion-only row
    // Unpaired + becomes addition-only row

    // First, try to pair consecutive -/+ with same content
    const paired: DiffRow[] = []
    const removes = changeBuffer.filter(c => c.type === 'remove')
    const adds = changeBuffer.filter(c => c.type === 'add')

    // Simple pairing: match removes with adds
    // For more sophisticated pairing, could use diff-match-patch
    const minLen = Math.min(removes.length, adds.length)

    for (let i = 0; i < minLen; i++) {
      const r = removes[i]
      const a = adds[i]
      paired.push({
        id: genId(),
        hunkId: currentHunkId,
        type: 'change',
        old: {
          id: genId(),
          number: r.line,
          text: r.text,
        },
        new: {
          id: genId(),
          number: a.line,
          text: a.text,
        },
      })
      statistics.deletions++
      statistics.additions++
    }

    // Unpaired removes
    for (let i = minLen; i < removes.length; i++) {
      const r = removes[i]
      paired.push({
        id: genId(),
        hunkId: currentHunkId,
        type: 'change',
        old: {
          id: genId(),
          number: r.line,
          text: r.text,
        },
        new: undefined,
      })
      statistics.deletions++
    }

    // Unpaired adds
    for (let i = minLen; i < adds.length; i++) {
      const a = adds[i]
      paired.push({
        id: genId(),
        hunkId: currentHunkId,
        type: 'change',
        old: undefined,
        new: {
          id: genId(),
          number: a.line,
          text: a.text,
        },
      })
      statistics.additions++
    }

    rows.push(...paired)
    changeBuffer = []
  }

  for (const rawLine of lines) {
    // Skip empty lines at end
    if (!rawLine && lines.indexOf(rawLine) === lines.length - 1) continue

    // Meta lines: --- a/ +++ b/
    if (rawLine.startsWith('---') || rawLine.startsWith('+++')) {
      // For now, skip meta lines (can be shown in header)
      continue
    }

    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    if (rawLine.startsWith('@@')) {
      // Flush any pending changes
      flushChangeBuffer()

      const match = rawLine.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (match) {
        oldLine = parseInt(match[1], 10)
        newLine = parseInt(match[2], 10)
      } else {
        oldLine = 1
        newLine = 1
      }

      currentHunkId = genId()
      hunkLineCount = 0

      // Create hunk header row
      rows.push({
        id: genId(),
        hunkId: currentHunkId,
        type: 'hunk-header',
        lineCount: 0, // Will be updated after processing hunk
        folded: false,
      })

      // Create hunk metadata
      hunks.push({
        id: currentHunkId,
        startLine: newLine,
        oldStart: oldLine,
        newStart: newLine,
        lineCount: 0,
        folded: false,
        lines: [], // Will be populated later if needed
      })

      continue
    }

    // Context line (starts with space or no prefix)
    if (rawLine.startsWith(' ') || (!rawLine.startsWith('-') && !rawLine.startsWith('+'))) {
      // Flush changes before context
      flushChangeBuffer()

      const text = rawLine.startsWith(' ') ? rawLine.slice(1) : rawLine
      rows.push({
        id: genId(),
        hunkId: currentHunkId,
        type: 'context',
        old: {
          id: genId(),
          number: oldLine,
          text,
        },
        new: {
          id: genId(),
          number: newLine,
          text,
        },
      })
      oldLine++
      newLine++
      hunkLineCount++
      continue
    }

    // Removal line
    if (rawLine.startsWith('-')) {
      changeBuffer.push({
        type: 'remove',
        text: rawLine.slice(1),
        line: oldLine,
      })
      oldLine++
      hunkLineCount++
      continue
    }

    // Addition line
    if (rawLine.startsWith('+')) {
      changeBuffer.push({
        type: 'add',
        text: rawLine.slice(1),
        line: newLine,
      })
      newLine++
      hunkLineCount++
      continue
    }

    // Unknown line (treat as context)
    flushChangeBuffer()
    rows.push({
      id: genId(),
      hunkId: currentHunkId,
      type: 'context',
      old: {
        id: genId(),
        number: oldLine,
        text: rawLine,
      },
      new: {
        id: genId(),
        number: newLine,
        text: rawLine,
      },
    })
    oldLine++
    newLine++
    hunkLineCount++
  }

  // Flush remaining changes
  flushChangeBuffer()

  // Update hunk line counts
  for (const hunk of hunks) {
    const hunkRows = rows.filter(r => r.hunkId === hunk.id && r.type !== 'hunk-header')
    hunk.lineCount = hunkRows.length

    // Update hunk-header row's lineCount
    const headerRow = rows.find(r => r.hunkId === hunk.id && r.type === 'hunk-header')
    if (headerRow) {
      headerRow.lineCount = hunk.lineCount
    }
  }

  return { rows, hunks, statistics }
}

/**
 * Filter rows by folding state.
 * Collapsed hunks show only the header row.
 */
export function filterRowsByFolding(rows: DiffRow[], foldedHunks: Set<string>): DiffRow[] {
  const result: DiffRow[] = []
  let skipUntilNextHunk = false

  for (const row of rows) {
    if (row.type === 'hunk-header') {
      // Always show hunk headers
      result.push(row)
      skipUntilNextHunk = foldedHunks.has(row.hunkId)
    } else if (!skipUntilNextHunk) {
      // Show non-header rows only if not skipping
      result.push(row)
    } else if (row.hunkId !== result[result.length - 1]?.hunkId) {
      // Different hunk, stop skipping
      skipUntilNextHunk = false
      result.push(row)
    }
  }

  return result
}

/**
 * Toggle fold state for a hunk.
 */
export function toggleHunkFold(hunkId: string, foldedHunks: Set<string>): Set<string> {
  const newSet = new Set(foldedHunks)
  if (newSet.has(hunkId)) {
    newSet.delete(hunkId)
  } else {
    newSet.add(hunkId)
  }
  return newSet
}