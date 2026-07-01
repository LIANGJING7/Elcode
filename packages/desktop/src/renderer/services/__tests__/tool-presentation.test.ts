import { describe, it, expect } from 'vitest'
import { markRaw } from 'vue'
import { toolToPresentationModel } from '../tool-presentation'
import type { ToolCall } from '../../../types/ipc'
import type { FileTab, FileModel } from '../../types/presentation'
import TextViewer from '../../components/file-tabs/TextViewer.vue'
import DiffViewer from '../../components/file-tabs/DiffViewer.vue'
import ImageViewer from '../../components/file-tabs/ImageViewer.vue'
import GrepView from '../../components/tool/views/GrepView.vue'
import GlobView from '../../components/tool/views/GlobView.vue'

// 用 markRaw 包装组件以匹配 tool-presentation.ts 中的实现
const TextViewerRaw = markRaw(TextViewer)
const DiffViewerRaw = markRaw(DiffViewer)
const ImageViewerRaw = markRaw(ImageViewer)
const GrepViewRaw = markRaw(GrepView)
const GlobViewRaw = markRaw(GlobView)

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
    expect(tab!.component).toBe(TextViewerRaw)
    expect(tab!.title).toBe('main.ts')
    expect(tab!.subtitle).toBe('src/app/')
    expect(tab!.status).toBe('ready')
    expect(tab!.model._kind).toBe('read')
    const model = tab!.model as Extract<FileModel, { _kind: 'read' }>
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
    expect(tab!.component).toBe(ImageViewerRaw)
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
    expect(tab!.component).toBe(DiffViewerRaw)
    expect(tab!.title).toBe('helpers.ts')
    expect(tab!.subtitle).toBe('src/utils/')
    expect(tab!.model._kind).toBe('diff')
    const model = tab!.model as Extract<FileModel, { _kind: 'diff' }>
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
    expect(tab!.component).toBe(DiffViewerRaw)
  })
})

describe('toolToPresentationModel — grep/glob', () => {
  it('grep tool 返回 GrepView FileTab', () => {
    const tool: ToolCall = {
      id: 'g1',
      name: 'grep',
      status: 'completed',
      args: { pattern: 'foo', path: 'src' },
      output: {
        structured: {
          items: [
            { resource: 'src/a.ts', line: 10, lines: 'foo bar' },
            { resource: 'src/b.ts', line: 20, lines: 'foo baz' },
          ],
        },
      },
    }
    const tab = toolToPresentationModel(tool)
    expect(tab).not.toBeNull()
    expect(tab!.component).toBe(GrepViewRaw)
    expect(tab!.title).toContain('grep')
    expect(tab!.model._kind).toBe('grep')
  })

  it('glob tool 返回 GlobView FileTab', () => {
    const tool: ToolCall = {
      id: 'g2',
      name: 'glob',
      status: 'completed',
      args: { pattern: '*.ts', path: 'src' },
      output: {
        structured: {
          items: [
            { resource: 'src/a.ts' },
            { resource: 'src/b.ts' },
          ],
        },
      },
    }
    const tab = toolToPresentationModel(tool)
    expect(tab).not.toBeNull()
    expect(tab!.component).toBe(GlobViewRaw)
    expect(tab!.title).toContain('glob')
    expect(tab!.model._kind).toBe('glob')
  })
})

describe('toolToPresentationModel — unknown tool', () => {
  it('未注册工具返回 UnknownViewer FileTab', () => {
    const tool: ToolCall = {
      id: 'u1',
      name: 'unknown_tool',
      status: 'completed',
      args: { foo: 'bar' },
      output: { result: 'some result' },
    }
    const tab = toolToPresentationModel(tool)
    expect(tab).not.toBeNull()
    expect(tab!.title).toBe('unknown_tool')
    expect(tab!.model._kind).toBe('unknown')
  })
})