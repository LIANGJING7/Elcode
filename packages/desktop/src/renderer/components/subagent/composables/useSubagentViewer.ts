// packages/desktop/src/renderer/components/subagent/composables/useSubagentViewer.ts

import { computed, type MaybeRef, unref } from 'vue'
import type { FooterSubagentTab, SubagentHeaderVM, SubagentViewerVM, TimelineItem, DisplayPart } from '../../../types/subagent'
import type { FooterSubagentDetail } from '../../../types/subagent'
import type { Message, ToolCall } from '../../../../types/ipc'

function statusIcon(status: FooterSubagentTab['status']): string {
  if (status === 'completed') return '✓'
  if (status === 'cancelled') return '○'
  if (status === 'error') return '✗'
  return '●'
}

function formatDuration(tab?: FooterSubagentTab): string | undefined {
  return undefined
}

function buildTimelineFromMessages(messages: Message[]): TimelineItem[] {
  if (!messages || messages.length === 0) return []

  const items: TimelineItem[] = []
  let assistantGroup: Message[] = []

  const flushAssistantGroup = () => {
    if (assistantGroup.length === 0) return

    const mergedReasoning = assistantGroup
      .map(m => m.reasoning)
      .filter((r): r is string => Boolean(r))
      .join('\n\n')

    if (mergedReasoning) {
      items.push({
        type: 'part',
        part: {
          type: 'reasoning',
          payload: {
            content: mergedReasoning,
            status: 'done',
          }
        }
      })
    }

    for (const msg of assistantGroup) {
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        for (const tool of msg.toolCalls) {
          items.push({
            type: 'part',
            part: {
              type: 'tool',
              payload: { tool },
            }
          })
        }
      }

      if (msg.content && msg.content.trim()) {
        items.push({
          type: 'part',
          part: {
            type: 'text',
            payload: {
              content: msg.content,
              source: 'assistant',
            }
          }
        })
      }
    }

    assistantGroup = []
  }

  for (const msg of messages) {
    if (msg.role === 'user') {
      flushAssistantGroup()
      if (msg.content) {
        items.push({
          type: 'part',
          part: {
            type: 'text',
            payload: {
              content: msg.content,
              source: 'user',
            }
          }
        })
      }
    } else if (msg.role === 'assistant') {
      assistantGroup.push(msg)
    }
  }

  flushAssistantGroup()
  return items
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
    
    if (detail.messages && detail.messages.length > 0) {
      return buildTimelineFromMessages(detail.messages)
    }
    
    return []
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