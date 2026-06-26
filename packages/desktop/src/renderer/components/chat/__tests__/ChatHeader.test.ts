import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ChatHeader from '../ChatHeader.vue'

describe('ChatHeader', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('标题点击切 inline rename 输入, 回车确认 emit rename', async () => {
    const w = mount(ChatHeader, { props: { title: 'old', sessionId: 's1' } })
    await w.find('[data-testid="title"]').trigger('click')
    expect(w.find('input[data-testid="rename-input"]').exists()).toBe(true)
    await w.find('input[data-testid="rename-input"]').setValue('new')
    await w.find('input[data-testid="rename-input"]').trigger('keyup.enter')
    expect(w.emitted('rename')).toBeTruthy()
    expect(w.emitted('rename')![0]).toEqual(['new'])
  })

  it('⋯ 菜单含复制/重命名/置顶/删除/导出 5 项', async () => {
    const w = mount(ChatHeader, { props: { title: 't', sessionId: 's1', pinned: false } })
    await w.find('[data-testid="menu-btn"]').trigger('click')
    const items = w.findAll('[data-testid="menu-item"]').map(b => b.text())
    expect(items).toEqual(expect.arrayContaining(['复制', '重命名', '置顶', '删除', '导出 Markdown']))
  })

  it('置顶状态切换显示取消置顶', async () => {
    const w = mount(ChatHeader, { props: { title: 't', sessionId: 's1', pinned: true } })
    await w.find('[data-testid="menu-btn"]').trigger('click')
    const pinItem = w.findAll('[data-testid="menu-item"]').find(b => b.text().includes('置顶'))
    expect(pinItem?.text()).toBe('取消置顶')
  })
})