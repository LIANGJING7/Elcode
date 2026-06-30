# Tool Call UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bulky tool call card UI with a compact list-row layout that matches mainstream AI products (ChatGPT / Claude Code / Cursor).

**Architecture:** Rebuild `ToolCallCompact.vue` as a slim list row (status icon + tool name + summary + optional gray detail), simplify `ToolCallContainer.vue` to remove shimmer/left-border timeline, add optional collapsible header to `StreamingTools.vue`, and adjust `StreamingMessage.vue` spacing. State management and types remain unchanged.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS, Vitest

---

## File Structure

| File | Responsibility |
|------|---------------|
| `ToolCallCompact.vue` | **Core visual change** — compact list row with status icon, tool name, summary, gray detail, hover arrow |
| `ToolCallContainer.vue` | **Simplified wrapper** — remove shimmer animation, left border, timeline dots; manage expand/collapse |
| `ToolCallDetail.vue` | **Detail panel** — show Input/Output/Error/Duration when expanded |
| `StreamingTools.vue` | **Tool list container** — remove left timeline border/dots; add optional "Tool Calls (N)" header; add collapsible region |
| `StreamingMessage.vue` | **Message container** — adjust spacing between Reasoning/Tools/Text sections; remove outer bubble border |
| `selectors.ts` | **Summary generator** — update `formatToolSummary` to return `{ name, summary, detail }` instead of emoji-prefixed string |

---

### Task 1: Update Summary Generator in Selectors

**Files:**
- Modify: `packages/desktop/src/renderer/stores/streaming/selectors.ts`

- [ ] **Step 1: Define ToolSummary interface**

Add to `selectors.ts` (near top, after imports):

```ts
export interface ToolSummary {
  /** Tool display name (plain, no emoji) */
  name: string
  /** Primary summary text (bold in UI) */
  summary: string
  /** Optional gray detail text (right side) */
  detail: string | null
}
```

- [ ] **Step 2: Rewrite `formatToolSummary`**

Replace the existing `formatToolSummary` function (lines 249-282) with:

```ts
function formatToolSummary(name: string, args: Record<string, unknown>): ToolSummary {
  const truncate = (str: string, maxLen: number = 50): string => {
    if (!str) return ''
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
  }

  switch (name) {
    case 'read':
      return { name: 'read', summary: truncate(String(args.filePath ?? args.path ?? '')), detail: null }
    case 'write':
      return { name: 'write', summary: truncate(String(args.filePath ?? args.path ?? '')), detail: null }
    case 'edit':
      return { name: 'edit', summary: truncate(String(args.filePath ?? args.path ?? '')), detail: null }
    case 'bash':
    case 'shell':
      return { name: 'bash', summary: truncate(String(args.command ?? ''), 50), detail: null }
    case 'grep':
      return { name: 'grep', summary: `"${truncate(String(args.pattern ?? ''))}"`, detail: null }
    case 'glob':
      return { name: 'glob', summary: truncate(String(args.pattern ?? '')), detail: null }
    case 'web_search':
      return { name: 'search', summary: truncate(String(args.query ?? '')), detail: null }
    case 'web_fetch':
      return { name: 'fetch', summary: extractDomain(String(args.url ?? '')), detail: null }
    case 'task':
      return { name: 'task', summary: truncate(String(args.description ?? ''), 40), detail: null }
    case 'todo_write':
      return { name: 'todo', summary: 'Update todo list', detail: null }
    case 'skill':
      return { name: 'skill', summary: truncate(String(args.skill ?? args.name ?? '')), detail: null }
    default:
      return { name, summary: name, detail: null }
  }
}

function extractDomain(url: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
```

- [ ] **Step 3: Update `toolSummary` selector return type**

Change the `toolSummary` selector (lines 81-86) to return `ComputedRef<ToolSummary>`:

```ts
export function toolSummary(tool: StreamingToolCall): ComputedRef<ToolSummary> {
  return computed(() => {
    const args = parseToolArgs(tool.rawInput)
    return formatToolSummary(tool.name, args)
  })
}
```

- [ ] **Step 4: Export ToolSummary interface**

Add `ToolSummary` to the exports at the bottom of the file (update the `selectors` object or add a named export).

- [ ] **Step 5: Run existing tests**

Run: `cd packages/desktop && bun test`
Expected: All existing tests pass (no behavior change yet, just type changes).

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/src/renderer/stores/streaming/selectors.ts
git commit -m "refactor: rewrite tool summary generator for compact list layout"
```

---

### Task 2: Rewrite ToolCallCompact.vue

**Files:**
- Modify: `packages/desktop/src/renderer/components/tool/ToolCallCompact.vue`

- [ ] **Step 1: Replace entire component template**

```vue
<script setup lang="ts">
/**
 * ToolCallCompact - Compact list row for tool calls
 *
 * Shows: status icon + tool name + summary + optional gray detail
 * Hover: background highlight + right arrow indicator
 */
import type { StreamingToolCall } from '../../stores/streaming/types'
import { computed } from 'vue'
import { toolSummary, type ToolSummary } from '../../stores/streaming/selectors'

const props = defineProps<{
  tool: StreamingToolCall
}>()

const emit = defineEmits<{
  expand: []
}>()

// Get structured summary
const summary: ToolSummary = toolSummary(props.tool).value

// Status icon based on lifecycle
const statusIcon = computed(() => {
  switch (props.tool.lifecycle) {
    case 'preparing': return { char: '○', class: 'text-text-muted' }
    case 'waiting': return { char: '○', class: 'text-warning animate-pulse' }
    case 'running': return { char: '●', class: 'text-warning animate-pulse-glow' }
    case 'streaming': return { char: '●', class: 'text-warning animate-pulse-glow' }
    case 'completed': return { char: '✓', class: 'text-success' }
    case 'failed': return { char: '✗', class: 'text-error' }
    case 'cancelled': return { char: '○', class: 'text-text-muted line-through' }
    default: return { char: '○', class: 'text-text-muted' }
  }
})
</script>

<template>
  <button
    class="tool-call-row w-full flex items-center gap-2 text-left cursor-pointer rounded px-2 py-1.5 transition-colors hover:bg-bg-surface group"
    @click="emit('expand')"
  >
    <!-- Status icon -->
    <span
      class="status-icon text-sm shrink-0 w-5 text-center"
      :class="statusIcon.class"
    >
      {{ statusIcon.char }}
    </span>

    <!-- Tool name (mono, fixed width) -->
    <span class="tool-name text-xs font-mono text-text-secondary w-20 shrink-0 truncate">
      {{ summary.name }}
    </span>

    <!-- Summary (bold) -->
    <span class="summary text-xs text-text-primary font-medium flex-1 truncate">
      {{ summary.summary }}
    </span>

    <!-- Optional gray detail -->
    <span
      v-if="summary.detail"
      class="detail text-xs text-text-muted shrink-0 truncate max-w-40"
    >
      {{ summary.detail }}
    </span>

    <!-- Hover arrow (only visible on hover) -->
    <svg
      class="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</template>

<style scoped>
.animate-pulse {
  animation: icon-pulse 1.5s ease-in-out infinite;
}

.animate-pulse-glow {
  animation: icon-pulse-glow 1.2s ease-in-out infinite;
}

@keyframes icon-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes icon-pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

.line-through {
  text-decoration: line-through;
}
</style>
```

- [ ] **Step 2: Run existing tests**

Run: `cd packages/desktop && bun test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/components/tool/ToolCallCompact.vue
git commit -m "feat(ToolCallCompact): compact list row layout for tool calls"
```

---

### Task 3: Simplify ToolCallContainer.vue

**Files:**
- Modify: `packages/desktop/src/renderer/components/tool/ToolCallContainer.vue`

- [ ] **Step 1: Replace entire component**

Remove: shimmer overlay, left border, `borderClass`, `showShimmer`, `formatDuration` import.

```vue
<script setup lang="ts">
/**
 * ToolCallContainer - Expand/collapse manager for tool call
 *
 * Renders compact row (default) or detail panel (expanded).
 */
import { ref } from 'vue'
import type { StreamingToolCall } from '../../stores/streaming/types'
import { formatDuration } from '../../stores/streaming/types'
import { computed } from 'vue'
import ToolCallCompact from './ToolCallCompact.vue'
import ToolCallDetail from './ToolCallDetail.vue'

const props = defineProps<{
  tool: StreamingToolCall
  isStreaming: boolean
}>()

const expanded = ref(props.tool.expanded)

// Duration for detail view
const duration = computed(() => {
  if (props.tool.endedAt) {
    return formatDuration(props.tool.endedAt - props.tool.startedAt)
  }
  if (props.tool.lifecycle === 'running' || props.tool.lifecycle === 'streaming') {
    return formatDuration(Date.now() - props.tool.startedAt)
  }
  return null
})

function toggleExpanded() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div class="tool-call-container">
    <!-- Compact row (default) -->
    <ToolCallCompact
      v-if="!expanded"
      :tool="tool"
      @expand="toggleExpanded"
    />

    <!-- Detail panel (expanded) -->
    <ToolCallDetail
      v-else
      :tool="tool"
      :duration="duration"
      @collapse="toggleExpanded"
    />
  </div>
</template>
```

- [ ] **Step 2: Run existing tests**

Run: `cd packages/desktop && bun test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/components/tool/ToolCallContainer.vue
git commit -m "refactor(ToolCallContainer): remove shimmer and left-border timeline"
```

---

### Task 4: Update ToolCallDetail.vue

**Files:**
- Modify: `packages/desktop/src/renderer/components/tool/ToolCallDetail.vue`

- [ ] **Step 1: Simplify the detail layout**

The detail view should show Input, Output, Error, and Duration. Remove the complex header with status badges and collapse arrow — just use a simple back button.

Key changes:
- Move duration display to a subtle position at the bottom
- Clean up Input/Output sections with clear labels
- Remove the status badge from header

```vue
<template>
  <div class="detail-view bg-bg-elevated rounded-lg border border-border mt-1">
    <!-- Header with collapse button -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border">
      <button
        class="text-text-muted hover:text-text transition-colors cursor-pointer"
        @click="emit('collapse')"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span class="text-xs font-semibold text-accent font-mono">
        {{ tool.name }}
      </span>
    </div>

    <div class="p-3 space-y-3">
      <!-- Input args -->
      <div>
        <div class="text-xs text-text-muted mb-1">Input</div>
        <pre class="bg-code-bg p-2 rounded text-xs overflow-x-auto font-mono leading-relaxed">{{ JSON.stringify(parsedInput, null, 2) }}</pre>
      </div>

      <!-- Progress (streaming tools) -->
      <div v-if="showProgress">
        <div class="text-xs text-text-muted mb-1">Progress</div>
        <div class="bg-code-bg p-2 rounded text-xs overflow-x-auto max-h-32">
          <div
            v-for="(p, idx) in tool.progress.slice(-5)"
            :key="idx"
            class="text-text-muted font-mono"
          >
            {{ p.message }}
          </div>
        </div>
      </div>

      <!-- Output -->
      <div v-if="showOutput">
        <div class="text-xs text-text-muted mb-1">Output</div>
        <pre
          class="bg-code-bg p-2 rounded text-xs overflow-x-auto font-mono leading-relaxed max-h-64"
        >{{ typeof parsedOutput === 'object' ? JSON.stringify(parsedOutput, null, 2) : parsedOutput }}</pre>
      </div>

      <!-- Error -->
      <div v-if="showError">
        <div class="text-xs text-error mb-1">Error</div>
        <div class="bg-error-muted/20 p-2 rounded text-xs text-error border border-error/30">
          {{ tool.error }}
        </div>
      </div>

      <!-- Duration (bottom) -->
      <div v-if="duration" class="text-xs text-text-muted tabular-nums">
        {{ duration }}
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run existing tests**

Run: `cd packages/desktop && bun test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/components/tool/ToolCallDetail.vue
git commit -m "refactor(ToolCallDetail): simplified detail layout with duration at bottom"
```

---

### Task 5: Add Collapsible Header to StreamingTools.vue

**Files:**
- Modify: `packages/desktop/src/renderer/components/streaming/StreamingTools.vue`

- [ ] **Step 1: Add optional header and collapsible region**

```vue
<script setup lang="ts">
/**
 * StreamingTools - Tool calls list
 *
 * Compact list layout. Shows optional "Tool Calls (N)" header when:
 * - Tool count >= 8, or
 * - Region is collapsed
 */
import { ref, computed } from 'vue'
import type { StreamingToolCall } from '../../stores/streaming/types'
import ToolCallContainer from '../tool/ToolCallContainer.vue'

const props = defineProps<{
  tools: StreamingToolCall[]
  isStreaming: boolean
}>()

const collapsed = ref(false)

// Show header when many tools or collapsed
const showHeader = computed(() =>
  props.tools.length >= 8 || collapsed.value
)

function toggleCollapsed() {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <div class="streaming-tools my-3">
    <!-- Optional header -->
    <button
      v-if="showHeader"
      class="flex items-center gap-2 text-xs text-text-secondary font-medium px-1 py-1 hover:bg-bg-surface rounded cursor-pointer w-full"
      @click="toggleCollapsed"
    >
      <svg
        class="w-3 h-3 transition-transform"
        :class="collapsed ? '' : 'rotate-90'"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      Tool Calls ({{ tools.length }})
    </button>

    <!-- Tool list -->
    <div v-if="!collapsed" class="space-y-0.5">
      <ToolCallContainer
        v-for="tool in tools"
        :key="tool.id"
        :tool="tool"
        :is-streaming="isStreaming"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run existing tests**

Run: `cd packages/desktop && bun test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/components/streaming/StreamingTools.vue
git commit -m "feat(StreamingTools): add optional collapsible header for tool calls"
```

---

### Task 6: Adjust StreamingMessage.vue Layout

**Files:**
- Modify: `packages/desktop/src/renderer/components/streaming/StreamingMessage.vue`

- [ ] **Step 1: Remove outer bubble border, adjust spacing**

The goal is to make Reasoning/Tools/Text sections flow more naturally without heavy card borders.

Changes:
- Remove `border border-border/60 rounded-xl` from the content area
- Reduce vertical gaps between sections
- Keep the avatar on the left

```vue
<template>
  <div class="streaming-message flex items-start gap-3 animate-fade-in">
    <!-- Assistant avatar -->
    <div class="role-avatar w-8 h-8 rounded-lg bg-bg-surface flex items-center justify-center shrink-0 ring-1 ring-border shadow-sm">
      <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    </div>

    <!-- Content area (no border) -->
    <div class="message-content flex-1 min-w-0">
      <!-- Reasoning -->
      <StreamingReasoning
        v-if="showReasoning"
        :content="streamingStore.displayedReasoning.value"
        :status="streamingStore.state.reasoning.status"
        :duration="null"
      />

      <!-- Tool calls list -->
      <StreamingTools
        v-if="hasTools"
        :tools="streamingStore.orderedTools.value"
        :is-streaming="isStreaming"
      />

      <!-- Text content -->
      <StreamingText
        v-if="hasContent"
        :content="streamingStore.displayedContent.value"
        :is-streaming="isStreaming"
      />

      <!-- Loading indicator when no content yet -->
      <div v-if="!hasContent && !hasTools && !showReasoning" class="flex items-center gap-3">
        <div class="flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
          <span class="w-1.5 h-1.5 rounded-full bg-accent/60" style="animation: pulse 1.2s ease-in-out 0.15s infinite" />
          <span class="w-1.5 h-1.5 rounded-full bg-accent/40" style="animation: pulse 1.2s ease-in-out 0.3s infinite" />
        </div>
        <span class="text-xs text-text-muted">Thinking...</span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run existing tests**

Run: `cd packages/desktop && bun test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/components/streaming/StreamingMessage.vue
git commit -m "refactor(StreamingMessage): remove outer border, tighter section spacing"
```

---

### Task 7: Verify Full Integration

**Files:**
- No new files

- [ ] **Step 1: Build and run desktop app**

Run: `cd packages/desktop && bun run dev`
Expected: App compiles and opens without errors.

- [ ] **Step 2: Start a session and send a message that triggers tool calls**

Verify visually:
- [ ] Tool calls appear as compact list rows (not big cards)
- [ ] Status icons show correctly (✓, ●, )
- [ ] Tool names in monospace font
- [ ] Summaries are bold, no emojis
- [ ] Hover shows background highlight + right arrow
- [ ] Clicking a row expands detail panel
- [ ] Detail panel shows Input/Output/Duration
- [ ] Running tools show breathing pulse animation
- [ ] "Tool Calls (N)" header appears when >= 8 tools
- [ ] Reasoning/Tools/Text sections flow without heavy borders

- [ ] **Step 3: Run all tests**

Run: `cd packages/desktop && bun test`
Expected: All tests pass.

- [ ] **Step 4: Commit final changes (if any)**

```bash
git add -A
git commit -m "feat: tool call UI redesign complete"
```

---

## Summary of Changes

| Task | File | Key Change |
|------|------|-----------|
| 1 | `selectors.ts` | New `ToolSummary` interface, rewrite `formatToolSummary` |
| 2 | `ToolCallCompact.vue` | Complete rewrite: compact list row |
| 3 | `ToolCallContainer.vue` | Remove shimmer, left border, timeline dots |
| 4 | `ToolCallDetail.vue` | Simplified layout, duration at bottom |
| 5 | `StreamingTools.vue` | Add optional header, collapsible region, remove timeline |
| 6 | `StreamingMessage.vue` | Remove outer border, tighter spacing |
| 7 | (verify) | Visual + test verification |
