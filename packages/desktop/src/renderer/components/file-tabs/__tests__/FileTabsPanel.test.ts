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
