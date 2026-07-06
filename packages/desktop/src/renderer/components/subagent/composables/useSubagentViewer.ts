// packages/desktop/src/renderer/components/subagent/composables/useSubagentViewer.ts

import { computed, type Ref, type MaybeRef, unref } from 'vue'
import type { FooterSubagentTab, FooterSubagentDetail, SubagentHeaderVM, SubagentViewerVM, TimelineItem, DisplayPart, StreamCommit } from '../../../types/subagent'

function statusIcon(status: FooterSubagentTab['status']): string {
  if (status === 'completed') return '✓'
  if (status === 'cancelled') return '○'
  if (status === 'error') return '✗'
  return '●'
}

function formatDuration(tab?: FooterSubagentTab): string | undefined {
  // Placeholder - will need actual duration from backend
  return undefined
}

function toDisplayPart(commit: StreamCommit): DisplayPart {
  if (commit.kind === 'text') {
    return {
      type: 'text',
      payload: {
        content: commit.text,
        isStreaming: commit.phase !== 'final',
        source: commit.source,
      }
    }
  }
  
  if (commit.kind === 'tool') {
    return {
      type: 'tool',
      payload: {
        icon: commit.tool ?? '?',
        summary: commit.phase === 'final' ? commit.text : '',
        pending: commit.phase === 'start' ? 'Starting...' : 'Running...',
        status: commit.toolState ?? 'running',
        error: commit.toolState === 'error' ? commit.text : undefined
      }
    }
  }
  
  if (commit.kind === 'reasoning') {
    return {
      type: 'reasoning',
      payload: {
        content: commit.text,
        status: commit.toolState === 'running' ? 'thinking' : 'done',
        duration: undefined
      }
    }
  }
  
  if (commit.kind === 'error') {
    return {
      type: 'error',
      payload: {
        text: commit.text
      }
    }
  }
  
  return {
    type: commit.kind as DisplayPart['type'],
    payload: { content: commit.text }
  }
}

export function useSubagentViewer(detailRef: MaybeRef<FooterSubagentDetail | undefined>, tabRef: MaybeRef<FooterSubagentTab | undefined>) {
  const header = computed<SubagentHeaderVM>(() => {
    const tab = unref(tabRef)
    const detail = unref(detailRef)
    return {
      title: tab?.title || tab?.label || 'Subagent',
      icon: statusIcon(tab?.status ?? 'running'),
      duration: formatDuration(tab),
      status: tab?.status ?? 'running',
      toolCount: tab?.toolCalls,
      commitCount: detail?.commits.length ?? 0,
    }
  })
  
  const timeline = computed<TimelineItem[]>(() => {
    const detail = unref(detailRef)
    if (!detail) return []
    return detail.commits.map((commit: StreamCommit) => ({
      type: 'part',
      part: toDisplayPart(commit),
    }))
  })
  
  const autoScroll = computed(() => {
    const tab = unref(tabRef)
    return tab?.status === 'running'
  })
  
  return {
    header,
    timeline,
    autoScroll,
  }
}