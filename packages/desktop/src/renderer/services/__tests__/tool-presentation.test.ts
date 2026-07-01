import { describe, it, expect } from 'vitest'
import { toolToPresentationModel } from '../tool-presentation'
import type { ToolCall } from '../../../types/ipc'
import type { FileTab } from '../../types/presentation'

describe('toolToPresentationModel — read', () => {
  it('将 read tool (V2 TextPage) 转换为 text FileTab', () => {
    const tool: ToolCall = {
      id: 't1',
      name: 'read',
      status: 'completed',
      args: { filePath: 'src/app/main.ts' },
      output: {
        structured: { type: 'text-page', content: 'line1\nline2\nline3', offset: 5, truncated: false },
      },
    }
    const tab = toolToPresentationModel(tool)
    expect(tab).not.toBeNull()
    expect(tab!.id).toBe('t1')
    expect(tab!.viewer).toBe('text')
    expect(tab!.title).toBe('main.ts')
    expect(tab!.subtitle).toBe('src/app/')
    expect(tab!.status).toBe('ready')
    expect(tab!.model._kind).toBe('read')
    const model = tab!.model as Extract<FileTab['model'], { _kind: 'read' }>
    expect(model.lines).toHaveLength(3)
    expect(model.lines[0].lineNumber).toBe(5)
    expect(model.lines[0].text).toBe('line1')
    expect(model.lines[0].id).toBeTruthy()
  })

  it('read tool running 状态 → status loading', () => {
    const tool: ToolCall = {
      id: 't2',
      name: 'read',
      status: 'running',
      args: { filePath: 'a.ts' },
      output: { structured: { type: 'text-page', content: '', offset: 1 } },
    }
    const tab = toolToPresentationModel(tool)
    expect(tab!.status).toBe('loading')
  })

  it('read tool image variant → image viewer', () => {
    const tool: ToolCall = {
      id: 't3',
      name: 'read',
      status: 'completed',
      args: { filePath: 'img/screenshot.png' },
      output: { structured: { type: 'binary', content: 'iVBOR', mime: 'image/png' } },
    }
    const tab = toolToPresentationModel(tool)
    expect(tab!.viewer).toBe('image')
    expect(tab!.model._kind).toBe('image')
  })
})

describe('toolToPresentationModel — edit/write', () => {
  it('将 edit tool 转换为 diff FileTab', () => {
    const tool: ToolCall = {
      id: 'e1',
      name: 'edit',
      status: 'completed',
      args: { filePath: 'src/utils/helpers.ts' },
      output: {
        structured: {
          type: 'edit',
          diff: '@@ -1,2 +1,2 @@\n-old line\n+new line\n context',
          additions: 1,
          deletions: 1,
        },
      },
    }
    const tab = toolToPresentationModel(tool)
    expect(tab).not.toBeNull()
    expect(tab!.id).toBe('e1')
    expect(tab!.viewer).toBe('diff')
    expect(tab!.title).toBe('helpers.ts')
    expect(tab!.subtitle).toBe('src/utils/')
    expect(tab!.model._kind).toBe('diff')
    const model = tab!.model as Extract<FileTab['model'], { _kind: 'diff' }>
    expect(model.statistics.additions).toBe(1)
    expect(model.statistics.deletions).toBe(1)
    expect(model.lines.length).toBe(4) // hunk + remove + add + context
    expect(model.lines[0].type).toBe('hunk')
    expect(model.lines[1].type).toBe('remove')
    expect(model.lines[1].text).toBe('old line')
    expect(model.lines[2].type).toBe('add')
    expect(model.lines[2].text).toBe('new line')
    expect(model.lines[3].type).toBe('context')
    expect(model.lines[3].text).toBe(' context')
  })

  it('write tool 也生成 diff viewer', () => {
    const tool: ToolCall = {
      id: 'w1',
      name: 'write',
      status: 'completed',
      args: { filePath: 'new.ts', content: 'const x = 1' },
      output: { structured: { type: 'write', existed: false } },
    }
    const tab = toolToPresentationModel(tool)
    expect(tab).not.toBeNull()
    expect(tab!.viewer).toBe('diff')
  })

  it('glob/grep tool 返回 null (不打开 FileTab)', () => {
    const tool: ToolCall = {
      id: 'g1',
      name: 'grep',
      status: 'completed',
      args: { pattern: 'foo' },
      output: { structured: { type: 'unknown' } },
    }
    const tab = toolToPresentationModel(tool)
    expect(tab).toBeNull()
  })
})
