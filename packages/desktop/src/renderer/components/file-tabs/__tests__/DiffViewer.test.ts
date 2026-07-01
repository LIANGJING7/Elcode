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

  it('add 行有 data-line-type 属性', () => {
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
