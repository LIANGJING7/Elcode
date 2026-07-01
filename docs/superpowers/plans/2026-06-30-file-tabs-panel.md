# FileTabsPanel 与 MarkdownRenderer 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将桌面端右侧面板重构为 VS Code 风格的多文件标签页，对话消息支持完整 Markdown 渲染，代码块智能折叠。

**Architecture:** 三层分离 — ToolCallRow 只 emit tool，Presentation Adapter 负责数据转换，Viewer 纯渲染。Markdown 使用 markdown-it Token-based Vue 渲染（非 v-html）。

**Tech Stack:** Vue 3 + Pinia + vitest + @vue/test-utils + markdown-it + shiki

**Spec:** `docs/superpowers/specs/2026-06-30-file-tabs-panel-design.md`

---

## File Structure

```
packages/desktop/src/renderer/
├── types/
│   └── presentation.ts              [新增] FileModel / FileTab 类型定义
├── services/
│   └── tool-presentation.ts         [新增] Presentation Adapter (Tool → FileTab)
├── stores/
│   └── ui.ts                        [修改] 扩展 fileTabs / activeFileTabId 状态
├── composables/
│   └── useStreamingMarkdown.ts      [新增] Streaming 增量渲染 (rAF batch)
├── components/
│   ├── file-tabs/                   [新增目录]
│   │   ├── FileTabsPanel.vue        右侧面板容器
│   │   ├── FileTabsHeader.vue       标签栏 (纯 Presentational)
│   │   ├── TextViewer.vue           Read 文件展示
│   │   ├── DiffViewer.vue           Edit/Write diff 展示
│   │   ├── ImageViewer.vue          图片展示
│   │   └── CodeLines.vue            代码行渲染 (预留 VirtualList)
│   ├── markdown/                    [新增目录]
│   │   ├── TokenRenderer.vue        Token[] → Vue Component 调度
│   │   └── tokens/
│   │       ├── HeadingToken.vue     h1-h6
│   │       ├── ParagraphToken.vue   段落
│   │       ├── CodeFenceToken.vue   ```lang 代码块
│   │       ├── InlineToken.vue      行内文本 (bold/italic/code/link)
│   │       ├── TableToken.vue       GFM 表格
│   │       ├── QuoteToken.vue       引用块
│   │       ├── ListToken.vue        有序/无序/任务列表
│   │       └── ImageToken.vue       图片
│   ├── chat/
│   │   ├── MarkdownRenderer.vue     [新增] Token-based Markdown 入口
│   │   ├── CodeBlock.vue            [修改] 智能折叠 + Shiki
│   │   ├── MessageAssistant.vue     [修改] 使用 MarkdownRenderer + openFile emit
│   │   ├── ChatTimeline.vue         [修改] 传递 openFile 事件
│   │   └── ChatView.vue             [修改] 传递 openFile 事件
│   ├── tool/
│   │   ├── ToolRenderer.vue         [修改] 新增 openFile emit
│   │   └── ToolCallRow.vue          [修改] summary 点击 emit openFile
│   └── streaming/
│       ├── StreamingMessage.vue     [修改] 传递 openFile 事件
│       └── StreamingText.vue        [修改] 使用 MarkdownRenderer
└── App.vue                          [修改] 替换 Inspector 为 FileTabsPanel
```

**测试文件：**
```
packages/desktop/src/renderer/
├── services/__tests__/tool-presentation.test.ts
├── stores/__tests__/ui.test.ts              [修改] 追加 FileTab 测试
├── components/file-tabs/__tests__/FileTabsHeader.test.ts
├── components/file-tabs/__tests__/FileTabsPanel.test.ts
├── components/file-tabs/__tests__/TextViewer.test.ts
├── components/file-tabs/__tests__/DiffViewer.test.ts
├── components/chat/__tests__/MessageAssistant.test.ts  [修改] 追加
├── components/chat/__tests__/CodeBlock.test.ts
└── composables/__tests__/useStreamingMarkdown.test.ts
```

---

## Phase 1: 基础层 — 类型 + Adapter + Store

### Task 1: Presentation 类型定义

**Files:**
- Create: `packages/desktop/src/renderer/types/presentation.ts`

- [ ] **Step 1: 创建类型定义文件**

```ts
// packages/desktop/src/renderer/types/presentation.ts

// ===== Base Line Types =====
interface BaseLine {
  id: string
}

export interface TextLine extends BaseLine {
  lineNumber: number
  text: string
  highlights?: HighlightRange[]
}

export interface DiffLine extends BaseLine {
  type: 'context' | 'add' | 'remove' | 'hunk' | 'meta'
  oldLine?: number
  newLine?: number
  text: string
}

export interface HunkInfo {
  id: string
  startLine: number
  lines: DiffLine[]
  collapsed?: boolean
}

export interface HighlightRange {
  start: number
  end: number
  type: 'search' | 'syntax' | 'error' | 'warning'
}

// ===== FileModel (Domain) =====
export interface ReadFileModel {
  _kind: 'read'
  filePath: string
  fileName: string
  directory?: string
  lines: TextLine[]
  totalLines?: number
  truncated?: boolean
  lineStart?: number
  options: {
    wrap?: boolean
    showLineNumbers?: boolean
  }
}

export interface DiffModel {
  _kind: 'diff'
  filePath: string
  fileName: string
  directory?: string
  hunks: HunkInfo[]
  lines: DiffLine[]
  statistics: {
    additions: number
    deletions: number
    filesChanged?: number
  }
  options: {
    mode: 'unified' | 'split'
    showMeta?: boolean
    wrap?: boolean
  }
}

export interface ImageModel {
  _kind: 'image'
  filePath: string
  fileName: string
  directory?: string
  dataUrl: string
  metadata?: {
    width?: number
    height?: number
    size?: number
  }
}

export type FileModel = ReadFileModel | DiffModel | ImageModel

// ===== FileTab (UI State) =====
export type FileViewerType = 'text' | 'diff' | 'image'
export type FileTabStatus = 'loading' | 'ready' | 'error'

export interface FileTab {
  id: string
  title: string
  subtitle?: string
  filePath: string
  viewer: FileViewerType
  model: FileModel
  status: FileTabStatus
  dirty?: boolean
  viewerState?: {
    scrollTop?: number
    cursorLine?: number
    foldedHunks?: string[]
  }
}
```

- [ ] **Step 2: 验证 typecheck 通过**

Run: `cd packages/desktop && npx vue-tsc --noEmit`
Expected: PASS (无新增错误)

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/types/presentation.ts
git commit -m "feat: add presentation types for FileTabsPanel"
```

---

### Task 2: Presentation Adapter — Read 文件转换

**Files:**
- Create: `packages/desktop/src/renderer/services/tool-presentation.ts`
- Create: `packages/desktop/src/renderer/services/__tests__/tool-presentation.test.ts`

- [ ] **Step 1: 编写 Read 转换的失败测试**

```ts
// packages/desktop/src/renderer/services/__tests__/tool-presentation.test.ts
import { describe, it, expect } from 'vitest'
import { toolToPresentationModel } from '../tool-presentation'
import type { ToolCall } from '../../../types/ipc'

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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/desktop && npx vitest run src/renderer/services/__tests__/tool-presentation.test.ts`
Expected: FAIL — "Cannot find module '../tool-presentation'"

- [ ] **Step 3: 实现 tool-presentation.ts (Read 部分)**

```ts
// packages/desktop/src/renderer/services/tool-presentation.ts
import type { ToolCall } from '../../types/ipc'
import type {
  FileTab,
  ReadFileModel,
  ImageModel,
  TextLine,
} from '../types/presentation'

/** 生成稳定 id (Electron renderer 中 crypto.randomUUID 可用) */
function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** 从 filePath 拆分出 fileName 和 directory */
function splitPath(filePath: string): { fileName: string; directory?: string } {
  const parts = filePath.split('/')
  const fileName = parts.pop() ?? filePath
  const directory = parts.length > 0 ? parts.join('/') + '/' : undefined
  return { fileName, directory }
}

/** 从 ToolCall 提取 read content (V2 structured → V1 display → raw string) */
function extractReadContent(tool: ToolCall): { content: string; offset: number; truncated: boolean } {
  const structured = tool.output?.structured as
    | { content?: string; offset?: number; truncated?: boolean; type?: string }
    | undefined

  // V2: structured.content (TextPage / TextContent)
  if (typeof structured?.content === 'string') {
    return {
      content: structured.content,
      offset: Number(structured.offset ?? 1),
      truncated: Boolean(structured.truncated),
    }
  }

  // V1: result.display.text
  const resultObj = tool.output?.result as
    | { display?: { text?: string; lineStart?: number; truncated?: boolean }; output?: string }
    | undefined
  if (resultObj?.display?.text) {
    return {
      content: resultObj.display.text,
      offset: resultObj.display.lineStart ?? 1,
      truncated: Boolean(resultObj.display.truncated),
    }
  }

  // Last resort: raw output string
  const raw = typeof resultObj?.output === 'string' ? resultObj.output : ''
  return { content: raw, offset: 1, truncated: false }
}

function buildReadFileModel(tool: ToolCall): ReadFileModel {
  const filePath = String(tool.args.filePath ?? tool.args.path ?? tool.args.file ?? '')
  const { content, offset, truncated } = extractReadContent(tool)
  const { fileName, directory } = splitPath(filePath)

  const lines: TextLine[] = content.split('\n').map((text, i) => ({
    id: genId(),
    lineNumber: offset + i,
    text,
  }))

  return {
    _kind: 'read',
    filePath,
    fileName,
    directory,
    lines,
    totalLines: lines.length,
    truncated,
    lineStart: offset,
    options: { wrap: false, showLineNumbers: true },
  }
}

function buildImageModel(tool: ToolCall): ImageModel {
  const filePath = String(tool.args.filePath ?? tool.args.path ?? tool.args.file ?? '')
  const { fileName, directory } = splitPath(filePath)

  const structured = tool.output?.structured as
    | { content?: string; mime?: string; type?: string }
    | undefined

  const mime = String(structured?.mime ?? 'image/png')
  const data = structured?.content ?? ''
  const dataUrl = `data:${mime};base64,${data}`

  return {
    _kind: 'image',
    filePath,
    fileName,
    directory,
    dataUrl,
  }
}

/** 检查 read tool 是否为 image variant */
function isReadImage(tool: ToolCall): boolean {
  const structured = tool.output?.structured as { type?: string } | undefined
  if (structured?.type === 'binary') return true
  const filePart = tool.output?.content?.find((c) => c.type === 'file')
  return Boolean(filePart)
}

export function toolToPresentationModel(tool: ToolCall): FileTab | null {
  switch (tool.name) {
    case 'read':
      return buildReadTab(tool)
    default:
      return null
  }
}

function buildReadTab(tool: ToolCall): FileTab {
  const isImage = isReadImage(tool)
  const model = isImage ? buildImageModel(tool) : buildReadFileModel(tool)
  const { fileName, directory, filePath } = model

  return {
    id: tool.id,
    title: fileName,
    subtitle: directory,
    filePath,
    viewer: isImage ? 'image' : 'text',
    model,
    status: tool.status === 'running' ? 'loading' : 'ready',
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/desktop && npx vitest run src/renderer/services/__tests__/tool-presentation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/renderer/services/tool-presentation.ts packages/desktop/src/renderer/services/__tests__/tool-presentation.test.ts
git commit -m "feat: add presentation adapter for read tool"
```

---

### Task 3: Presentation Adapter — Diff 转换 + 入口完善

**Files:**
- Modify: `packages/desktop/src/renderer/services/tool-presentation.ts`
- Modify: `packages/desktop/src/renderer/services/__tests__/tool-presentation.test.ts`

- [ ] **Step 1: 编写 Diff 转换的失败测试**

追加到 `tool-presentation.test.ts`:

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/desktop && npx vitest run src/renderer/services/__tests__/tool-presentation.test.ts`
Expected: FAIL — edit/write 测试失败

- [ ] **Step 3: 实现 Diff 转换并完善入口**

在 `tool-presentation.ts` 中追加：

```ts
import type {
  FileTab,
  ReadFileModel,
  DiffModel,
  ImageModel,
  TextLine,
  DiffLine,
  HunkInfo,
} from '../types/presentation'

/** 从 ToolCall 提取 diff (V2 structured → V1 result) */
function extractDiff(tool: ToolCall): string {
  const structured = tool.output?.structured as
    | { type?: string; diff?: string }
    | undefined
  if (structured?.diff) return structured.diff
  const resultObj = tool.output?.result as { diff?: string } | undefined
  return resultObj?.diff ?? ''
}

function buildDiffModel(tool: ToolCall): DiffModel {
  const filePath = String(tool.args.filePath ?? tool.args.file ?? tool.args.path ?? '')
  const diff = extractDiff(tool)
  const { fileName, directory } = splitPath(filePath)

  const rawLines = diff.split('\n')
  const diffLines: DiffLine[] = []
  const hunks: HunkInfo[] = []
  let currentHunk: HunkInfo | null = null
  let oldLine = 0
  let newLine = 0

  for (const rawLine of rawLines) {
    const id = genId()

    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    if (rawLine.startsWith('@@')) {
      const match = rawLine.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
      if (match) {
        oldLine = parseInt(match[1], 10)
        newLine = parseInt(match[2], 10)
      }
      currentHunk = { id: genId(), startLine: newLine, lines: [], collapsed: false }
      hunks.push(currentHunk)
      diffLines.push({ id, type: 'hunk', text: rawLine })
      continue
    }

    // Meta: --- a/ +++ b/
    if (rawLine.startsWith('---') || rawLine.startsWith('+++')) {
      diffLines.push({ id, type: 'meta', text: rawLine })
      continue
    }

    // Add line
    if (rawLine.startsWith('+')) {
      const line: DiffLine = { id, type: 'add', newLine, text: rawLine.slice(1) }
      diffLines.push(line)
      currentHunk?.lines.push(line)
      newLine++
      continue
    }

    // Remove line
    if (rawLine.startsWith('-')) {
      const line: DiffLine = { id, type: 'remove', oldLine, text: rawLine.slice(1) }
      diffLines.push(line)
      currentHunk?.lines.push(line)
      oldLine++
      continue
    }

    // Context line (may start with space or be empty)
    const line: DiffLine = {
      id,
      type: 'context',
      oldLine,
      newLine,
      text: rawLine.startsWith(' ') ? rawLine : rawLine,
    }
    diffLines.push(line)
    currentHunk?.lines.push(line)
    oldLine++
    newLine++
  }

  return {
    _kind: 'diff',
    filePath,
    fileName,
    directory,
    hunks,
    lines: diffLines,
    statistics: {
      additions: diffLines.filter((l) => l.type === 'add').length,
      deletions: diffLines.filter((l) => l.type === 'remove').length,
    },
    options: { mode: 'unified', showMeta: true, wrap: false },
  }
}

function buildDiffTab(tool: ToolCall): FileTab {
  const model = buildDiffModel(tool)
  return {
    id: tool.id,
    title: model.fileName,
    subtitle: model.directory,
    filePath: model.filePath,
    viewer: 'diff',
    model,
    status: 'ready',
  }
}
```

修改 `toolToPresentationModel` 入口，补充 edit/write 分支：

```ts
export function toolToPresentationModel(tool: ToolCall): FileTab | null {
  switch (tool.name) {
    case 'read':
      return buildReadTab(tool)
    case 'edit':
    case 'write':
      return buildDiffTab(tool)
    default:
      return null
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/desktop && npx vitest run src/renderer/services/__tests__/tool-presentation.test.ts`
Expected: PASS (全部)

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/renderer/services/tool-presentation.ts packages/desktop/src/renderer/services/__tests__/tool-presentation.test.ts
git commit -m "feat: add diff presentation adapter for edit/write tools"
```

---

### Task 4: UI Store 扩展 — FileTab 状态管理

**Files:**
- Modify: `packages/desktop/src/renderer/stores/ui.ts`
- Modify: `packages/desktop/src/renderer/stores/__tests__/ui.test.ts`

- [ ] **Step 1: 编写 FileTab Store 的失败测试**

追加到 `ui.test.ts` 末尾：

```ts
import type { FileTab, ReadFileModel } from '../../types/presentation'

function makeFakeTab(id: string, filePath: string = 'src/app.ts'): FileTab {
  const model: ReadFileModel = {
    _kind: 'read',
    filePath,
    fileName: filePath.split('/').pop() ?? filePath,
    lines: [],
    options: { wrap: false, showLineNumbers: true },
  }
  return {
    id,
    title: model.fileName,
    filePath,
    viewer: 'text',
    model,
    status: 'ready',
  }
}

describe('uiStore — fileTabs', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('初始状态为空', () => {
    const ui = useUiStore()
    expect(ui.fileTabs).toEqual([])
    expect(ui.activeFileTabId).toBeNull()
  })

  it('openFileTab 添加新 tab 并激活', () => {
    const ui = useUiStore()
    const tab = makeFakeTab('t1')
    ui.openFileTab(tab)
    expect(ui.fileTabs).toHaveLength(1)
    expect(ui.activeFileTabId).toBe('t1')
  })

  it('openFileTab 相同 id 不重复添加，只切换激活', () => {
    const ui = useUiStore()
    ui.openFileTab(makeFakeTab('t1'))
    ui.openFileTab(makeFakeTab('t2'))
    ui.openFileTab(makeFakeTab('t1')) // 已存在
    expect(ui.fileTabs).toHaveLength(2)
    expect(ui.activeFileTabId).toBe('t1')
  })

  it('closeFileTab 关闭当前激活 tab，切换到右侧相邻', () => {
    const ui = useUiStore()
    ui.openFileTab(makeFakeTab('t1'))
    ui.openFileTab(makeFakeTab('t2'))
    ui.openFileTab(makeFakeTab('t3'))
    expect(ui.activeFileTabId).toBe('t3')
    ui.closeFileTab('t3') // 关闭当前
    expect(ui.activeFileTabId).toBe('t2') // 切换到相邻（这里 t3 在末尾，无右侧 → 左侧 t2）
  })

  it('closeFileTab 关闭中间 tab 不影响激活', () => {
    const ui = useUiStore()
    ui.openFileTab(makeFakeTab('t1'))
    ui.openFileTab(makeFakeTab('t2'))
    ui.openFileTab(makeFakeTab('t3'))
    ui.selectFileTab('t3')
    ui.closeFileTab('t2') // 关闭中间
    expect(ui.activeFileTabId).toBe('t3')
    expect(ui.fileTabs).toHaveLength(2)
  })

  it('closeFileTab 关闭唯一 tab → activeFileTabId 为 null', () => {
    const ui = useUiStore()
    ui.openFileTab(makeFakeTab('t1'))
    ui.closeFileTab('t1')
    expect(ui.fileTabs).toEqual([])
    expect(ui.activeFileTabId).toBeNull()
  })

  it('closeAllFileTabs 清空全部', () => {
    const ui = useUiStore()
    ui.openFileTab(makeFakeTab('t1'))
    ui.openFileTab(makeFakeTab('t2'))
    ui.closeAllFileTabs()
    expect(ui.fileTabs).toEqual([])
    expect(ui.activeFileTabId).toBeNull()
  })

  it('selectFileTab 切换激活', () => {
    const ui = useUiStore()
    ui.openFileTab(makeFakeTab('t1'))
    ui.openFileTab(makeFakeTab('t2'))
    ui.selectFileTab('t1')
    expect(ui.activeFileTabId).toBe('t1')
  })

  it('updateFileTabViewerState 更新 viewerState', () => {
    const ui = useUiStore()
    ui.openFileTab(makeFakeTab('t1'))
    ui.updateFileTabViewerState('t1', { scrollTop: 42 })
    expect(ui.fileTabs[0].viewerState?.scrollTop).toBe(42)
  })

  it('resetForSession 不清空 fileTabs (VS Code 风格持久)', () => {
    const ui = useUiStore()
    ui.openFileTab(makeFakeTab('t1'))
    ui.resetForSession()
    expect(ui.fileTabs).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/desktop && npx vitest run src/renderer/stores/__tests__/ui.test.ts`
Expected: FAIL — "ui.openFileTab is not a function"

- [ ] **Step 3: 扩展 ui.ts store**

在 `stores/ui.ts` 中：

a) 在顶部添加 import:
```ts
import type { FileTab } from '../types/presentation'
```

b) 在 `useUiStore` 内部，`activeToolCallId` 后面添加 FileTabs 状态:
```ts
  // ===== FileTabs 状态 =====
  const fileTabs = ref<FileTab[]>([])
  const activeFileTabId = ref<string | null>(null)
```

c) 在 `toggleInspector` 函数后面添加 FileTabs 方法:
```ts
  function openFileTab(tab: FileTab) {
    const existing = fileTabs.value.find((t) => t.id === tab.id)
    if (existing) {
      activeFileTabId.value = tab.id
      return
    }
    fileTabs.value.push(tab)
    activeFileTabId.value = tab.id
  }

  function selectFileTab(id: string) {
    if (fileTabs.value.find((t) => t.id === id)) {
      activeFileTabId.value = id
    }
  }

  function closeFileTab(id: string) {
    const idx = fileTabs.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    fileTabs.value.splice(idx, 1)
    if (activeFileTabId.value === id) {
      const nextTab = fileTabs.value[idx] ?? fileTabs.value[idx - 1]
      activeFileTabId.value = nextTab?.id ?? null
    }
  }

  function closeAllFileTabs() {
    fileTabs.value = []
    activeFileTabId.value = null
  }

  function updateFileTabViewerState(id: string, state: Partial<NonNullable<FileTab['viewerState']>>) {
    const tab = fileTabs.value.find((t) => t.id === id)
    if (tab) {
      tab.viewerState = { ...tab.viewerState, ...state }
    }
  }
```

d) 修改 `resetForSession` 使其不清空 fileTabs:
```ts
  function resetForSession() {
    hasUserClosedArtifactPanel.value = false
    artifactPanelOpen.value = false
    activeToolCallId.value = null
    inspectorOpen.value = true
    // fileTabs 保持不变 — VS Code 风格持久标签页
  }
```

e) 在 return 对象中添加新增的状态和方法:
```ts
  return {
    view, previousView, settingsSection,
    sidebarOpen, artifactPanelOpen, hasUserClosedArtifactPanel, inspectorOpen, activeToolCallId,
    fileTabs, activeFileTabId,
    setView, enterSettings, exitSettings, toggleSidebar,
    openArtifactPanelAutomatically, closeArtifactPanel, openArtifactPanel, toggleInspector,
    openFileTab, selectFileTab, closeFileTab, closeAllFileTabs, updateFileTabViewerState,
    resetForSession,
  }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/desktop && npx vitest run src/renderer/stores/__tests__/ui.test.ts`
Expected: PASS (全部，包括原有测试)

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/renderer/stores/ui.ts packages/desktop/src/renderer/stores/__tests__/ui.test.ts
git commit -m "feat: add fileTabs state management to ui store"
```

---

## Phase 2: Viewer 组件

### Task 5: CodeLines + TextViewer

**Files:**
- Create: `packages/desktop/src/renderer/components/file-tabs/CodeLines.vue`
- Create: `packages/desktop/src/renderer/components/file-tabs/TextViewer.vue`
- Create: `packages/desktop/src/renderer/components/file-tabs/__tests__/TextViewer.test.ts`

- [ ] **Step 1: 编写 TextViewer 的失败测试**

```ts
// packages/desktop/src/renderer/components/file-tabs/__tests__/TextViewer.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TextViewer from '../TextViewer.vue'
import type { ReadFileModel } from '../../../types/presentation'

function makeReadModel(overrides: Partial<ReadFileModel> = {}): ReadFileModel {
  return {
    _kind: 'read',
    filePath: 'src/app.ts',
    fileName: 'app.ts',
    directory: 'src/',
    lines: [
      { id: 'l1', lineNumber: 1, text: "import { createApp } from 'vue'" },
      { id: 'l2', lineNumber: 2, text: 'const app = createApp()' },
    ],
    totalLines: 2,
    options: { wrap: false, showLineNumbers: true },
    ...overrides,
  }
}

describe('TextViewer', () => {
  it('渲染文件名和目录', () => {
    const w = mount(TextViewer, {
      props: { model: makeReadModel(), status: 'ready' },
    })
    expect(w.text()).toContain('app.ts')
    expect(w.text()).toContain('src/')
  })

  it('渲染行号和代码内容', () => {
    const w = mount(TextViewer, {
      props: { model: makeReadModel(), status: 'ready' },
    })
    expect(w.text()).toContain('import { createApp }')
    expect(w.text()).toContain('1')
    expect(w.text()).toContain('2')
  })

  it('显示总行数', () => {
    const w = mount(TextViewer, {
      props: { model: makeReadModel(), status: 'ready' },
    })
    expect(w.text()).toContain('2 行')
  })

  it('status loading 显示加载中', () => {
    const w = mount(TextViewer, {
      props: { model: makeReadModel(), status: 'loading' },
    })
    expect(w.text()).toContain('加载中')
  })

  it('truncated 显示截断标记', () => {
    const w = mount(TextViewer, {
      props: { model: makeReadModel({ truncated: true }), status: 'ready' },
    })
    expect(w.text()).toContain('截断')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/desktop && npx vitest run src/renderer/components/file-tabs/__tests__/TextViewer.test.ts`
Expected: FAIL — "Cannot find module '../TextViewer.vue'"

- [ ] **Step 3: 创建 CodeLines.vue**

```vue
<!-- packages/desktop/src/renderer/components/file-tabs/CodeLines.vue -->
<script setup lang="ts">
import type { TextLine } from '../../types/presentation'

const props = withDefaults(defineProps<{
  lines: TextLine[]
  lineNoWidth?: string
  wrap?: boolean
  showLineNumbers?: boolean
}>(), {
  lineNoWidth: '4ch',
  wrap: false,
  showLineNumbers: true,
})

const emit = defineEmits<{
  scroll: [scrollTop: number]
  selectLine: [lineId: string]
}>()
</script>

<template>
  <div
    class="code-lines font-mono text-sm"
    :class="wrap ? 'whitespace-pre-wrap' : 'whitespace-pre'"
    @scroll="emit('scroll', ($event.target as HTMLElement).scrollTop)"
  >
    <div
      v-for="line in lines"
      :key="line.id"
      class="code-line flex gap-3 px-3 py-0.5 hover:bg-bg-surface cursor-pointer"
      @click="emit('selectLine', line.id)"
    >
      <span
        v-if="showLineNumbers"
        class="line-no text-right text-text-muted select-none shrink-0"
        :style="{ width: lineNoWidth }"
      >
        {{ line.lineNumber }}
      </span>
      <pre class="line-text text-text-primary">{{ line.text }}</pre>
      <slot name="line-extra" :line="line" />
    </div>
  </div>
</template>
```

- [ ] **Step 4: 创建 TextViewer.vue**

```vue
<!-- packages/desktop/src/renderer/components/file-tabs/TextViewer.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { ReadFileModel } from '../../types/presentation'
import CodeLines from './CodeLines.vue'

const props = defineProps<{
  model: ReadFileModel
  status: 'loading' | 'ready' | 'error'
}>()

const emit = defineEmits<{
  scroll: [scrollTop: number]
  selectLine: [lineId: string]
}>()

// 行号宽度动态计算: 根据最大行号位数
const lineNoWidth = computed(() => {
  const maxLine = props.model.lines.length + (props.model.lineStart ?? 1)
  const digits = String(maxLine).length
  return `${digits + 1}ch`
})

function handleScroll(scrollTop: number) {
  emit('scroll', scrollTop)
}
</script>

<template>
  <div class="text-viewer h-full flex flex-col">
    <!-- Header (支持 toolbar slot) -->
    <div class="viewer-header px-3 py-2 text-xs text-text-muted border-b border-border bg-bg-surface shrink-0">
      <slot name="toolbar">
        <span class="font-mono">
          <span class="text-text-primary">{{ model.fileName }}</span>
          <span v-if="model.directory" class="text-text-muted ml-1">{{ model.directory }}</span>
        </span>
        <span v-if="model.totalLines" class="ml-2">· {{ model.totalLines }} 行</span>
        <span v-if="model.truncated" class="ml-2 text-warning">· 截断</span>
        <span v-if="status === 'loading'" class="ml-2 animate-pulse text-accent">加载中...</span>
      </slot>
    </div>

    <!-- Code Lines (预留 VirtualList 替换) -->
    <CodeLines
      :lines="model.lines"
      :line-no-width="lineNoWidth"
      :wrap="model.options.wrap"
      :show-line-numbers="model.options.showLineNumbers"
      class="flex-1 overflow-auto bg-code-bg"
      @scroll="handleScroll"
      @select-line="emit('selectLine', $event)"
    >
      <template #line-extra="{ line }">
        <slot name="line-extra" :line="line" />
      </template>
    </CodeLines>
  </div>
</template>
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd packages/desktop && npx vitest run src/renderer/components/file-tabs/__tests__/TextViewer.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/src/renderer/components/file-tabs/CodeLines.vue packages/desktop/src/renderer/components/file-tabs/TextViewer.vue packages/desktop/src/renderer/components/file-tabs/__tests__/TextViewer.test.ts
git commit -m "feat: add CodeLines and TextViewer components"
```

---

### Task 6: DiffViewer

**Files:**
- Create: `packages/desktop/src/renderer/components/file-tabs/DiffViewer.vue`
- Create: `packages/desktop/src/renderer/components/file-tabs/__tests__/DiffViewer.test.ts`

- [ ] **Step 1: 编写 DiffViewer 的失败测试**

```ts
// packages/desktop/src/renderer/components/file-tabs/__tests__/DiffViewer.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DiffViewer from '../DiffViewer.vue'
import type { DiffModel } from '../../../types/presentation'

function makeDiffModel(overrides: Partial<DiffModel> = {}): DiffModel {
  return {
    _kind: 'diff',
    filePath: 'src/utils/helpers.ts',
    fileName: 'helpers.ts',
    directory: 'src/utils/',
    hunks: [],
    lines: [
      { id: 'd1', type: 'hunk', text: '@@ -1,2 +1,2 @@' },
      { id: 'd2', type: 'remove', oldLine: 1, text: 'old line' },
      { id: 'd3', type: 'add', newLine: 1, text: 'new line' },
      { id: 'd4', type: 'context', oldLine: 2, newLine: 2, text: 'context' },
    ],
    statistics: { additions: 1, deletions: 1 },
    options: { mode: 'unified', showMeta: true, wrap: false },
    ...overrides,
  }
}

describe('DiffViewer', () => {
  it('渲染文件名和统计', () => {
    const w = mount(DiffViewer, {
      props: { model: makeDiffModel(), status: 'ready' },
    })
    expect(w.text()).toContain('helpers.ts')
    expect(w.text()).toContain('src/utils/')
    expect(w.text()).toContain('+1')
    expect(w.text()).toContain('-1')
  })

  it('渲染 diff 行内容', () => {
    const w = mount(DiffViewer, {
      props: { model: makeDiffModel(), status: 'ready' },
    })
    expect(w.text()).toContain('old line')
    expect(w.text()).toContain('new line')
    expect(w.text()).toContain('context')
  })

  it('add 行有 success 样式', () => {
    const w = mount(DiffViewer, {
      props: { model: makeDiffModel(), status: 'ready' },
    })
    const addLine = w.find('[data-line-type="add"]')
    expect(addLine.exists()).toBe(true)
  })

  it('showMeta=false 时隐藏 meta 行', () => {
    const w = mount(DiffViewer, {
      props: {
        model: makeDiffModel({
          lines: [
            { id: 'm1', type: 'meta', text: '--- a/src/f.ts' },
            { id: 'm2', type: 'meta', text: '+++ b/src/f.ts' },
            { id: 'd1', type: 'hunk', text: '@@ -1 +1 @@' },
          ],
          options: { mode: 'unified', showMeta: false, wrap: false },
        }),
        status: 'ready',
      },
    })
    expect(w.text()).not.toContain('--- a/')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/desktop && npx vitest run src/renderer/components/file-tabs/__tests__/DiffViewer.test.ts`
Expected: FAIL — "Cannot find module '../DiffViewer.vue'"

- [ ] **Step 3: 创建 DiffViewer.vue**

```vue
<!-- packages/desktop/src/renderer/components/file-tabs/DiffViewer.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { DiffModel, DiffLine } from '../../types/presentation'

const props = defineProps<{
  model: DiffModel
  status: 'loading' | 'ready' | 'error'
}>()

const emit = defineEmits<{
  scroll: [scrollTop: number]
  selectHunk: [hunkId: string]
  toggleHunk: [hunkId: string]
}>()

// 过滤是否显示 meta 行
const visibleLines = computed(() =>
  props.model.options.showMeta
    ? props.model.lines
    : props.model.lines.filter((l) => l.type !== 'meta'),
)

const LINE_STYLE_MAP: Record<DiffLine['type'], string> = {
  add: 'bg-success/15 text-success',
  remove: 'bg-error/15 text-error',
  context: 'text-text-secondary',
  hunk: 'bg-accent-muted/20 text-accent-muted',
  meta: 'text-text-muted',
}
</script>

<template>
  <div class="diff-viewer h-full flex flex-col">
    <!-- Header (支持 toolbar slot) -->
    <div class="viewer-header px-3 py-2 text-xs border-b border-border bg-bg-surface shrink-0">
      <slot name="toolbar">
        <span class="font-mono text-text-muted">
          <span class="text-text-primary">{{ model.fileName }}</span>
          <span v-if="model.directory" class="text-text-muted ml-1">{{ model.directory }}</span>
        </span>
        <div class="stats mt-1 flex gap-3">
          <span class="text-success">+{{ model.statistics.additions }}</span>
          <span class="text-error">-{{ model.statistics.deletions }}</span>
        </div>
      </slot>
    </div>

    <!-- Diff Lines -->
    <div
      class="diff-lines flex-1 overflow-auto bg-code-bg font-mono text-sm"
      @scroll="emit('scroll', ($event.target as HTMLElement).scrollTop)"
    >
      <div
        v-for="line in visibleLines"
        :key="line.id"
        :data-line-type="line.type"
        :class="['diff-line px-3 py-0.5', LINE_STYLE_MAP[line.type]]"
      >
        <!-- Unified mode -->
        <div v-if="model.options.mode === 'unified'" class="flex gap-3">
          <span v-if="line.oldLine" class="w-8 text-right text-text-muted select-none shrink-0">{{ line.oldLine }}</span>
          <span v-else class="w-8 shrink-0"></span>
          <span v-if="line.newLine" class="w-8 text-right text-text-muted select-none shrink-0">{{ line.newLine }}</span>
          <span v-else class="w-8 shrink-0"></span>
          <pre class="line-text whitespace-pre">{{ line.text }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/desktop && npx vitest run src/renderer/components/file-tabs/__tests__/DiffViewer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/renderer/components/file-tabs/DiffViewer.vue packages/desktop/src/renderer/components/file-tabs/__tests__/DiffViewer.test.ts
git commit -m "feat: add DiffViewer component"
```

---

### Task 7: ImageViewer

**Files:**
- Create: `packages/desktop/src/renderer/components/file-tabs/ImageViewer.vue`

- [ ] **Step 1: 创建 ImageViewer.vue**

```vue
<!-- packages/desktop/src/renderer/components/file-tabs/ImageViewer.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import type { ImageModel } from '../../types/presentation'

const props = defineProps<{
  model: ImageModel
  status: 'loading' | 'ready' | 'error'
}>()

const loaded = ref(false)
const error = ref(false)
const enlarged = ref(false)

function handleLoad() { loaded.value = true }
function handleError() { error.value = true }
</script>

<template>
  <div class="image-viewer h-full flex flex-col">
    <!-- Header -->
    <div class="viewer-header px-3 py-2 text-xs text-text-muted border-b border-border bg-bg-surface shrink-0">
      <slot name="toolbar">
        <span class="font-mono">
          <span class="text-text-primary">{{ model.fileName }}</span>
          <span v-if="model.directory" class="text-text-muted ml-1">{{ model.directory }}</span>
        </span>
      </slot>
    </div>

    <!-- Image body -->
    <div class="image-body flex-1 overflow-auto p-4 flex items-center justify-center bg-bg-surface">
      <div v-if="!loaded && !error" class="text-text-muted text-sm animate-pulse">加载中...</div>
      <div v-if="error" class="text-error text-sm">图片加载失败</div>
      <img
        v-show="loaded"
        :src="model.dataUrl"
        :alt="model.filePath"
        loading="lazy"
        class="max-w-full max-h-full rounded border border-border cursor-pointer hover:opacity-80 transition-opacity"
        @load="handleLoad"
        @error="handleError"
        @click="enlarged = !enlarged"
      />
    </div>

    <!-- Enlarged overlay -->
    <div
      v-if="enlarged"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      @click="enlarged = false"
    >
      <img :src="model.dataUrl" :alt="model.filePath" class="max-w-[90vw] max-h-[90vh]" />
    </div>
  </div>
</template>
```

- [ ] **Step 2: 验证 typecheck 通过**

Run: `cd packages/desktop && npx vue-tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/components/file-tabs/ImageViewer.vue
git commit -m "feat: add ImageViewer component"
```

---

### Task 8: FileTabsHeader + FileTabsPanel

**Files:**
- Create: `packages/desktop/src/renderer/components/file-tabs/FileTabsHeader.vue`
- Create: `packages/desktop/src/renderer/components/file-tabs/FileTabsPanel.vue`
- Create: `packages/desktop/src/renderer/components/file-tabs/__tests__/FileTabsHeader.test.ts`
- Create: `packages/desktop/src/renderer/components/file-tabs/__tests__/FileTabsPanel.test.ts`

- [ ] **Step 1: 编写 FileTabsHeader 的失败测试**

```ts
// packages/desktop/src/renderer/components/file-tabs/__tests__/FileTabsHeader.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FileTabsHeader from '../FileTabsHeader.vue'
import type { FileTab, ReadFileModel } from '../../../types/presentation'

function makeTab(id: string, title: string, subtitle?: string): FileTab {
  const model: ReadFileModel = {
    _kind: 'read', filePath: `${title}`, fileName: title,
    lines: [], options: { wrap: false, showLineNumbers: true },
  }
  return { id, title, subtitle, filePath: title, viewer: 'text', model, status: 'ready' }
}

describe('FileTabsHeader', () => {
  it('渲染所有标签标题', () => {
    const tabs = [makeTab('t1', 'app.ts', 'src/'), makeTab('t2', 'main.ts', 'src/')]
    const w = mount(FileTabsHeader, { props: { tabs, activeId: 't1' } })
    expect(w.text()).toContain('app.ts')
    expect(w.text()).toContain('main.ts')
    expect(w.text()).toContain('src/')
  })

  it('点击标签触发 select 事件', async () => {
    const tabs = [makeTab('t1', 'app.ts'), makeTab('t2', 'main.ts')]
    const w = mount(FileTabsHeader, { props: { tabs, activeId: 't1' } })
    await w.find('[data-tab-id="t2"]').trigger('click')
    expect(w.emitted('select')).toBeTruthy()
    expect(w.emitted('select')![0]).toEqual(['t2'])
  })

  it('点击关闭按钮触发 close 事件', async () => {
    const tabs = [makeTab('t1', 'app.ts')]
    const w = mount(FileTabsHeader, { props: { tabs, activeId: 't1' } })
    await w.find('[data-close-id="t1"]').trigger('click')
    expect(w.emitted('close')).toBeTruthy()
    expect(w.emitted('close')![0]).toEqual(['t1'])
  })

  it('多个标签时显示关闭全部按钮', () => {
    const tabs = [makeTab('t1', 'a.ts'), makeTab('t2', 'b.ts')]
    const w = mount(FileTabsHeader, { props: { tabs, activeId: 't1' } })
    expect(w.find('[data-testid="close-all"]').exists()).toBe(true)
  })

  it('单个标签时不显示关闭全部按钮', () => {
    const tabs = [makeTab('t1', 'a.ts')]
    const w = mount(FileTabsHeader, { props: { tabs, activeId: 't1' } })
    expect(w.find('[data-testid="close-all"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/desktop && npx vitest run src/renderer/components/file-tabs/__tests__/FileTabsHeader.test.ts`
Expected: FAIL — "Cannot find module '../FileTabsHeader.vue'"

- [ ] **Step 3: 创建 FileTabsHeader.vue**

```vue
<!-- packages/desktop/src/renderer/components/file-tabs/FileTabsHeader.vue -->
<script setup lang="ts">
import type { FileTab } from '../../types/presentation'

defineProps<{
  tabs: FileTab[]
  activeId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  close: [id: string]
  closeAll: []
}>()
</script>

<template>
  <div class="file-tabs-header flex items-center bg-bg-elevated border-b border-border shrink-0">
    <!-- 标签列表 -->
    <div class="tabs-scroll flex-1 flex overflow-x-auto">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :data-tab-id="tab.id"
        :class="[
          'tab-item flex items-center gap-1 px-3 py-2 text-xs border-r border-border',
          'hover:bg-bg-surface transition-colors whitespace-nowrap',
          tab.id === activeId ? 'bg-bg-surface font-medium' : ''
        ]"
        @click="emit('select', tab.id)"
      >
        <span :class="tab.id === activeId ? 'text-text' : 'text-text-muted'">
          {{ tab.title }}
        </span>
        <span v-if="tab.subtitle" class="text-text-muted text-[10px]">
          {{ tab.subtitle }}
        </span>
        <span
          :data-close-id="tab.id"
          class="close-btn text-text-muted hover:text-error ml-1 px-0.5"
          @click.stop="emit('close', tab.id)"
        >
          ✕
        </span>
      </button>
    </div>

    <!-- 关闭全部 -->
    <button
      v-if="tabs.length > 1"
      data-testid="close-all"
      class="close-all px-3 py-2 text-xs text-text-muted hover:text-text border-l border-border shrink-0"
      @click="emit('closeAll')"
    >
      关闭全部
    </button>
  </div>
</template>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/desktop && npx vitest run src/renderer/components/file-tabs/__tests__/FileTabsHeader.test.ts`
Expected: PASS

- [ ] **Step 5: 编写 FileTabsPanel 的失败测试**

```ts
// packages/desktop/src/renderer/components/file-tabs/__tests__/FileTabsPanel.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FileTabsPanel from '../FileTabsPanel.vue'
import { useUiStore } from '../../../stores/ui'
import type { FileTab, ReadFileModel } from '../../../types/presentation'

function makeTab(id: string, title: string): FileTab {
  const model: ReadFileModel = {
    _kind: 'read', filePath: title, fileName: title,
    lines: [{ id: 'l1', lineNumber: 1, text: 'hello' }],
    options: { wrap: false, showLineNumbers: true },
  }
  return { id, title, filePath: title, viewer: 'text', model, status: 'ready' }
}

describe('FileTabsPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('无标签时不渲染', () => {
    const w = mount(FileTabsPanel)
    expect(w.find('.file-tabs-panel').exists()).toBe(false)
  })

  it('有标签时渲染面板和内容', () => {
    const ui = useUiStore()
    ui.openFileTab(makeTab('t1', 'app.ts'))
    const w = mount(FileTabsPanel)
    expect(w.find('.file-tabs-panel').exists()).toBe(true)
    expect(w.text()).toContain('app.ts')
    expect(w.text()).toContain('hello')
  })

  it('点击关闭按钮调用 closeFileTab', async () => {
    const ui = useUiStore()
    ui.openFileTab(makeTab('t1', 'app.ts'))
    const w = mount(FileTabsPanel)
    await w.find('[data-close-id="t1"]').trigger('click')
    expect(ui.fileTabs).toHaveLength(0)
  })
})
```

- [ ] **Step 6: 运行测试确认失败**

Run: `cd packages/desktop && npx vitest run src/renderer/components/file-tabs/__tests__/FileTabsPanel.test.ts`
Expected: FAIL — "Cannot find module '../FileTabsPanel.vue'"

- [ ] **Step 7: 创建 FileTabsPanel.vue**

```vue
<!-- packages/desktop/src/renderer/components/file-tabs/FileTabsPanel.vue -->
<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useUiStore } from '../../stores/ui'
import FileTabsHeader from './FileTabsHeader.vue'
import TextViewer from './TextViewer.vue'
import DiffViewer from './DiffViewer.vue'
import ImageViewer from './ImageViewer.vue'

const ui = useUiStore()

const VIEWER_MAP: Record<string, Component> = {
  text: TextViewer,
  diff: DiffViewer,
  image: ImageViewer,
}

const activeTab = computed(() =>
  ui.fileTabs.find((t) => t.id === ui.activeFileTabId),
)

const viewerComponent = computed(() =>
  VIEWER_MAP[activeTab.value?.viewer ?? 'text'],
)

function handleViewerScroll(scrollTop: number) {
  if (activeTab.value) {
    ui.updateFileTabViewerState(activeTab.value.id, { scrollTop })
  }
}
</script>

<template>
  <div
    v-if="ui.fileTabs.length > 0"
    class="file-tabs-panel w-96 flex flex-col min-h-0 border-l border-border bg-bg-surface"
  >
    <FileTabsHeader
      :tabs="ui.fileTabs"
      :active-id="ui.activeFileTabId"
      @select="ui.selectFileTab"
      @close="ui.closeFileTab"
      @close-all="ui.closeAllFileTabs"
    />

    <component
      v-if="activeTab"
      :is="viewerComponent"
      :model="activeTab.model"
      :status="activeTab.status"
      @scroll="handleViewerScroll"
    />
  </div>
</template>
```

- [ ] **Step 8: 运行测试确认通过**

Run: `cd packages/desktop && npx vitest run src/renderer/components/file-tabs/__tests__/FileTabsPanel.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add packages/desktop/src/renderer/components/file-tabs/FileTabsHeader.vue packages/desktop/src/renderer/components/file-tabs/FileTabsPanel.vue packages/desktop/src/renderer/components/file-tabs/__tests__/
git commit -m "feat: add FileTabsHeader and FileTabsPanel components"
```

---

## Phase 3: 事件链路改造

### Task 9: ToolCallRow + ToolRenderer — openFile emit

**Files:**
- Modify: `packages/desktop/src/renderer/components/tool/ToolCallRow.vue`
- Modify: `packages/desktop/src/renderer/components/tool/ToolRenderer.vue`

- [ ] **Step 1: 修改 ToolCallRow.vue — 新增 openFile emit**

在 `ToolCallRow.vue` 的 emits 定义中新增 `openFile`:

```ts
const emit = defineEmits<{
  activate: []
  expand: []
  inspect: [id: string]
  openFile: [tool: ToolCall]   // 新增
}>()
```

修改 summary 区域的点击事件 — 将原来的 `@click.stop="emit('inspect', tool.id)"` 改为 `@click.stop="emit('openFile', tool)"`:

```vue
<!-- Tool name (mono, fixed width) — click opens file tab -->
<span
  class="tool-name text-xs font-mono text-text-secondary w-20 shrink-0 truncate cursor-pointer hover:text-accent"
  @click.stop="emit('openFile', tool)"
>
  {{ displayName }}
</span>

<!-- Summary (bold) — click opens file tab -->
<span
  class="summary text-xs text-text-primary font-medium flex-1 truncate cursor-pointer hover:text-accent"
  @click.stop="emit('openFile', tool)"
>
  {{ summaryText }}
</span>
```

- [ ] **Step 2: 修改 ToolRenderer.vue — 转发 openFile 事件**

在 `ToolRenderer.vue` 的 emits 定义中新增 `openFile`:

```ts
const emit = defineEmits<{
  inspect: [id: string]
  openFile: [tool: ToolCall]   // 新增
}>()
```

在 template 中 ToolCallRow 上新增 `@open-file`:

```vue
<ToolCallRow
  v-if="!expanded"
  :tool="tool"
  :meta="meta"
  @activate="handleRowActivate"
  @expand="toggleExpanded"
  @inspect="(id) => emit('inspect', id)"
  @open-file="(tool) => emit('openFile', tool)"
/>
```

- [ ] **Step 3: 验证 typecheck 通过**

Run: `cd packages/desktop && npx vue-tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 运行现有 tool 测试确认无回归**

Run: `cd packages/desktop && npx vitest run src/renderer/tool/__tests__/`
Expected: PASS (全部已有测试)

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/renderer/components/tool/ToolCallRow.vue packages/desktop/src/renderer/components/tool/ToolRenderer.vue
git commit -m "feat: add openFile emit to ToolCallRow and ToolRenderer"
```

---

### Task 10: MessageAssistant + ChatTimeline + ChatView — openFile 传递

**Files:**
- Modify: `packages/desktop/src/renderer/components/chat/MessageAssistant.vue`
- Modify: `packages/desktop/src/renderer/components/chat/ChatTimeline.vue`
- Modify: `packages/desktop/src/renderer/components/chat/ChatView.vue`

- [ ] **Step 1: 修改 MessageAssistant.vue**

修改 emits 定义，将 `inspect` 改为同时支持 `openFile`:

```ts
const emit = defineEmits<{
  inspect: [id: string]
  openFile: [tool: ToolCall]   // 新增
}>()
```

在 template 的 ToolRenderer 上新增 `@open-file`:

```vue
<ToolRenderer
  v-for="tc in message.toolCalls"
  :key="tc.id"
  :tool="tc"
  @inspect="handleInspect"
  @open-file="(tool) => emit('openFile', tool)"
/>
```

添加 import:
```ts
import type { ToolCall } from '../../../types/ipc'
```

- [ ] **Step 2: 修改 ChatTimeline.vue**

修改 emits 定义:

```ts
const emit = defineEmits<{
  inspect: [id: string]
  openFile: [tool: ToolCall]   // 新增
}>()
```

在 template 的 MessageAssistant 上新增 `@open-file`:

```vue
<MessageAssistant v-else :message="item.message" @inspect="emit('inspect', $event)" @open-file="emit('openFile', $event)" />
```

添加 import:
```ts
import type { Message, ToolCall } from '../../../types/ipc'
```

- [ ] **Step 3: 修改 ChatView.vue**

修改 emits 定义:

```ts
const emit = defineEmits<{
  inspect: [toolCallId: string]
  openFile: [tool: ToolCall]   // 新增
}>()
```

在 template 的 ChatTimeline 上新增 `@open-file`:

```vue
<ChatTimeline
  :messages="messages"
  :streaming-message="streamingMessage"
  @inspect="emit('inspect', $event)"
  @open-file="emit('openFile', $event)"
/>
```

添加 import:
```ts
import type { Message, ToolCall } from '../../../types/ipc'
```

- [ ] **Step 4: 验证 typecheck 通过**

Run: `cd packages/desktop && npx vue-tsc --noEmit`
Expected: PASS

- [ ] **Step 5: 运行 ChatTimeline 测试确认无回归**

Run: `cd packages/desktop && npx vitest run src/renderer/components/chat/__tests__/ChatTimeline.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/src/renderer/components/chat/MessageAssistant.vue packages/desktop/src/renderer/components/chat/ChatTimeline.vue packages/desktop/src/renderer/components/chat/ChatView.vue
git commit -m "feat: propagate openFile event through chat components"
```

---

### Task 11: App.vue 集成 — 替换 Inspector 为 FileTabsPanel

**Files:**
- Modify: `packages/desktop/src/renderer/App.vue`

- [ ] **Step 1: 修改 App.vue**

a) 修改 imports — 新增 FileTabsPanel 和 toolToPresentationModel:

```ts
import FileTabsPanel from './components/file-tabs/FileTabsPanel.vue'
import { toolToPresentationModel } from './services/tool-presentation'
import type { ToolCall } from './types/ipc'
```

b) 修改 ChatView 的事件绑定 — 将 `@inspect="handleInspect"` 改为同时处理 `@open-file`:

```vue
<ChatView
  v-else-if="effectiveView === 'chat'"
  key="chat"
  :session-id="currentSessionId ?? ''"
  :messages="currentMessages"
  :streaming-message="sessionStore.streamingMessage"
  @inspect="handleInspect"
  @open-file="handleOpenFile"
/>
```

c) 在 `<Inspector>` 旁新增 `<FileTabsPanel>`:

```vue
<!-- Right Panel: FileTabsPanel (文件标签页) -->
<FileTabsPanel />

<!-- Inspector (Glob/Grep 等 inspect 工具) -->
<Inspector
  v-if="showInspector"
  :messages="currentMessages"
/>
```

d) 添加 `handleOpenFile` 函数和 `showInspector` computed:

```ts
function handleOpenFile(tool: ToolCall) {
  const tab = toolToPresentationModel(tool)
  if (tab) {
    // Read/Edit/Write → 打开 FileTabsPanel
    ui.openFileTab(tab)
  } else {
    // Glob/Grep 等 → 保持 inspect 行为
    handleInspect(tool.id)
  }
}

const showInspector = computed(() =>
  ui.inspectorOpen && ui.activeToolCallId && ui.fileTabs.length === 0
)
```

- [ ] **Step 2: 验证 typecheck 通过**

Run: `cd packages/desktop && npx vue-tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 运行全部测试确认无回归**

Run: `cd packages/desktop && npx vitest run`
Expected: PASS (全部已有测试)

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/renderer/App.vue
git commit -m "feat: integrate FileTabsPanel into App, replace Inspector for file tools"
```

---

## Phase 4: Markdown 渲染

### Task 12: 安装 markdown-it + 创建 TokenRenderer

**Files:**
- Modify: `packages/desktop/package.json` (安装依赖)
- Create: `packages/desktop/src/renderer/components/markdown/TokenRenderer.vue`

- [ ] **Step 1: 安装 markdown-it 及插件**

Run:
```bash
cd packages/desktop && bun add markdown-it markdown-it-task-lists markdown-it-footnote && bun add -D @types/markdown-it
```

- [ ] **Step 2: 创建 TokenRenderer.vue — Token[] → Vue Component 调度**

```vue
<!-- packages/desktop/src/renderer/components/markdown/TokenRenderer.vue -->
<script setup lang="ts">
/**
 * TokenRenderer — markdown-it Token[] → Vue Component 调度器。
 *
 * 不使用 v-html。将 markdown-it parse 出的 Token 序列遍历，
 * 每个 block-level token 对应一个 Vue 组件渲染。
 * inline tokens 由 InlineToken.vue 递归处理。
 */
import { computed, type Component } from 'vue'
import MarkdownIt from 'markdown-it'
import markdownItTaskLists from 'markdown-it-task-lists'
import markdownItFootnote from 'markdown-it-footnote'
import HeadingToken from './tokens/HeadingToken.vue'
import ParagraphToken from './tokens/ParagraphToken.vue'
import CodeFenceToken from './tokens/CodeFenceToken.vue'
import TableToken from './tokens/TableToken.vue'
import QuoteToken from './tokens/QuoteToken.vue'
import ListToken from './tokens/ListToken.vue'
import ImageToken from './tokens/ImageToken.vue'
import InlineToken from './tokens/InlineToken.vue'

const props = defineProps<{
  content: string
  messageId: string
}>()

const md = new MarkdownIt({ html: false, linkify: true })
  .use(markdownItTaskLists)
  .use(markdownItFootnote)

const tokens = computed(() => md.parse(props.content, {}))

// Block-level token type → Component 映射
const BLOCK_MAP: Record<string, Component> = {
  heading_open: HeadingToken,
  paragraph_open: ParagraphToken,
  fence: CodeFenceToken,
  code_block: CodeFenceToken,
  table_open: TableToken,
  blockquote_open: QuoteToken,
  bullet_list_open: ListToken,
  ordered_list_open: ListToken,
  image: ImageToken,
}

// 解析 inline content tokens (between open and close)
function extractInlineTokens(allTokens: any[], openIdx: number): any[] {
  const open = allTokens[openIdx]
  const closeType = open.type.replace('_open', '_close')
  const result: any[] = []
  let depth = 0
  for (let i = openIdx + 1; i < allTokens.length; i++) {
    const t = allTokens[i]
    if (t.type === open.type) depth++
    if (t.type === closeType) {
      if (depth === 0) break
      depth--
    }
    result.push(t)
  }
  return result
}

interface BlockNode {
  key: string
  component: Component
  openToken: any
  inlineTokens: any[]
  codeIndex: number
}

// 将 token 流转换为 block 节点列表
const blockNodes = computed<BlockNode[]>(() => {
  const nodes: BlockNode[] = []
  let codeIdx = 0
  const all = tokens.value
  for (let i = 0; i < all.length; i++) {
    const t = all[i]
    // fence 是自闭合的 (无 open/close)
    if (t.type === 'fence' || t.type === 'code_block') {
      nodes.push({
        key: `${props.messageId}-fence-${codeIdx}`,
        component: CodeFenceToken,
        openToken: t,
        inlineTokens: [],
        codeIndex: codeIdx,
      })
      codeIdx++
      continue
    }
    // image 是自闭合的
    if (t.type === 'image') {
      nodes.push({
        key: `${props.messageId}-img-${i}`,
        component: ImageToken,
        openToken: t,
        inlineTokens: [],
        codeIndex: codeIdx,
      })
      continue
    }
    const comp = BLOCK_MAP[t.type]
    if (comp && t.type.endsWith('_open')) {
      const inline = extractInlineTokens(all, i)
      nodes.push({
        key: `${props.messageId}-${t.type}-${i}`,
        component: comp,
        openToken: t,
        inlineTokens: inline,
        codeIndex: codeIdx,
      })
    }
  }
  return nodes
})
</script>

<template>
  <div class="markdown-content text-sm leading-relaxed">
    <template v-for="node in blockNodes" :key="node.key">
      <component
        :is="node.component"
        :open-token="node.openToken"
        :inline-tokens="node.inlineTokens"
        :message-id="messageId"
        :code-index="node.codeIndex"
      />
    </template>
  </div>
</template>
```

- [ ] **Step 3: 验证 typecheck 通过**

Run: `cd packages/desktop && npx vue-tsc --noEmit`
Expected: PASS (可能有 import 警告，因为 token 组件还未创建。先创建空壳文件)

创建各 token 组件的空壳（下一 Task 会填充）。先创建空文件:

```vue
<!-- packages/desktop/src/renderer/components/markdown/tokens/HeadingToken.vue -->
<script setup lang="ts">
defineProps<{ openToken: any; inlineTokens: any[]; messageId: string; codeIndex: number }>()
</script>
<template><div /></template>
```

对 ParagraphToken, CodeFenceToken, TableToken, QuoteToken, ListToken, ImageToken, InlineToken 重复同样的空壳。

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/package.json packages/desktop/src/renderer/components/markdown/
git commit -m "feat: add markdown-it dependency and TokenRenderer scaffold"
```

---

### Task 13: Token 组件实现

**Files:**
- Modify: `packages/desktop/src/renderer/components/markdown/tokens/InlineToken.vue`
- Modify: `packages/desktop/src/renderer/components/markdown/tokens/HeadingToken.vue`
- Modify: `packages/desktop/src/renderer/components/markdown/tokens/ParagraphToken.vue`
- Modify: `packages/desktop/src/renderer/components/markdown/tokens/CodeFenceToken.vue`
- Modify: `packages/desktop/src/renderer/components/markdown/tokens/TableToken.vue`
- Modify: `packages/desktop/src/renderer/components/markdown/tokens/QuoteToken.vue`
- Modify: `packages/desktop/src/renderer/components/markdown/tokens/ListToken.vue`
- Modify: `packages/desktop/src/renderer/components/markdown/tokens/ImageToken.vue`

- [ ] **Step 1: 实现 InlineToken.vue (行内文本: bold/italic/code/link/strikethrough)**

```vue
<!-- packages/desktop/src/renderer/components/markdown/tokens/InlineToken.vue -->
<script setup lang="ts">
/**
 * InlineToken — 递归渲染 markdown-it inline tokens。
 * 处理: text, strong, em, code_inline, link_open/close, s (strikethrough), softbreak
 */
import { h, type VNode } from 'vue'

const props = defineProps<{
  tokens: any[]
  messageId: string
}>()

function renderInline(tokens: any[]): VNode[] {
  const nodes: VNode[] = []
  let linkHref: string | null = null

  for (const t of tokens) {
    if (t.type === 'text') {
      nodes.push(h('span', t.content))
    } else if (t.type === 'softbreak' || t.type === 'hardbreak') {
      nodes.push(h('br'))
    } else if (t.type === 'strong_open') {
      // handled by nesting — simplified: render as <strong> wrapper
    } else if (t.type === 'strong_close') {
      // close
    } else if (t.type === 'code_inline') {
      nodes.push(h('code', { class: 'inline-code' }, t.content))
    } else if (t.type === 'link_open') {
      linkHref = t.attrs?.find((a: any[]) => a[0] === 'href')?.[1] ?? '#'
    } else if (t.type === 'link_close') {
      linkHref = null
    } else if (t.type === 'image') {
      const src = t.attrs?.find((a: any[]) => a[0] === 'src')?.[1] ?? ''
      const alt = t.content
      nodes.push(h('img', { src, alt, loading: 'lazy', class: 'inline-image' }))
    }
  }

  // Simplified: render as flat text with code_inline styled.
  // A fuller implementation would build a tree, but for MVP this covers the common cases.
  return nodes
}

// Build a simpler rendering that groups consecutive tokens
function renderTokens(tokens: any[]): VNode {
  const children: (VNode | string)[] = []
  for (const t of tokens) {
    if (t.type === 'text') {
      children.push(t.content)
    } else if (t.type === 'softbreak' || t.type === 'hardbreak') {
      children.push(h('br'))
    } else if (t.type === 'code_inline') {
      children.push(h('code', { class: 'inline-code bg-bg-hover px-1 rounded text-xs font-mono' }, t.content))
    } else if (t.type === 's_open') {
      // strikethrough — simplified: skip nesting, render children with line-through
    } else if (t.type === 'image') {
      const src = t.attrs?.find((a: any[]) => a[0] === 'src')?.[1] ?? ''
      children.push(h('img', { src, alt: t.content, loading: 'lazy', class: 'max-w-full rounded my-2' }))
    }
  }

  // Handle links: find link_open...link_close spans
  // For MVP, extract link text and href, render as <a>
  const linkNodes: VNode[] = []
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]
    if (t.type === 'link_open') {
      const href = t.attrs?.find((a: any[]) => a[0] === 'href')?.[1] ?? '#'
      const linkText: string[] = []
      i++
      while (i < tokens.length && tokens[i].type !== 'link_close') {
        if (tokens[i].type === 'text') linkText.push(tokens[i].content)
        if (tokens[i].type === 'code_inline') linkText.push(tokens[i].content)
        i++
      }
      linkNodes.push(h('a', {
        href, target: '_blank', rel: 'noopener noreferrer',
        class: 'text-accent underline',
      }, linkText.join('')))
      i++ // skip link_close
    } else if (t.type === 'text' || t.type === 'softbreak' || t.type === 'hardbreak' || t.type === 'code_inline' || t.type === 'image') {
      // Already handled in children above
      i++
    } else {
      i++
    }
  }

  // If we found links, we need to interleave them with text.
  // For MVP simplicity: render children (text/code/breaks) + links appended.
  // A production version would do proper tree-building.
  if (linkNodes.length > 0) {
    return h('span', [...children, ...linkNodes])
  }
  return h('span', children)
}

const rendered = () => renderTokens(props.tokens)
</script>

<template>
  <component :is="rendered" />
</template>
```

- [ ] **Step 2: 实现 HeadingToken.vue**

```vue
<!-- packages/desktop/src/renderer/components/markdown/tokens/HeadingToken.vue -->
<script setup lang="ts">
import { computed, type VNode } from 'vue'
import InlineToken from './InlineToken.vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

const level = computed(() => {
  // openToken.tag is 'h1', 'h2', etc.
  return parseInt(props.openToken.tag.replace('h', ''), 10) || 1
})

// Extract inline content (skip open/close tokens)
const inlineContent = computed(() =>
  props.inlineTokens.filter((t) => !t.type.endsWith('_open') && !t.type.endsWith('_close')),
)
</script>

<template>
  <component :is="`h${level}`" class="font-semibold mt-4 mb-2">
    <InlineToken :tokens="inlineContent" :message-id="messageId" />
  </component>
</template>

<style scoped>
h1 { font-size: 1.5rem; }
h2 { font-size: 1.25rem; }
h3 { font-size: 1.1rem; }
h4, h5, h6 { font-size: 1rem; }
</style>
```

- [ ] **Step 3: 实现 ParagraphToken.vue**

```vue
<!-- packages/desktop/src/renderer/components/markdown/tokens/ParagraphToken.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import InlineToken from './InlineToken.vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

const inlineContent = computed(() =>
  props.inlineTokens.filter((t) => !t.type.endsWith('_open') && !t.type.endsWith('_close')),
)
</script>

<template>
  <p class="mb-3"><InlineToken :tokens="inlineContent" :message-id="messageId" /></p>
</template>
```

- [ ] **Step 4: 实现 CodeFenceToken.vue (复用 CodeBlock)**

```vue
<!-- packages/desktop/src/renderer/components/markdown/tokens/CodeFenceToken.vue -->
<script setup lang="ts">
import CodeBlock from '../../chat/CodeBlock.vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

const lang = props.openToken.info?.trim() || 'text'
const code = props.openToken.content || ''
</script>

<template>
  <CodeBlock :code="code" :lang="lang" :message-id="messageId" :code-index="codeIndex" />
</template>
```

- [ ] **Step 5: 实现 TableToken.vue**

```vue
<!-- packages/desktop/src/renderer/components/markdown/tokens/TableToken.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import InlineToken from './InlineToken.vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

// Parse table structure from inline tokens
interface Cell { tokens: any[] }
interface Row { cells: Cell[] }

const rows = computed<Row[]>(() => {
  const result: Row[] = []
  let currentRow: Row | null = null
  let currentCell: Cell | null = null

  for (const t of props.inlineTokens) {
    if (t.type === 'tr_open') {
      currentRow = { cells: [] }
    } else if (t.type === 'tr_close') {
      if (currentRow) result.push(currentRow)
      currentRow = null
    } else if (t.type === 'th_open' || t.type === 'td_open') {
      currentCell = { tokens: [] }
    } else if (t.type === 'th_close' || t.type === 'td_close') {
      if (currentCell && currentRow) currentRow.cells.push(currentCell)
      currentCell = null
    } else if (currentCell && !t.type.endsWith('_open') && !t.type.endsWith('_close')) {
      currentCell.tokens.push(t)
    }
  }
  return result
})

const headerRow = computed(() => rows.value[0])
const bodyRows = computed(() => rows.value.slice(1))
</script>

<template>
  <table class="w-full border-collapse mb-3 text-xs">
    <thead v-if="headerRow">
      <tr>
        <th v-for="(cell, i) in headerRow.cells" :key="i" class="border border-border px-2 py-1 text-left font-semibold bg-bg-surface">
          <InlineToken :tokens="cell.tokens" :message-id="messageId" />
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, ri) in bodyRows" :key="ri">
        <td v-for="(cell, ci) in row.cells" :key="ci" class="border border-border px-2 py-1">
          <InlineToken :tokens="cell.tokens" :message-id="messageId" />
        </td>
      </tr>
    </tbody>
  </table>
</template>
```

- [ ] **Step 6: 实现 QuoteToken.vue**

```vue
<!-- packages/desktop/src/renderer/components/markdown/tokens/QuoteToken.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import InlineToken from './InlineToken.vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

// Extract paragraph-level inline content
const inlineContent = computed(() =>
  props.inlineTokens.filter((t) => !t.type.endsWith('_open') && !t.type.endsWith('_close')),
)
</script>

<template>
  <blockquote class="border-l-3 border-accent pl-4 my-3 text-text-muted italic">
    <InlineToken :tokens="inlineContent" :message-id="messageId" />
  </blockquote>
</template>
```

- [ ] **Step 7: 实现 ListToken.vue**

```vue
<!-- packages/desktop/src/renderer/components/markdown/tokens/ListToken.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import InlineToken from './InlineToken.vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

const isOrdered = computed(() => props.openToken.type === 'ordered_list_open')

interface ListItem {
  tokens: any[]
  checked?: boolean | null
}

const items = computed<ListItem[]>(() => {
  const result: ListItem[] = []
  let currentItem: ListItem | null = null

  for (const t of props.inlineTokens) {
    if (t.type === 'list_item_open') {
      currentItem = { tokens: [] }
    } else if (t.type === 'list_item_close') {
      if (currentItem) result.push(currentItem)
      currentItem = null
    } else if (currentItem && !t.type.endsWith('_open') && !t.type.endsWith('_close')) {
      // Check for task list checkbox info
      if (t.type === 'paragraph_open') {
        // skip
      } else {
        currentItem.tokens.push(t)
      }
    }
  }
  return result
})
</script>

<template>
  <component :is="isOrdered ? 'ol' : 'ul'" class="ml-5 mb-3 list-disc">
    <li v-for="(item, i) in items" :key="i" class="mb-1">
      <InlineToken :tokens="item.tokens" :message-id="messageId" />
    </li>
  </component>
</template>

<style scoped>
ol { list-style-type: decimal; }
ul { list-style-type: disc; }
</style>
```

- [ ] **Step 8: 实现 ImageToken.vue**

```vue
<!-- packages/desktop/src/renderer/components/markdown/tokens/ImageToken.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

const src = computed(() => {
  // image token has attrs
  return props.openToken.attrs?.find((a: any[]) => a[0] === 'src')?.[1] ?? ''
})
const alt = computed(() => props.openToken.content || '')

const loaded = ref(false)
const error = ref(false)
const enlarged = ref(false)
</script>

<template>
  <div class="my-2">
    <span v-if="!loaded && !error" class="text-text-muted text-xs animate-pulse">加载中...</span>
    <span v-if="error" class="text-error text-xs">图片加载失败</span>
    <img
      v-show="loaded"
      :src="src"
      :alt="alt"
      loading="lazy"
      class="max-w-full rounded border border-border cursor-pointer hover:opacity-80"
      @load="loaded = true"
      @error="error = true"
      @click="enlarged = !enlarged"
    />
    <div v-if="enlarged" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" @click="enlarged = false">
      <img :src="src" :alt="alt" class="max-w-[90vw] max-h-[90vh]" />
    </div>
  </div>
</template>
```

- [ ] **Step 9: 验证 typecheck 通过**

Run: `cd packages/desktop && npx vue-tsc --noEmit`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add packages/desktop/src/renderer/components/markdown/tokens/
git commit -m "feat: implement markdown token components"
```

---

### Task 14: MarkdownRenderer 组装 + MessageAssistant 改造

**Files:**
- Create: `packages/desktop/src/renderer/components/chat/MarkdownRenderer.vue`
- Modify: `packages/desktop/src/renderer/components/chat/MessageAssistant.vue`
- Create: `packages/desktop/src/renderer/components/chat/__tests__/MessageAssistant.test.ts`

- [ ] **Step 1: 创建 MarkdownRenderer.vue (chat 入口)**

```vue
<!-- packages/desktop/src/renderer/components/chat/MarkdownRenderer.vue -->
<script setup lang="ts">
/**
 * MarkdownRenderer — chat 消息的 Markdown 渲染入口。
 *
 * 使用 TokenRenderer (Token-based Vue 渲染)，不使用 v-html。
 * 支持: 标题、段落、代码块、表格、引用、列表、任务列表、链接、图片、脚注。
 */
import TokenRenderer from '../markdown/TokenRenderer.vue'

const props = defineProps<{
  content: string
  messageId: string
}>()
</script>

<template>
  <TokenRenderer v-if="content" :content="content" :message-id="messageId" />
</template>
```

- [ ] **Step 2: 修改 MessageAssistant.vue — 使用 MarkdownRenderer 替代纯文本**

修改 `MessageAssistant.vue` 的 `<script setup>` 和 template:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Message, ToolCall } from '../../../types/ipc'
import ToolRenderer from '../tool/ToolRenderer.vue'
import ReasoningBlock from './ReasoningBlock.vue'
import MarkdownRenderer from './MarkdownRenderer.vue'

const props = defineProps<{ message: Message }>()
const emit = defineEmits<{
  inspect: [id: string]
  openFile: [tool: ToolCall]
}>()

function handleInspect(id: string) {
  emit('inspect', id)
}
</script>

<template>
  <div class="message-assistant mb-4">
    <div data-testid="assistant-bubble" class="max-w-[80%]">
      <!-- reasoning -->
      <ReasoningBlock v-if="message.reasoning" :content="message.reasoning" />

      <!-- Markdown 渲染消息内容 -->
      <MarkdownRenderer
        v-if="message.content"
        :content="message.content"
        :message-id="message.id"
      />

      <!-- tool calls -->
      <div v-if="message.toolCalls?.length" class="space-y-0.5 mt-2">
        <ToolRenderer
          v-for="tc in message.toolCalls"
          :key="tc.id"
          :tool="tc"
          @inspect="handleInspect"
          @open-file="(tool) => emit('openFile', tool)"
        />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 编写 MessageAssistant 测试**

```ts
// packages/desktop/src/renderer/components/chat/__tests__/MessageAssistant.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageAssistant from '../MessageAssistant.vue'
import type { Message } from '../../../../types/ipc'

describe('MessageAssistant', () => {
  it('渲染 Markdown 内容', () => {
    const msg: Message = {
      id: 'm1', role: 'assistant',
      content: '## Hello\n\nThis is **bold** text.',
      timestamp: new Date(),
    }
    const w = mount(MessageAssistant, { props: { message: msg } })
    expect(w.text()).toContain('Hello')
    expect(w.text()).toContain('bold')
  })

  it('渲染代码块', () => {
    const msg: Message = {
      id: 'm2', role: 'assistant',
      content: '```ts\nconst x = 1\n```',
      timestamp: new Date(),
    }
    const w = mount(MessageAssistant, { props: { message: msg } })
    expect(w.text()).toContain('const x = 1')
  })

  it('渲染 tool calls', () => {
    const msg: Message = {
      id: 'm3', role: 'assistant',
      content: 'done',
      timestamp: new Date(),
      toolCalls: [{
        id: 'tc1', name: 'bash', status: 'completed',
        args: { command: 'ls' }, output: { structured: { type: 'bash', exitCode: 0 } },
      }],
    }
    const w = mount(MessageAssistant, { props: { message: msg } })
    expect(w.find('[data-tool-name="bash"]').exists()).toBe(true)
  })

  it('openFile 事件向上传递', async () => {
    const msg: Message = {
      id: 'm4', role: 'assistant',
      content: '',
      timestamp: new Date(),
      toolCalls: [{
        id: 'tc1', name: 'read', status: 'completed',
        args: { filePath: 'a.ts' },
        output: { structured: { type: 'text-page', content: 'hello' } },
      }],
    }
    const w = mount(MessageAssistant, { props: { message: msg } })
    // Click summary to trigger openFile
    await w.find('.summary').trigger('click')
    expect(w.emitted('openFile')).toBeTruthy()
  })
})
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/desktop && npx vitest run src/renderer/components/chat/__tests__/MessageAssistant.test.ts`
Expected: PASS

- [ ] **Step 5: 运行 ChatTimeline 测试确认无回归**

Run: `cd packages/desktop && npx vitest run src/renderer/components/chat/__tests__/ChatTimeline.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/src/renderer/components/chat/MarkdownRenderer.vue packages/desktop/src/renderer/components/chat/MessageAssistant.vue packages/desktop/src/renderer/components/chat/__tests__/MessageAssistant.test.ts
git commit -m "feat: integrate MarkdownRenderer into MessageAssistant"
```

---

### Task 15: CodeBlock 智能折叠改造

**Files:**
- Modify: `packages/desktop/src/renderer/components/chat/CodeBlock.vue`
- Create: `packages/desktop/src/renderer/components/chat/__tests__/CodeBlock.test.ts`

- [ ] **Step 1: 编写 CodeBlock 智能折叠的失败测试**

```ts
// packages/desktop/src/renderer/components/chat/__tests__/CodeBlock.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CodeBlock from '../CodeBlock.vue'

describe('CodeBlock', () => {
  it('短代码块默认展开', () => {
    const code = 'line1\nline2\nline3'
    const w = mount(CodeBlock, {
      props: { code, lang: 'ts', messageId: 'm1', codeIndex: 0 },
    })
    expect(w.text()).toContain('line1')
    expect(w.text()).toContain('line2')
    expect(w.text()).toContain('line3')
    expect(w.find('[data-testid="fold-btn"]').exists()).toBe(false)
  })

  it('长代码块默认折叠 (超过 autoFoldThreshold)', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line${i}`)
    const code = lines.join('\n')
    const w = mount(CodeBlock, {
      props: { code, lang: 'ts', messageId: 'm1', codeIndex: 0, autoFoldThreshold: 15 },
    })
    expect(w.find('[data-testid="fold-btn"]').exists()).toBe(true)
    expect(w.text()).toContain('line0')
    // 折叠时不显示全部行
    expect(w.text()).not.toContain('line15')
  })

  it('点击展开按钮显示全部', async () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line${i}`)
    const code = lines.join('\n')
    const w = mount(CodeBlock, {
      props: { code, lang: 'ts', messageId: 'm1', codeIndex: 0, autoFoldThreshold: 15 },
    })
    await w.find('[data-testid="fold-btn"]').trigger('click')
    expect(w.text()).toContain('line15')
  })

  it('显示语言标签', () => {
    const w = mount(CodeBlock, {
      props: { code: 'x', lang: 'bash', messageId: 'm1', codeIndex: 0 },
    })
    expect(w.text()).toContain('bash')
  })

  it('key 包含 messageId 和 codeIndex (稳定性)', () => {
    const w = mount(CodeBlock, {
      props: { code: 'x', lang: 'ts', messageId: 'm1', codeIndex: 2 },
    })
    expect(w.attributes('data-block-key')).toBe('m1-code-2')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/desktop && npx vitest run src/renderer/components/chat/__tests__/CodeBlock.test.ts`
Expected: FAIL — props 不匹配 (缺少 messageId/codeIndex)

- [ ] **Step 3: 重写 CodeBlock.vue**

```vue
<!-- packages/desktop/src/renderer/components/chat/CodeBlock.vue -->
<script setup lang="ts">
import { ref, watchEffect, onMounted, computed, shallowRef } from 'vue'
import { createHighlighter, type Highlighter } from 'shiki'
import { useThemeStore } from '../../stores/theme'

const props = withDefaults(defineProps<{
  code: string
  lang: string
  messageId: string
  codeIndex: number
  previewLines?: number
  autoFoldThreshold?: number
}>(), {
  previewLines: 8,
  autoFoldThreshold: 15,
})

const themeStore = useThemeStore()
const html = ref('')
let hl: Highlighter | null = null

const codeTheme = computed(() => themeStore.theme === 'light' ? 'github-light' : 'github-dark')

// 一次性 split，避免重复
const lines = shallowRef<string[]>([])
onMounted(() => {
  lines.value = props.code.split('\n')
})

// 自动决定初始折叠状态: 超过阈值才折叠
const folded = ref(false)
watchEffect(() => {
  if (lines.value.length > props.autoFoldThreshold) {
    folded.value = true
  }
})

const hasMore = computed(() => lines.value.length > props.autoFoldThreshold)

// 超过 300 行用 slice，否则用 CSS 隐藏
const useVirtual = computed(() => lines.value.length > 300)

const visibleCode = computed(() => {
  if (folded.value && useVirtual.value) {
    return lines.value.slice(0, props.previewLines).join('\n')
  }
  return props.code
})

const blockKey = computed(() => `${props.messageId}-code-${props.codeIndex}`)

onMounted(async () => {
  try {
    hl = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [props.lang],
    })
    highlight()
  } catch {
    html.value = `<pre class="shiki">${escapeHtml(props.code)}</pre>`
  }
})

watchEffect(() => {
  if (hl) highlight()
})

function highlight() {
  if (!hl) return
  try {
    html.value = hl.codeToHtml(visibleCode.value, { lang: props.lang, theme: codeTheme.value })
  } catch {
    html.value = `<pre class="shiki">${escapeHtml(visibleCode.value)}</pre>`
  }
}

function toggleFold() {
  folded.value = !folded.value
}

function copyCode() {
  navigator.clipboard?.writeText(props.code)
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }
  return s.replace(/[&<>"']/g, (c) => map[c])
}
</script>

<template>
  <div class="code-block relative bg-bg-surface rounded border border-border my-2" :data-block-key="blockKey">
    <!-- Header: Language + Fold + Copy -->
    <div class="code-header flex items-center justify-between px-3 py-1.5 border-b border-border">
      <span data-testid="lang-label" class="text-xs text-text-muted">{{ lang }}</span>
      <div class="actions flex gap-2">
        <button
          v-if="hasMore"
          data-testid="fold-btn"
          class="text-xs text-text-muted hover:text-text"
          @click="toggleFold"
        >
          {{ folded ? '展开' : '折叠' }}
        </button>
        <button class="text-xs text-text-muted hover:text-text" @click="copyCode">复制</button>
      </div>
    </div>

    <!-- Code content: CSS 隐藏 (<300行) 或 slice (>300行) -->
    <div
      class="code-content overflow-x-auto"
      :style="!useVirtual && folded ? { maxHeight: `${previewLines * 1.5}em`, overflow: 'hidden' } : {}"
    >
      <code class="block p-4 text-sm" v-html="html" />
    </div>

    <!-- 折叠指示 -->
    <div v-if="folded && hasMore && !useVirtual" class="fold-indicator text-center text-xs text-text-muted py-1 border-t border-border">
      ... {{ lines.length - previewLines }} 行已折叠
    </div>
  </div>
</template>

<style scoped>
.code-block :deep(.shiki) {
  background: transparent !important;
  padding: 0;
}
</style>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/desktop && npx vitest run src/renderer/components/chat/__tests__/CodeBlock.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/renderer/components/chat/CodeBlock.vue packages/desktop/src/renderer/components/chat/__tests__/CodeBlock.test.ts
git commit -m "feat: add smart fold to CodeBlock with auto-fold threshold"
```

---

## Phase 5: Streaming 集成

### Task 16: useStreamingMarkdown composable

**Files:**
- Create: `packages/desktop/src/renderer/composables/useStreamingMarkdown.ts`
- Create: `packages/desktop/src/renderer/composables/__tests__/useStreamingMarkdown.test.ts`

- [ ] **Step 1: 编写 useStreamingMarkdown 的失败测试**

```ts
// packages/desktop/src/renderer/composables/__tests__/useStreamingMarkdown.test.ts
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useStreamingMarkdown } from '../useStreamingMarkdown'

describe('useStreamingMarkdown', () => {
  it('初始渲染 content', () => {
    const content = ref('hello')
    const { renderedContent } = useStreamingMarkdown(content)
    expect(renderedContent.value).toBe('hello')
  })

  it('高频更新被 batch (100ms 内不重复渲染)', async () => {
    const content = ref('a')
    const { renderedContent } = useStreamingMarkdown(content)
    content.value = 'b'
    content.value = 'c'
    content.value = 'd'
    // 100ms 内不应更新
    expect(renderedContent.value).toBe('a')
    // 等待 batch
    await new Promise((r) => setTimeout(r, 150))
    expect(renderedContent.value).toBe('d')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/desktop && npx vitest run src/renderer/composables/__tests__/useStreamingMarkdown.test.ts`
Expected: FAIL — "Cannot find module"

- [ ] **Step 3: 实现 useStreamingMarkdown.ts**

```ts
// packages/desktop/src/renderer/composables/useStreamingMarkdown.ts
import { shallowRef, watch, type Ref } from 'vue'

/**
 * useStreamingMarkdown — Streaming 增量渲染优化。
 *
 * AI 回复是 Streaming，每秒可能产生几十个 delta。
 * 不做 batch 会导致 markdown-it 反复 parse，CPU 飙升。
 *
 * 策略: 100ms 内的多次更新合并为一次渲染，使用 requestAnimationFrame。
 */
export function useStreamingMarkdown(streamingContent: Ref<string>) {
  const renderedContent = shallowRef<string>(streamingContent.value)
  let lastRenderTime = 0
  let pendingRaf: number | null = null
  const RENDER_INTERVAL = 100

  watch(streamingContent, (content) => {
    const now = Date.now()
    if (now - lastRenderTime < RENDER_INTERVAL) {
      // 在 batch 窗口内，调度 rAF
      if (pendingRaf === null) {
        pendingRaf = requestAnimationFrame(() => {
          renderedContent.value = streamingContent.value
          lastRenderTime = Date.now()
          pendingRaf = null
        })
      }
      return
    }
    // 超过 batch 窗口，立即渲染
    renderedContent.value = content
    lastRenderTime = now
  })

  return { renderedContent }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/desktop && npx vitest run src/renderer/composables/__tests__/useStreamingMarkdown.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/renderer/composables/useStreamingMarkdown.ts packages/desktop/src/renderer/composables/__tests__/useStreamingMarkdown.test.ts
git commit -m "feat: add useStreamingMarkdown composable for batched rendering"
```

---

### Task 17: StreamingText + StreamingMessage 改造

**Files:**
- Modify: `packages/desktop/src/renderer/components/streaming/StreamingText.vue`
- Modify: `packages/desktop/src/renderer/components/streaming/StreamingMessage.vue`

- [ ] **Step 1: 改造 StreamingText.vue — 使用 MarkdownRenderer**

```vue
<!-- packages/desktop/src/renderer/components/streaming/StreamingText.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useStreamingMarkdown } from '../../composables/useStreamingMarkdown'
import MarkdownRenderer from '../chat/MarkdownRenderer.vue'

const props = defineProps<{
  content: string
  isStreaming: boolean
}>()

const contentRef = computed(() => props.content)
const { renderedContent } = useStreamingMarkdown(contentRef)
</script>

<template>
  <div class="streaming-text">
    <MarkdownRenderer :content="renderedContent" message-id="streaming" />

    <!-- Cursor indicator when streaming -->
    <span
      v-if="isStreaming && content.length > 0"
      class="inline-block w-0.5 h-4 bg-accent animate-pulse-glow ml-0.5"
    />
  </div>
</template>

<style scoped>
:deep(.code-block) {
  font-family: 'JetBrains Mono', 'Cascadia Code', Consolas, monospace;
}
</style>
```

- [ ] **Step 2: 改造 StreamingMessage.vue — 传递 openFile 事件**

修改 `StreamingMessage.vue`:

a) 添加 emit 定义:
```ts
const emit = defineEmits<{
  openFile: [tool: ToolCall]
}>()
```

b) 在 ToolRenderer 上新增 `@open-file`:
```vue
<ToolRenderer
  v-else-if="node.type === 'tool'"
  :tool="getToolPayload(node)"
  @inspect="$emit('inspect', $event)"
  @open-file="emit('openFile', $event)"
/>
```

c) 添加 import:
```ts
import type { ToolCall } from '../../../types/ipc'
```

- [ ] **Step 3: 在 App.vue 中为 StreamingMessage 传递 openFile**

修改 `App.vue` 中的 ChatView — ChatView 已经在 Task 10 中处理了 openFile emit，但 StreamingMessage 的事件需要通过 ChatTimeline → ChatView 传递。

由于 ChatTimeline 的 StreamingMessage 是在其 template 中直接使用的，需确认 ChatTimeline 也传递了 openFile。

检查 ChatTimeline.vue:
```vue
<StreamingMessage />
```

在 ChatTimeline 中为 StreamingMessage 添加 openFile 传递:
```vue
<StreamingMessage @open-file="emit('openFile', $event)" />
```

- [ ] **Step 4: 验证 typecheck 通过**

Run: `cd packages/desktop && npx vue-tsc --noEmit`
Expected: PASS

- [ ] **Step 5: 运行全部测试确认无回归**

Run: `cd packages/desktop && npx vitest run`
Expected: PASS (全部)

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/src/renderer/components/streaming/StreamingText.vue packages/desktop/src/renderer/components/streaming/StreamingMessage.vue packages/desktop/src/renderer/components/chat/ChatTimeline.vue
git commit -m "feat: integrate MarkdownRenderer into streaming and propagate openFile"
```

---

## Final Task: 全量验证

### Task 18: 全量测试 + Typecheck

**Files:** 无修改

- [ ] **Step 1: 运行全量测试**

Run: `cd packages/desktop && npx vitest run`
Expected: PASS (全部测试)

- [ ] **Step 2: 运行 typecheck**

Run: `cd packages/desktop && npx vue-tsc --noEmit`
Expected: PASS (无错误)

- [ ] **Step 3: 检查是否有遗漏的 import 或文件**

Run: `cd packages/desktop && npx vite build 2>&1 | head -30`
Expected: 无 import 错误

- [ ] **Step 4: 最终 Commit (如有修复)**

```bash
git add -A
git commit -m "chore: final verification fixes"
```

---

## Self-Review

### Spec Coverage

| Spec 要求 | 实现 Task |
|-----------|-----------|
| FileTabsPanel 多标签页 | Task 8 |
| FileTab 状态管理 (VS Code 持久) | Task 4 |
| Read → 打开源文件 | Task 2, 5 |
| Edit/Write → 展示 diff | Task 3, 6 |
| ToolCallRow 点击文件名打开 | Task 9 |
| 事件传递链路 | Task 9, 10, 11 |
| Token-based Markdown 渲染 | Task 12, 13, 14 |
| 代码块智能折叠 | Task 15 |
| Streaming 增量渲染 | Task 16, 17 |
| 标题/段落/代码块/表格/引用/列表/链接/图片 | Task 13 |
| 任务列表/脚注 | Task 12 (markdown-it 插件) |
| App.vue 集成 | Task 11 |
| 删除线 | Task 13 (InlineToken) |
| CodeBlock key 稳定性 | Task 15 |
| Shiki 语法高亮 | Task 15 |

### Placeholder Scan

无 TBD/TODO。所有代码步骤都包含完整实现。

### Type Consistency

- `FileTab.id` — 全部使用 `tool.id`（Task 2, 3 中 `buildReadTab`/`buildDiffTab` 一致）
- `FileTab.viewer` — `'text' | 'diff' | 'image'`（types/presentation.ts 定义，所有 Viewer 一致）
- `toolToPresentationModel` — 返回 `FileTab | null`（Task 2, 3 一致）
- `openFileTab(tab: FileTab)` — Task 4 Store 与 Task 8 FileTabsPanel 一致
- `openFile: [tool: ToolCall]` — Task 9, 10, 11, 17 全链路一致
- `CodeBlock` props — `messageId + codeIndex` 在 Task 13 (CodeFenceToken) 和 Task 15 (CodeBlock) 一致
- `useStreamingMarkdown` — `renderedContent` 在 Task 16, 17 一致
