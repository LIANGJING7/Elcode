import { describe, it, expect, beforeEach } from 'vitest'
import { clearTools, getTool, registerTool, registerMany, removeTool } from '../registry'
import { activateBuiltinTools } from '../rules'
import { createBashViewModel } from '../rules/bash'
import { createEditViewModel } from '../rules/edit'
import { createWriteViewModel } from '../rules/write'
import { createTaskViewModel } from '../rules/task'
import { createTodoViewModel } from '../rules/todo'
import { createGrepViewModel } from '../rules/grep'
import { createGlobViewModel } from '../rules/glob'
import { createReadViewModel } from '../rules/read'
import { createWebFetchViewModel } from '../rules/webfetch'
import { createWebSearchViewModel } from '../rules/websearch'
import type { ToolCall } from '../../../types/ipc'

describe('tool registry', () => {
  beforeEach(() => {
    clearTools()
  })

  it('registerTool / getTool / removeTool round-trip', () => {
    const meta = {
      names: ['foo'],
      icon: 'x',
      title: 'Foo',
      component: {} as never,
      defaultInteraction: 'inline' as const,
      summary: () => '',
      createViewModel: () => ({ _kind: 'foo' }),
    }
    registerTool(meta)
    expect(getTool('foo')).toBe(meta)
    expect(getTool('bar')).toBeUndefined()
    removeTool('foo')
    expect(getTool('foo')).toBeUndefined()
  })

  it('registerMany registers all', () => {
    const a = { names: ['a'], icon: 'a', title: 'A', component: {} as never, defaultInteraction: 'inline' as const, summary: () => '', createViewModel: () => ({ _kind: 'a' }) }
    const b = { names: ['b'], icon: 'b', title: 'B', component: {} as never, defaultInteraction: 'panel' as const, summary: () => '', createViewModel: () => ({ _kind: 'b' }) }
    registerMany([a, b])
    expect(getTool('a')).toBe(a)
    expect(getTool('b')).toBe(b)
  })

  it('activateBuiltinTools registers all built-in tools', () => {
    activateBuiltinTools()
    expect(getTool('bash')).toBeDefined()
    expect(getTool('shell')).toBeDefined()
    expect(getTool('edit')).toBeDefined()
    expect(getTool('write')).toBeDefined()
    expect(getTool('task')).toBeDefined()
    expect(getTool('todo_write')).toBeDefined()
    expect(getTool('read')).toBeDefined()
    expect(getTool('grep')).toBeDefined()
  })

  it('activateBuiltinTools is idempotent', () => {
    activateBuiltinTools()
    activateBuiltinTools()
    expect(getTool('bash')).toBeDefined()
  })
})

describe('createBashViewModel', () => {
  it('extracts command from args and exitCode from structured', () => {
    const tool: ToolCall = {
      id: 't1',
      name: 'bash',
      status: 'completed',
      args: { command: 'npm test' },
      output: {
        structured: { type: 'bash', exitCode: 0, duration: 1200 },
        content: [{ type: 'text', text: 'all passing' }],
      },
      duration: 1200,
    }
    const vm = createBashViewModel(tool)
    expect(vm.command).toBe('npm test')
    expect(vm.stdout).toBe('all passing')
    expect(vm.exitCode).toBe(0)
    expect(vm.duration).toBe(1200)
    expect(vm.truncated).toBe(false)
  })

  it('falls back to result.output when no content', () => {
    const tool: ToolCall = {
      id: 't2',
      name: 'bash',
      status: 'completed',
      args: { cmd: 'ls' },
      output: { result: { output: 'file1\nfile2', exitCode: 1 } },
    }
    const vm = createBashViewModel(tool)
    expect(vm.command).toBe('ls')
    expect(vm.stdout).toBe('file1\nfile2')
    expect(vm.exitCode).toBe(1)
  })
})

describe('createEditViewModel', () => {
  it('extracts filePath from args and diff from structured', () => {
    const tool: ToolCall = {
      id: 't1',
      name: 'edit',
      status: 'completed',
      args: { filePath: 'src/a.ts' },
      output: { structured: { type: 'edit', diff: '@@ -1 +1 @@', additions: 1, deletions: 0 } },
    }
    const vm = createEditViewModel(tool)
    expect(vm.filePath).toBe('src/a.ts')
    expect(vm.diff).toBe('@@ -1 +1 @@')
    expect(vm.additions).toBe(1)
    expect(vm.deletions).toBe(0)
  })

  it('falls back to result.diff', () => {
    const tool: ToolCall = {
      id: 't2',
      name: 'edit',
      status: 'completed',
      args: { path: 'b.ts' },
      output: { result: { diff: '@@ diff @@' } },
    }
    const vm = createEditViewModel(tool)
    expect(vm.filePath).toBe('b.ts')
    expect(vm.diff).toBe('@@ diff @@')
  })
})

describe('createWriteViewModel', () => {
  it('extracts filePath + content + existed', () => {
    const tool: ToolCall = {
      id: 't1',
      name: 'write',
      status: 'completed',
      args: { filePath: 'new.ts', content: 'export const x = 1' },
      output: { structured: { type: 'write', existed: false } },
    }
    const vm = createWriteViewModel(tool)
    expect(vm.filePath).toBe('new.ts')
    expect(vm.content).toBe('export const x = 1')
    expect(vm.existed).toBe(false)
  })
})

describe('createTaskViewModel', () => {
  it('titlecases subagent_type and derives state from status', () => {
    const tool: ToolCall = {
      id: 't1',
      name: 'task',
      status: 'completed',
      args: { subagent_type: 'explore', description: 'find usages' },
    }
    const vm = createTaskViewModel(tool)
    expect(vm.subagentType).toBe('Explore')
    expect(vm.description).toBe('find usages')
    expect(vm.state).toBe('completed')
  })
})

describe('createTodoViewModel', () => {
  it('normalizes todos from structured', () => {
    const tool: ToolCall = {
      id: 't1',
      name: 'todo_write',
      status: 'completed',
      args: {},
      output: {
        structured: {
          type: 'todo',
          todos: [
            { status: 'completed', content: 'a' },
            { status: 'in_progress', content: 'b' },
          ],
        },
      },
    }
    const vm = createTodoViewModel(tool)
    expect(vm.todos).toHaveLength(2)
    expect(vm.todos[0].content).toBe('a')
  })

  it('falls back to args.todos', () => {
    const tool: ToolCall = {
      id: 't2',
      name: 'todo_write',
      status: 'completed',
      args: { todos: [{ status: 'pending', content: 'x' }] },
    }
    const vm = createTodoViewModel(tool)
    expect(vm.todos).toHaveLength(1)
    expect(vm.todos[0].status).toBe('pending')
  })
})

describe('createGrepViewModel', () => {
  it('extracts structured match list (V2)', () => {
    const tool: ToolCall = {
      id: 't1',
      name: 'grep',
      status: 'completed',
      args: { pattern: 'foo', path: 'src' },
      output: {
        structured: {
          type: 'unknown',
          items: [
            { resource: 'src/a.ts', line: 10, lines: 'const foo = 1' },
            { resource: 'src/b.ts', line: 22, lines: 'foo()', linePreviewTruncated: true },
          ],
          truncated: true,
        },
      },
    }
    const vm = createGrepViewModel(tool)
    expect(vm.pattern).toBe('foo')
    expect(vm.path).toBe('src')
    expect(vm.matches).toHaveLength(2)
    expect(vm.matches[0].resource).toBe('src/a.ts')
    expect(vm.matches[0].line).toBe(10)
    expect(vm.matches[0].content).toBe('const foo = 1')
    expect(vm.matches[1].truncated).toBe(true)
    expect(vm.total).toBe(2)
    expect(vm.truncated).toBe(true)
  })

  it('parses formatted text fallback when no structured items', () => {
    const tool: ToolCall = {
      id: 't2',
      name: 'grep',
      status: 'completed',
      args: { pattern: 'bar' },
      output: {
        content: [{ type: 'text', text: 'Found 1 matches\n\nsrc/x.ts:\n  Line 5: bar = 2' }],
      },
    }
    const vm = createGrepViewModel(tool)
    expect(vm.matches).toHaveLength(1)
    expect(vm.matches[0].resource).toBe('src/x.ts')
    expect(vm.matches[0].line).toBe(5)
    expect(vm.matches[0].content).toBe('bar = 2')
  })
})

describe('createGlobViewModel', () => {
  it('extracts structured file list (V2)', () => {
    const tool: ToolCall = {
      id: 't1',
      name: 'glob',
      status: 'completed',
      args: { pattern: '**/*.ts', path: 'src' },
      output: {
        structured: {
          type: 'unknown',
          items: [{ resource: 'src/a.ts' }, { resource: 'src/b.ts' }],
          partial: true,
        },
      },
    }
    const vm = createGlobViewModel(tool)
    expect(vm.pattern).toBe('**/*.ts')
    expect(vm.files).toEqual(['src/a.ts', 'src/b.ts'])
    expect(vm.total).toBe(2)
    expect(vm.truncated).toBe(true)
  })

  it('parses newline-joined text fallback', () => {
    const tool: ToolCall = {
      id: 't2',
      name: 'glob',
      status: 'completed',
      args: { pattern: '*.md' },
      output: { content: [{ type: 'text', text: 'readme.md\nguide.md' }] },
    }
    const vm = createGlobViewModel(tool)
    expect(vm.files).toEqual(['readme.md', 'guide.md'])
  })
})

describe('createReadViewModel', () => {
  it('file variant from V2 TextPage', () => {
    const tool: ToolCall = {
      id: 't1',
      name: 'read',
      status: 'completed',
      args: { filePath: 'a.ts' },
      output: {
        structured: { type: 'text-page', content: 'line1\nline2\nline3', offset: 5, truncated: false },
      },
    }
    const vm = createReadViewModel(tool)
    expect(vm.variant).toBe('file')
    if (vm.variant === 'file') {
      expect(vm.filePath).toBe('a.ts')
      expect(vm.content).toBe('line1\nline2\nline3')
      expect(vm.lineStart).toBe(5)
      expect(vm.lineEnd).toBe(7)
    }
  })

  it('directory variant from V2 ListPage', () => {
    const tool: ToolCall = {
      id: 't2',
      name: 'read',
      status: 'completed',
      args: { path: '.' },
      output: {
        structured: {
          entries: [{ path: 'a.ts', type: 'file' }, { path: 'dir/', type: 'directory' }],
          truncated: false,
        },
      },
    }
    const vm = createReadViewModel(tool)
    expect(vm.variant).toBe('directory')
    if (vm.variant === 'directory') {
      expect(vm.entries).toEqual(['a.ts', 'dir/'])
    }
  })

  it('image variant from V2 BinaryContent', () => {
    const tool: ToolCall = {
      id: 't3',
      name: 'read',
      status: 'completed',
      args: { filePath: 'img.png' },
      output: { structured: { type: 'binary', content: 'iVBOR', mime: 'image/png' } },
    }
    const vm = createReadViewModel(tool)
    expect(vm.variant).toBe('image')
    if (vm.variant === 'image') {
      expect(vm.dataUrl).toBe('data:image/png;base64,iVBOR')
    }
  })
})

describe('createWebFetchViewModel', () => {
  it('extracts url + content from structured', () => {
    const tool: ToolCall = {
      id: 't1',
      name: 'web_fetch',
      status: 'completed',
      args: { url: 'https://example.com' },
      output: {
        structured: { url: 'https://example.com', contentType: 'text/html', format: 'markdown', output: '# Title' },
      },
    }
    const vm = createWebFetchViewModel(tool)
    expect(vm.url).toBe('https://example.com')
    expect(vm.contentType).toBe('text/html')
    expect(vm.format).toBe('markdown')
    expect(vm.content).toBe('# Title')
  })
})

describe('createWebSearchViewModel', () => {
  it('extracts provider + text, detects no-results', () => {
    const tool: ToolCall = {
      id: 't1',
      name: 'web_search',
      status: 'completed',
      args: { query: 'vue 3' },
      output: { structured: { provider: 'exa', text: 'No search results found.' } },
    }
    const vm = createWebSearchViewModel(tool)
    expect(vm.query).toBe('vue 3')
    expect(vm.provider).toBe('exa')
    expect(vm.hasResults).toBe(false)
  })

  it('hasResults true when text present', () => {
    const tool: ToolCall = {
      id: 't2',
      name: 'web_search',
      status: 'completed',
      args: { query: 'effect ts' },
      output: { structured: { provider: 'parallel', text: 'Effect is a TypeScript framework...' } },
    }
    const vm = createWebSearchViewModel(tool)
    expect(vm.hasResults).toBe(true)
    expect(vm.text).toContain('Effect')
  })
})
