# FileTabsPanel 与 MarkdownRenderer 设计文档

> 日期：2026-06-30
> 状态：Draft
> 范围：桌面端右侧面板重构为多文件标签页 + 对话消息 Markdown 渲染增强

---

## 1. 背景

当前桌面端右侧面板是单文件的 Inspector，每次只能查看一个工具调用详情。对话消息的 Markdown 渲染较为简单，代码块不支持折叠。

**用户需求：**
1. 右侧面板改成 VS Code 风格的多标签页（持久保留，可手动关闭）
2. 从工具调用区域点击文件名打开文件（Read → 源文件，Edit/Write → diff）
3. 对话消息支持完整 Markdown（表格、任务列表、脚注等）
4. 代码块智能折叠（超过阈值自动折叠）

---

## 2. 整体架构

### 三层分离架构

```
ToolCallRow (UI)
      │ emit(tool)
      ▼
ToolPresentationService (Adapter)
      │ toolToPresentationModel()
      ▼
FileTabManager (Store)
      │ open / activate / close
      ▼
FileTabsPanel (UI)
      │ <component :is="viewerComponent" />
      ▼
TextViewer / DiffViewer / ImageViewer
      │
      ▼
FileModel (Domain)
```

**核心原则：**
- ToolCallRow 只 emit，不解析 Tool
- Presentation Adapter 承担所有数据转换
- Viewer 零业务逻辑，纯渲染 + emit 交互事件
- FileTabsHeader 纯 Presentational Component，不直接操作 Store

---

## 3. 状态管理

### 3.1 FileModel 定义（Domain Model）

```ts
// types/presentation.ts

// ===== Base Types =====
interface BaseLine {
  id: string              // nanoid()，稳定标识
}

interface TextLine extends BaseLine {
  lineNumber: number
  text: string
  highlights?: HighlightRange[]  // 搜索高亮预留
}

interface DiffLine extends BaseLine {
  type: 'context' | 'add' | 'remove' | 'hunk' | 'meta'
  oldLine?: number        // 旧文件行号
  newLine?: number        // 新文件行号
  text: string            // 已去除 +/- 前缀的纯文本
}

interface HunkInfo {
  id: string
  startLine: number
  lines: DiffLine[]
  collapsed?: boolean     // 预留折叠状态
}

// ===== FileModel =====
interface ReadFileModel {
  _kind: 'read'
  filePath: string
  fileName: string        // 仅文件名，如 "main.ts"
  directory?: string      // 目录路径，如 "src/app/"
  lines: TextLine[]       // 预解析的行数组
  totalLines?: number
  truncated?: boolean
  lineStart?: number
  options: {
    wrap?: boolean        // 软换行
    showLineNumbers?: boolean
  }
}

interface DiffModel {
  _kind: 'diff'
  filePath: string
  fileName: string
  directory?: string
  hunks: HunkInfo[]
  lines: DiffLine[]       // 预解析的 diff 行
  statistics: {
    additions: number
    deletions: number
    filesChanged?: number
  }
  options: {
    mode: 'unified' | 'split'  // 预留 side-by-side
    showMeta?: boolean        // 是否显示 --- a/ +++ b/
    wrap?: boolean
  }
}

interface ImageModel {
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
```

### 3.2 FileTab 定义（UI State）

```ts
interface FileTab {
  id: string              // tool.id（唯一标识）
  title: string           // fileName（标签显示）
  subtitle?: string       // directory（目录路径）
  filePath: string        // 完整路径（悬停显示）
  viewer: 'text' | 'diff' | 'image'
  model: ReadFileModel | DiffModel | ImageModel
  status: 'loading' | 'ready' | 'error'
  dirty?: boolean         // 预留：未保存修改标记
  viewerState?: {
    scrollTop?: number
    cursorLine?: number
    foldedHunks?: string[]
  }
}
```

### 3.3 UI Store 扩展

```ts
// stores/ui.ts 扩展

export const useUiStore = defineStore('ui', () => {
  // ===== FileTabs 状态 =====
  const fileTabs = ref<FileTab[]>([])
  const activeFileTabId = ref<string | null>(null)
  const inspectorOpen = ref(true)  // 保留，用于 Glob/Grep inspect

  // ===== FileTabs 方法 =====
  function openFileTab(tab: FileTab) {
    const existing = fileTabs.value.find(t => t.id === tab.id)
    if (existing) {
      activeFileTabId.value = tab.id
      return
    }
    fileTabs.value.push(tab)
    activeFileTabId.value = tab.id
  }

  function selectFileTab(id: string) {
    const tab = fileTabs.value.find(t => t.id === id)
    if (tab) activeFileTabId.value = id
  }

  function closeFileTab(id: string) {
    const idx = fileTabs.value.findIndex(t => t.id === id)
    if (idx === -1) return
    fileTabs.value.splice(idx, 1)
    if (activeFileTabId.value === id) {
      // 优先右边，没有右边则左边
      const nextTab = fileTabs.value[idx] ?? fileTabs.value[idx - 1]
      activeFileTabId.value = nextTab?.id ?? null
    }
  }

  function closeAllFileTabs() {
    fileTabs.value = []
    activeFileTabId.value = null
  }

  function updateFileTabViewerState(id: string, state: Partial<FileTab['viewerState']>) {
    const tab = fileTabs.value.find(t => t.id === id)
    if (tab) {
      tab.viewerState = { ...tab.viewerState, ...state }
    }
  }

  return {
    fileTabs,
    activeFileTabId,
    inspectorOpen,
    openFileTab,
    selectFileTab,
    closeFileTab,
    closeAllFileTabs,
    updateFileTabViewerState,
  }
})
```

**生命周期策略：**
- 关闭 Tab 时 content 一起释放，不会累积内存
- 切换会话时不清空 fileTabs（VS Code 风格持久）
- MVP 不引入 Cache 层，后续根据 profiling 结果演进

---

## 4. Presentation Adapter

### 4.1 数据转换层

```ts
// services/tool-presentation.ts
import { nanoid } from 'nanoid'

function toolToPresentationModel(tool: ToolCall): FileTab | null {
  switch (tool.name) {
    case 'read':
      return toolToReadFileTab(tool)
    case 'edit':
      return toolToDiffFileTab(tool)
    case 'write':
      return toolToDiffFileTab(tool)
    default:
      return null  // Glob/Grep 等不打开 FileTab
  }
}

function toolToReadFileTab(tool: ToolCall): FileTab {
  const filePath = String(tool.args.filePath ?? tool.args.file ?? '')
  const content = extractReadContent(tool)
  const model = buildReadFileModel(filePath, content, tool)

  return {
    id: tool.id,
    title: model.fileName,
    subtitle: model.directory,
    filePath: model.filePath,
    viewer: 'text',
    model,
    status: tool.status === 'running' ? 'loading' : 'ready',
  }
}

function toolToDiffFileTab(tool: ToolCall): FileTab {
  const filePath = String(tool.args.filePath ?? tool.args.file ?? '')
  const diff = extractDiff(tool)
  const model = buildDiffModel(filePath, diff, tool)

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

function buildReadFileModel(filePath: string, content: string, tool: ToolCall): ReadFileModel {
  const lines = content.split('\n')
  const lineStart = (tool.args.offset as number) ?? 1

  const textLines: TextLine[] = lines.map((text, i) => ({
    id: nanoid(),
    lineNumber: lineStart + i,
    text,
  }))

  const parts = filePath.split('/')
  const fileName = parts.pop() ?? filePath
  const directory = parts.length > 0 ? parts.join('/') + '/' : undefined

  return {
    _kind: 'read',
    filePath,
    fileName,
    directory,
    lines: textLines,
    totalLines: tool.output?.structured?.totalLines ?? lines.length,
    truncated: tool.output?.structured?.truncated,
    lineStart,
    options: { wrap: false, showLineNumbers: true },
  }
}

function buildDiffModel(filePath: string, diff: string, tool: ToolCall): DiffModel {
  const lines = diff.split('\n')
  const diffLines: DiffLine[] = []
  const hunks: HunkInfo[] = []
  let currentHunk: HunkInfo | null = null
  let oldLine = 0
  let newLine = 0

  for (const rawLine of lines) {
    const id = nanoid()

    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    if (rawLine.startsWith('@@')) {
      const match = rawLine.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
      if (match) {
        oldLine = parseInt(match[1])
        newLine = parseInt(match[2])
      }
      currentHunk = { id: nanoid(), startLine: newLine, lines: [], collapsed: false }
      hunks.push(currentHunk!)
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
      const line = { id, type: 'add' as const, newLine, text: rawLine.slice(1) }
      diffLines.push(line)
      currentHunk?.lines.push(line)
      newLine++
      continue
    }

    // Remove line
    if (rawLine.startsWith('-')) {
      const line = { id, type: 'remove' as const, oldLine, text: rawLine.slice(1) }
      diffLines.push(line)
      currentHunk?.lines.push(line)
      oldLine++
      continue
    }

    // Context line
    const line = { id, type: 'context' as const, oldLine, newLine, text: rawLine }
    diffLines.push(line)
    currentHunk?.lines.push(line)
    oldLine++
    newLine++
  }

  const parts = filePath.split('/')
  const fileName = parts.pop() ?? filePath
  const directory = parts.length > 0 ? parts.join('/') + '/' : undefined

  return {
    _kind: 'diff',
    filePath,
    fileName,
    directory,
    hunks,
    lines: diffLines,
    statistics: {
      additions: diffLines.filter(l => l.type === 'add').length,
      deletions: diffLines.filter(l => l.type === 'remove').length,
    },
    options: { mode: 'unified', showMeta: true, wrap: false },
  }
}

// 辅助函数：从 ToolCall 提取 Read 内容
function extractReadContent(tool: ToolCall): string {
  const structured = tool.output?.structured
  if (structured && structured.type === 'read' && structured.content) {
    return structured.content
  }
  const result = tool.output?.result
  if (typeof result === 'string') return result
  if (result && typeof result === 'object' && result.content) {
    return result.content
  }
  return ''
}

// 辅助函数：从 ToolCall 提取 Diff
function extractDiff(tool: ToolCall): string {
  const structured = tool.output?.structured
  if (structured && structured.type === 'edit' && structured.diff) {
    return structured.diff
  }
  const result = tool.output?.result as { diff?: string } | undefined
  return result?.diff ?? ''
}
```

---

## 5. 组件设计

### 5.1 FileTabsPanel（右侧面板容器）

```vue
<!-- FileTabsPanel.vue -->
<template>
  <div class="file-tabs-panel w-96 flex flex-col min-h-0 border-l border-border">
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

### 5.2 FileTabsHeader（纯 Presentational）

```vue
<!-- FileTabsHeader.vue -->
<template>
  <div class="file-tabs-header flex items-center bg-bg-elevated border-b border-border">
    <div class="tabs-scroll flex-1 flex overflow-x-auto">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="tab.id === activeId ? 'bg-bg-surface font-medium' : ''"
        @click="emit('select', tab.id)"
      >
        <span>{{ tab.title }}</span>
        <span v-if="tab.subtitle" class="text-text-muted">{{ tab.subtitle }}</span>
        <span @click.stop="emit('close', tab.id)">✕</span>
      </button>
    </div>
    <button v-if="tabs.length > 1" @click="emit('closeAll')">关闭全部</button>
  </div>
</template>

<script setup>
const emit = defineEmits<{
  select: [id: string]
  close: [id: string]
  closeAll: []
}>()
</script>
```

### 5.3 TextViewer

```vue
<!-- TextViewer.vue -->
<template>
  <div class="text-viewer h-full flex flex-col">
    <div class="viewer-header px-3 py-2 text-xs border-b border-border bg-bg-surface">
      <slot name="toolbar">
        <span class="font-mono">
          <span class="text-text-primary">{{ model.fileName }}</span>
          <span v-if="model.directory" class="text-text-muted ml-1">{{ model.directory }}</span>
        </span>
        <span v-if="model.totalLines" class="ml-2">· {{ model.totalLines }} 行</span>
        <span v-if="model.truncated" class="ml-2 text-warning">· 截断</span>
      </slot>
    </div>
    <CodeLines
      :lines="model.lines"
      :line-no-width="lineNoWidth"
      :wrap="model.options.wrap"
      :show-line-numbers="model.options.showLineNumbers"
      class="flex-1 overflow-auto bg-code-bg"
      @scroll="emit('scroll', $event)"
      @select-line="emit('selectLine', $event)"
    >
      <template #line-extra="{ line }">
        <slot name="line-extra" :line="line" />
      </template>
    </CodeLines>
  </div>
</template>

<script setup>
const props = defineProps<{
  model: ReadFileModel
  status: 'loading' | 'ready' | 'error'
}>()

const emit = defineEmits<{
  scroll: [scrollTop: number]
  selectLine: [lineId: string]
}>()

// 行号宽度动态计算
const lineNoWidth = computed(() => {
  const maxLine = props.model.lines.length + (props.model.lineStart ?? 1)
  const digits = String(maxLine).length
  return `${digits + 1}ch`
})
</script>
```

### 5.4 CodeLines（预留 VirtualList）

```vue
<!-- CodeLines.vue -->
<template>
  <div
    class="code-lines font-mono text-sm"
    :class="wrap ? 'whitespace-pre-wrap' : 'whitespace-pre'"
    @scroll="emit('scroll', $event.target.scrollTop)"
  >
    <div
      v-for="line in lines"
      :key="line.id"
      class="code-line flex gap-3 px-3 py-0.5 hover:bg-bg-surface"
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

<script setup>
const props = defineProps<{
  lines: TextLine[]
  lineNoWidth?: string
  wrap?: boolean
  showLineNumbers?: boolean
}>()

const emit = defineEmits<{
  scroll: [scrollTop: number]
  selectLine: [lineId: string]
}>()
</script>
```

**后续演进：** `<CodeLines>` 可替换为 `<VirtualList>`，调用方无需修改。

### 5.5 DiffViewer

```vue
<!-- DiffViewer.vue -->
<template>
  <div class="diff-viewer h-full flex flex-col">
    <div class="viewer-header px-3 py-2 text-xs border-b border-border bg-bg-surface">
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
    <div class="diff-lines flex-1 overflow-auto bg-code-bg font-mono text-sm">
      <div
        v-for="line in visibleLines"
        :key="line.id"
        :class="['diff-line px-3 py-0.5', LINE_STYLE_MAP[line.type]]"
      >
        <div v-if="model.options.mode === 'unified'" class="flex gap-3">
          <span v-if="line.oldLine" class="w-8 text-right text-text-muted">{{ line.oldLine }}</span>
          <span v-else class="w-8"></span>
          <span v-if="line.newLine" class="w-8 text-right text-text-muted">{{ line.newLine }}</span>
          <span v-else class="w-8"></span>
          <pre class="line-text whitespace-pre">{{ line.text }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps<{
  model: DiffModel
  status: 'loading' | 'ready' | 'error'
}>()

const visibleLines = computed(() =>
  props.model.options.showMeta
    ? props.model.lines
    : props.model.lines.filter(l => l.type !== 'meta')
)

const LINE_STYLE_MAP: Record<DiffLine['type'], string> = {
  add: 'bg-success/15 text-success',
  remove: 'bg-error/15 text-error',
  context: 'text-text-secondary',
  hunk: 'bg-accent-muted/20 text-accent-muted',
  meta: 'text-text-muted',
}
</script>
```

---

## 6. MarkdownRenderer 设计

### 6.1 Token-based Vue 渲染

**核心思路：** 不用 `v-html`，而是 `markdown-it.parse()` → Token[] → Vue Component

```
Markdown
    ↓
markdown-it.parse()
    ↓
Token[] (AST)
    ↓
TokenRenderer.vue
    ↓
Vue Components (Heading, Paragraph, CodeBlock, ...)
```

### 6.2 第一阶段插件

```ts
import MarkdownIt from 'markdown-it'
import markdownItTaskLists from 'markdown-it-task-lists'
import markdownItFootnote from 'markdown-it-footnote'

const md = new MarkdownIt({ html: false, linkify: true })
  .use(markdownItTaskLists)
  .use(markdownItFootnote)

// 后续阶段：math, mermaid, emoji, container
```

### 6.3 Streaming 增量渲染优化

```ts
// composables/useStreamingMarkdown.ts
export function useStreamingMarkdown(streamingContent: Ref<string>) {
  const renderedContent = shallowRef<string>('')
  let lastRenderTime = 0
  const RENDER_INTERVAL = 100  // 100ms batch

  watch(streamingContent, (content) => {
    const now = Date.now()
    if (now - lastRenderTime < RENDER_INTERVAL) return
    lastRenderTime = now

    requestAnimationFrame(() => {
      renderedContent.value = content
    })
  })

  return { renderedContent }
}
```

---

## 7. CodeBlock 设计

### 7.1 智能折叠

```ts
interface CodeBlockProps {
  code: string
  lang: string
  messageId: string
  codeIndex: number
  previewLines?: number      // 默认 8
  autoFoldThreshold?: number // 默认 15
}
```

**逻辑：**
- 超过 `autoFoldThreshold` 行自动折叠
- 折叠时显示 `previewLines` 行
- `<300 行`：CSS 隐藏（保留完整 DOM）
- `>300 行`：slice 渲染（减少 DOM 数量）

### 7.2 组件稳定性

```ts
const blockKey = computed(() => `${props.messageId}-code-${props.codeIndex}`)
```

确保 Streaming 时 CodeBlock 不销毁重建，保留 folded/scroll 状态。

---

## 8. 事件传递链路

```
ToolCallRow.vue
      │ @click.summary → emit('openFile', tool)
      │
      ▼
ToolRenderer.vue
      │ @open-file → emit('openFile', $event)
      │
      ▼
MessageAssistant.vue
      │ @open-file → emit('openFile', $event)
      │
      ▼
ChatTimeline.vue
      │ @open-file → emit('openFile', $event)
      │
      ▼
ChatView.vue
      │ @open-file → emit('openFile', $event)
      │
      ▼
App.vue
      │ handleOpenFile(tool)
      │
      ├─── toolToPresentationModel(tool) → FileTab
      │
      └─── ui.openFileTab(tab)
              │
              ▼
          FileTabsPanel.vue
```

---

## 9. 文件改动清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `stores/ui.ts` | 扩展 | FileTab 状态和方法 |
| `services/tool-presentation.ts` | 新增 | Presentation Adapter |
| `types/presentation.ts` | 新增 | FileModel / FileTab 类型 |
| `App.vue` | 改造 | 替换 Inspector，处理 openFile |
| `components/file-tabs/FileTabsPanel.vue` | 新增 | 右侧面板容器 |
| `components/file-tabs/FileTabsHeader.vue` | 新增 | 标签栏 |
| `components/file-tabs/TextViewer.vue` | 新增 | 文件内容展示 |
| `components/file-tabs/DiffViewer.vue` | 新增 | Diff 展示 |
| `components/file-tabs/ImageViewer.vue` | 新增 | 图片展示 |
| `components/file-tabs/CodeLines.vue` | 新增 | 代码行渲染 |
| `components/tool/ToolRenderer.vue` | 改造 | 新增 openFile emit |
| `components/tool/ToolCallRow.vue` | 改造 | summary 点击 emit openFile |
| `components/chat/MessageAssistant.vue` | 改造 | MarkdownRenderer，传递 openFile |
| `components/chat/MarkdownRenderer.vue` | 新增 | Token-based Markdown |
| `components/chat/CodeBlock.vue` | 改造 | 智能折叠 |

---

## 10. 后续演进路线

**P1（下一版本）：**
- VirtualList 替换 CodeLines（超长文件优化）
- Side-by-side Diff 模式
- 搜索高亮定位

**P2（未来）：**
- Reopen 已关闭 Tab
- Pin Tab
- Workspace History
- 磁盘缓存层

---

## 11. 参考资料

- VS Code Tab 设计
- Cursor File Panel
- Claude Code Desktop Inspector
- Shiki Syntax Highlighting