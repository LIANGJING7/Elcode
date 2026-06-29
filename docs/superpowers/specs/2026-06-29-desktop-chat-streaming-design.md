# Desktop Chat Streaming Design

**Date**: 2026-06-29  
**Author**: Vera  
**Status**: Draft

## Overview

This document describes the design for improving the desktop application's chat streaming display, focusing on:

1. **Tool call display** - Compact, timeline-style tool execution visualization
2. **Streaming/real-time display** - Thinking state animation, tool execution progress, real-time text rendering

## Problem Statement

### Current Issues

1. **SSE event handling incomplete**: `session.ts` only handles `text.delta/ended`, `reasoning.*`, `step.ended`, missing all `tool.*` events
2. **Tool call rendering missing**: `ChatTimeline.vue` has basic tool call display but no real-time status/progress
3. **No streaming state management**: `streamingMessage` only stores `content` and `reasoning`, missing `toolCalls`
4. **No lifecycle tracking**: Tools appear as completed without showing execution progress

### SSE Events from Backend

| Event Type | Description | Key Data |
|------------|-------------|----------|
| `tool.input.started` | Tool input started | `callID`, `name` |
| `tool.input.delta` | Tool args delta | `callID`, `delta` |
| `tool.input.ended` | Tool args complete | `callID`, `text` |
| `tool.called` | Tool invoked | `tool`, `input`, `provider` |
| `tool.progress` | Execution progress | `structured`, `content` |
| `tool.success` | Execution success | `output`, `result` |
| `tool.failed` | Execution failed | `error` |
| `reasoning.started/delta/ended` | Thinking process | `text`, `duration` |
| `text.delta/ended` | Text streaming | `delta`, `text` |
| `step.started/ended` | Step lifecycle | `assistantMessageID`, `finish` |

## Architecture

### High-Level Flow

```
SSE Events
    │
    ▼
Event Normalizer (SSE → Action + Version)
    │
    ▼
Dispatcher (Version check + Object initialization)
    │
    ▼
Reducer (Pure state mutation functions)
    │
    ▼
Store (Raw state: version + Map<Tool> + timestamps)
    │
    ▼
Selectors (Derived: Timeline + Duration + Summary + OrderedTools)
    │
    ▼
RenderScheduler (RAF batch consume pending)
    │
    ▼
Components
    ├─ Container (expand/collapse/hover/state)
    │   ├─ Compact (only renders Header)
    │   └─ Detail (only renders content)
    └─ Timeline (v-for TimelineNode → switch → Component)
```

### Key Design Decisions

1. **Normalized Store**: Tools stored as `Map<callId, StreamingToolCall>`, no ordered array
2. **Action Layer**: SSE events converted to uniform Actions, Reducer doesn't handle raw SSE
3. **Version Control**: `streamVersion` prevents stale events from polluting new session
4. **Pure Reducer**: Only handles state mutation, no parsing/formatting
5. **Selector Layer**: All derived data (duration, summary, timeline) computed by selectors
6. **RAF Rendering**: `pending` deltas batch-consumed by RenderScheduler, avoiding excessive Vue updates

## Data Structures

### StreamingState

```typescript
interface StreamingState {
  version: number              // Stream version (prevents stale events)
  message: MessageState
  reasoning: ReasoningStore
  tools: ToolStore
}

interface MessageState {
  id: string
  role: 'assistant'
  content: string              // Rendered content
  pending: string[]            // Delta buffer (consumed by RAF)
}

interface ReasoningStore {
  id: string | null
  status: 'idle' | 'thinking' | 'done'
  rawContent: string
  startedAt: number            // Timestamp only, duration by Selector
  endedAt: number | null
}

interface ToolStore {
  entities: Map<string, StreamingToolCall>  // No orderedIds
}

interface StreamingToolCall {
  id: string
  name: string
  lifecycle: ToolLifecycle
  
  // Raw data
  rawInput: string
  rawOutput: string | null
  stdout: string[]             // Shell output (appended)
  
  // Timestamps
  startedAt: number
  endedAt: number | null
  
  // Progress
  progress: ToolProgress[]
  
  // Status
  error: string | null
  
  // Unknown event compatibility
  rawEvents: UnknownEvent[]
  
  // UI state (Container manages)
  expanded: boolean
}

type ToolLifecycle = 
  | 'preparing'
  | 'waiting'
  | 'running'
  | 'streaming'
  | 'completed'
  | 'failed'
  | 'cancelled'

interface ToolProgress {
  type: string                 // Supports unknown types
  message: string
  percent?: number
  timestamp: number
}

interface UnknownEvent {
  type: string
  payload: Record<string, unknown>
  timestamp: number
}
```

### StreamAction

```typescript
interface StreamAction {
  type: string
  payload: Record<string, unknown>
  timestamp: number
  version: number              // Current stream version
}

const ActionTypes = {
  // Tool
  TOOL_STARTED: 'TOOL_STARTED',
  TOOL_INPUT_DELTA: 'TOOL_INPUT_DELTA',
  TOOL_INPUT_ENDED: 'TOOL_INPUT_ENDED',
  TOOL_CALLED: 'TOOL_CALLED',
  TOOL_PROGRESS: 'TOOL_PROGRESS',
  TOOL_SUCCESS: 'TOOL_SUCCESS',
  TOOL_FAILED: 'TOOL_FAILED',
  TOOL_CANCELLED: 'TOOL_CANCELLED',
  TOOL_UNKNOWN: 'TOOL_UNKNOWN',
  
  // Reasoning
  REASONING_STARTED: 'REASONING_STARTED',
  REASONING_DELTA: 'REASONING_DELTA',
  REASONING_ENDED: 'REASONING_ENDED',
  
  // Text
  TEXT_DELTA: 'TEXT_DELTA',
  TEXT_ENDED: 'TEXT_ENDED',
  
  // Step
  STEP_STARTED: 'STEP_STARTED',
  STEP_ENDED: 'STEP_ENDED',
  
  // Version
  STREAM_RESET: 'STREAM_RESET',
} as const
```

### TimelineNode (Selector output)

```typescript
interface TimelineNode {
  id: string
  type: 'reasoning' | 'tool' | 'message' | 'citation' | 'memory' | 'image'
  order: number
  payload: unknown
}
```

## Component Structure

```
src/renderer/components/chat/
├── ChatTimeline.vue              # Modified: integrates StreamingMessage
├── MessageAssistant.vue          # Kept: completed message rendering
├── MessageUser.vue               # Kept: user message
│
├── streaming/                    # NEW
│   ├── StreamingMessage.vue      # Streaming message container
│   ├── StreamingText.vue         # Real-time text rendering
│   ├── StreamingReasoning.vue    # Thinking process (with Spinner)
│   └── StreamingTools.vue        # Tool call list with timeline
│
├── tool/                         # NEW
│   ├── ToolCallContainer.vue     # State management (expand/hover)
│   ├── ToolCallCompact.vue       # Header only (icon + summary + status)
│   ├── ToolCallDetail.vue        # Content only (args + output)
│   ├── CollapsibleOutput.vue     # Collapsible output (reka-ui Collapsible)
│   └── ToolProgress.vue          # Progress display
│
└── shared/                       # NEW
    └── Spinner.vue               # Loading animation
```

## Component Design

### ToolCallCompact.vue

```
Normal state:
┌─────────────────────────────────────────────────────────────┐
│ 📄 Read src/config.ts                            ✓ 1.2s    │
└─────────────────────────────────────────────────────────────┘

Running state (left border + shimmer):
┌─────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← shimmer
│ $ npm install                                    ●          │
└─────────────────────────────────────────────────────────────┘

Streaming state (stdout output):
┌─────────────────────────────────────────────────────────────┐
│ $ npm install                                    ●▒▒▒       │
│   stdout: Installing dependencies...                         │
└─────────────────────────────────────────────────────────────┘
```

### Status Indicators

| Status | Left Border | Icon | Background | Tooltip |
|--------|-------------|------|------------|---------|
| `preparing` | `border-muted` | `○` | none | Preparing... |
| `waiting` | `border-warning` | `○` | shimmer | Waiting for approval |
| `running` | `border-warning` | `●` pulse | shimmer | Running... Duration: 1.2s |
| `streaming` | `border-warning` | `●▒▒▒` | shimmer | Streaming... Duration: 18s |
| `completed` | `border-success` | `✓` | none | Completed · Duration: 1.2s |
| `failed` | `border-error` | `✗` | none | Failed: error message |
| `cancelled` | `border-muted` | `○` strikethrough | none | Cancelled |

### Tool Summary Formatter

```typescript
function formatToolSummary(name: string, args: unknown): string {
  switch (name) {
    case 'read': return `📄 Read ${truncate(args.filePath)}`
    case 'write': return `✏ Write ${truncate(args.filePath)}`
    case 'edit': return `✎ Edit ${truncate(args.filePath)}`
    case 'bash': return `$ ${truncate(args.command, 50)}`
    case 'grep': return `🔍 "${truncate(args.pattern)}"`
    case 'glob': return `✱ ${truncate(args.pattern)}`
    case 'web_search': return `🌐 "${truncate(args.query)}"`
    case 'web_fetch': return `↓ ${truncate(args.url)}"`
    case 'task': return `✓ ${truncate(args.description)}`
    case 'todo_write': return `☑ Todo`
    default: return name
  }
}
```

### Tool Icon Mapping

| Tool | Unicode Icon | ASCII Style |
|------|-------------|-------------|
| Shell | `$` | `$` |
| Read | `📄` | `→` |
| Write | `✏` | `←` |
| Edit | `✎` | `←` |
| Grep | `🔍` | `✱` |
| Glob | `✱` | `✱` |
| WebSearch | `🌐` | `◈` |
| WebFetch | `↓` | `%` |
| Task | `✓` | `│` |
| Todo | `☑` | `☐/☑` |
| Skill | `⚡` | `⚡` |
| Unknown | `⚙` | `⚙` |

### StreamingReasoning.vue

```
Running:
┌─────────────────────────────────────────────────────────────┐
│ ○○○ Thinking                                                 │
└─────────────────────────────────────────────────────────────┘

Completed (< 100 chars, not expandable):
┌─────────────────────────────────────────────────────────────┐
│ ✓ Reasoned · 2.3s                                           │
└─────────────────────────────────────────────────────────────┘

Completed (> 100 chars, expandable):
┌─────────────────────────────────────────────────────────────┐
│ ▼ Reasoned · 2.3s                                           │
│   ────────────────────────────────────────────────────────  │
│   Analyzed the project structure and identified...           │
└─────────────────────────────────────────────────────────────┘
```

### Timeline Design

```
Tool timeline within message:
┌─────────────────────────────────────────────────────────────┐
│ │                                                            │
│ ├─ 📄 Read package.json                         ✓ 8ms       │
│ │                                                            │
│ ├─ ✏ Edit package.json                          ✓ 320ms     │
│ │                                                            │
│ ├─ $ npm install                                 ● 1.2s      │
│ │                                                            │
│ ├─ 🔍 Grep "export"                              ✓ 45ms      │
│ │                                                            │
│ └─ Done                                                      │
└─────────────────────────────────────────────────────────────┘
```

Implementation: `StreamingTools.vue` has left border, each `ToolCallContainer` connects via `::before` pseudo-element.

## Selectors

All derived data computed by selectors, not stored in Store:

```typescript
// Timeline (dynamically generated from tools Map)
export const useTimeline = (state: StreamingState) => computed(() => {
  // Sort tools by startedAt, create TimelineNode[]
})

// Ordered tools (sort by startedAt)
export const useOrderedTools = (state: StreamingState) => computed(() => {
  return Array.from(state.tools.entities.values())
    .sort((a, b) => a.startedAt - b.startedAt)
})

// Duration formatting
export const useToolDuration = (tool: StreamingToolCall) => computed(() => {
  if (!tool.endedAt) return null
  return formatDuration(tool.endedAt - tool.startedAt)
})

// Summary formatting
export const useToolSummary = (tool: StreamingToolCall) => computed(() => {
  const args = parseToolArgs(tool.rawInput)
  return formatToolSummary(tool.name, args.parsed)
})

// Status icon
export const useToolStatusIcon = (tool: StreamingToolCall) => computed(() => {
  return getStatusIcon(tool.lifecycle)
})

// Duration format helper
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}
```

## Implementation Plan

### Phase Breakdown

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| **Phase 0** | Mock SSE environment | 0.5-1 day | None |
| **Phase 1** | Store + Action + Dispatcher | 2-3 days | Phase 0 |
| **Phase 2** | Text/Reasoning components | 1-2 days | Phase 1 |
| **Phase 3** | Tool components (Container + Compact + Detail) | 3-4 days | Phase 1 |
| **Phase 4** | Timeline Selector + Integration | 1-2 days | Phase 2, 3 |
| **Phase 5** | Polish + Testing + Performance | 1-2 days | Phase 4 |
| **Total** | MVP + Unit tests | **9-14 days** | |

### Phase 0: Mock SSE (0.5-1 day)

Create mock SSE event generator for testing:

1. Mock event types covering all `tool.*`, `reasoning.*`, `text.*`
2. Simulate streaming scenarios (stdout append, progress, error)
3. Test version mismatch scenarios

### Phase 1: Store + Action + Dispatcher (2-3 days)

1. Create type definitions (`streaming-types.ts`)
2. Create Action types and normalizer (`streaming-actions.ts`)
3. Create Dispatcher with version check (`streaming-dispatcher.ts`)
4. Create pure Reducer functions (`streaming-reducers.ts`)
5. Create Selectors (`streaming-selectors.ts`)
6. Create RenderScheduler (`render-scheduler.ts`)

### Phase 2: Text/Reasoning Components (1-2 days)

1. `StreamingReasoning.vue` - Thinking/Reasoned states, expandable
2. `StreamingText.vue` - Real-time text rendering
3. `Spinner.vue` - 3-dot animation

### Phase 3: Tool Components (3-4 days)

1. `ToolCallContainer.vue` - expand/collapse/hover state
2. `ToolCallCompact.vue` - Header only
3. `ToolCallDetail.vue` - Content only (args + output)
4. `CollapsibleOutput.vue` - reka-ui Collapsible
5. `ToolProgress.vue` - Progress with percent
6. `StreamingTools.vue` - Timeline with left border

### Phase 4: Integration (1-2 days)

1. Modify `session.ts` - integrate Dispatcher
2. Modify `ChatTimeline.vue` - integrate StreamingMessage
3. Create `StreamingMessage.vue` - container component

### Phase 5: Polish (1-2 days)

1. CSS animations (shimmer, pulse-glow)
2. Theme adaptation (light/dark)
3. Performance optimization
4. Responsive testing

## Key Improvements Summary

| Priority | Improvement | Status |
|----------|-------------|--------|
| **P0** | Remove TimelineStore, Timeline generated by Selector | Done |
| **P0** | ToolStore as `Map<callId, StreamingToolCall>` | Done |
| **P0** | Dispatcher initializes objects, Reducer only mutates state | Done |
| **P0** | Add Phase 0: Mock SSE | Done |
| **P1** | Normalizer outputs uniform Action | Done |
| **P1** | Store only raw state, derived data by Selector | Done |
| **P1** | streamVersion prevents stale event pollution | Done |
| **P2** | Unified TimelineNode ViewModel | Done |
| **P2** | Component split: Container + Compact + Detail | Done |

## References

- TUI implementation: `packages/core/src/tui/deps/routes/session/index.tsx`
- SSE event types: `packages/core/src/core/session/event.ts`
- Current desktop session: `packages/desktop/src/renderer/stores/session.ts`