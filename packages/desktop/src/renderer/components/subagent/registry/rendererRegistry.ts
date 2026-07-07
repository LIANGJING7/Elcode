// packages/desktop/src/renderer/components/subagent/registry/rendererRegistry.ts

import type { Component } from 'vue'
import TextBlock from '../../part/TextBlock.vue'
import InlineTool from '../../part/InlineTool.vue'
import BlockTool from '../../part/BlockTool.vue'
import ReasoningBlock from '../../part/ReasoningBlock.vue'

// Placeholder components (will be created in later tasks)
const DividerRenderer: Component = { template: '<div class="divider text-xs text-text-muted py-1">────────────</div>' }
const SummaryRenderer: Component = { template: '<div class="summary text-xs text-text-muted py-1">{{ text }}</div>', props: ['text'] }
const UnknownRenderer: Component = { template: '<div class="unknown text-xs text-text-muted">?</div>' }
const ErrorPart: Component = { template: '<div class="error text-xs text-error">{{ text }}</div>', props: ['text'] }

export const rendererRegistry: Record<string, Component> = {
  text: TextBlock,
  tool: InlineTool,
  error: ErrorPart,
  reasoning: ReasoningBlock,
  divider: DividerRenderer,
  summary: SummaryRenderer,
  unknown: UnknownRenderer,
}

export function getRenderer(type: string): Component {
  return rendererRegistry[type] ?? rendererRegistry.unknown
}