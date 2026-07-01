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
