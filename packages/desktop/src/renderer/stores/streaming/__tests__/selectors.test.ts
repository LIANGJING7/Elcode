import { describe, it, expect } from 'vitest'
import { groupedToolNodes } from '../selectors'
import type { StreamingState, StreamingToolCall } from '../types'
import { activateBuiltinTools, clearTools } from '../../../tool/registry'

function makeTool(id: string, name: string, lifecycle: 'completed' | 'preparing' | 'running' = 'completed', startedAt: number = Date.now()): StreamingToolCall {
  return {
    id,
    name,
    lifecycle,
    rawInput: '{}',
    rawOutput: null,
    progress: [],
    error: null,
    startedAt,
    endedAt: lifecycle === 'completed' ? startedAt + 100 : null,
    expanded: false,
  }
}

function makeState(tools: StreamingToolCall[]): StreamingState {
  const entities = new Map<string, StreamingToolCall>()
  for (const t of tools) entities.set(t.id, t)
  return {
    version: 1,
    status: 'streaming',
    message: { id: 'm1', content: '' },
    reasoning: { id: null, status: 'idle', content: '', startedAt: null, endedAt: null },
    tools: { entities },
    pendingDeltas: new Map(),
    reasoningHistory: [],
    stepError: null,
  }
}

describe('groupedToolNodes', () => {
  beforeEach(() => {
    clearTools()
    activateBuiltinTools()
  })

  it('empty tools → empty nodes', () => {
    const state = makeState([])
    const nodes = groupedToolNodes(state).value
    expect(nodes).toHaveLength(0)
  })

  it('single tool → single node (no grouping)', () => {
    const state = makeState([makeTool('t1', 'bash')])
    const nodes = groupedToolNodes(state).value
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('tool')
    expect((nodes[0].payload as StreamingToolCall).name).toBe('bash')
  })

  it('[read, grep, glob] → QueryGroup with 3 tools', () => {
    const state = makeState([
      makeTool('t1', 'read', 'completed', 100),
      makeTool('t2', 'grep', 'completed', 200),
      makeTool('t3', 'glob', 'completed', 300),
    ])
    const nodes = groupedToolNodes(state).value
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('queryGroup')
    expect(nodes[0].payload as StreamingToolCall[]).toHaveLength(3)
  })

  it('[bash, edit] → 2 separate tool nodes (no grouping)', () => {
    const state = makeState([
      makeTool('t1', 'bash', 'completed', 100),
      makeTool('t2', 'edit', 'completed', 200),
    ])
    const nodes = groupedToolNodes(state).value
    expect(nodes).toHaveLength(2)
    expect(nodes[0].type).toBe('tool')
    expect(nodes[1].type).toBe('tool')
  })

  it('[read, bash, read] → QueryGroup, Tool, QueryGroup', () => {
    const state = makeState([
      makeTool('t1', 'read', 'completed', 100),
      makeTool('t2', 'bash', 'completed', 200),
      makeTool('t3', 'read', 'completed', 300),
    ])
    const nodes = groupedToolNodes(state).value
    expect(nodes).toHaveLength(3)
    expect(nodes[0].type).toBe('queryGroup')
    expect((nodes[0].payload as StreamingToolCall[]).length).toBe(1)
    expect(nodes[1].type).toBe('tool')
    expect(nodes[2].type).toBe('queryGroup')
  })

  it('[read, grep, bash, read] → QueryGroup(2), Tool, QueryGroup(1)', () => {
    const state = makeState([
      makeTool('t1', 'read', 'completed', 100),
      makeTool('t2', 'grep', 'completed', 200),
      makeTool('t3', 'bash', 'completed', 300),
      makeTool('t4', 'read', 'completed', 400),
    ])
    const nodes = groupedToolNodes(state).value
    expect(nodes).toHaveLength(3)
    expect(nodes[0].type).toBe('queryGroup')
    expect((nodes[0].payload as StreamingToolCall[]).length).toBe(2)
    expect(nodes[1].type).toBe('tool')
    expect(nodes[2].type).toBe('queryGroup')
    expect((nodes[2].payload as StreamingToolCall[]).length).toBe(1)
  })

  it('preparing query tool → NOT grouped (still pending)', () => {
    const state = makeState([
      makeTool('t1', 'read', 'completed', 100),
      makeTool('t2', 'grep', 'preparing', 200),
      makeTool('t3', 'glob', 'completed', 300),
    ])
    const nodes = groupedToolNodes(state).value
    expect(nodes).toHaveLength(3)
    expect(nodes[0].type).toBe('queryGroup')
    expect((nodes[0].payload as StreamingToolCall[]).length).toBe(1)
    expect(nodes[1].type).toBe('tool')
    expect((nodes[1].payload as StreamingToolCall).name).toBe('grep')
    expect(nodes[2].type).toBe('queryGroup')
    expect((nodes[2].payload as StreamingToolCall[]).length).toBe(1)
  })

  it('default category tool → treated as execution (no grouping)', () => {
    const state = makeState([
      makeTool('t1', 'read', 'completed', 100),
      makeTool('t2', 'unknown_tool', 'completed', 200),
      makeTool('t3', 'grep', 'completed', 300),
    ])
    const nodes = groupedToolNodes(state).value
    expect(nodes).toHaveLength(3)
    expect(nodes[0].type).toBe('queryGroup')
    expect(nodes[1].type).toBe('tool')
    expect(nodes[2].type).toBe('queryGroup')
  })
})