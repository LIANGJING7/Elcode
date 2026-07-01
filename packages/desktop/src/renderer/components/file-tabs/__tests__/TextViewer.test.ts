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
