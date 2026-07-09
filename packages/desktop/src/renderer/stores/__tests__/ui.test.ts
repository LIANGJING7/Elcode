import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '../ui'

describe('uiStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts in welcome when no prior view set', () => {
    const ui = useUiStore()
    expect(ui.view).toBe('welcome')
    expect(ui.previousView).toBe('welcome')
    expect(ui.settingsSection).toBe('models')
    expect(ui.sidebarOpen).toBe(true)
  })

  it('enterSettings / exitSettings 借 previousView 还原 view', () => {
    const ui = useUiStore()
    ui.view = 'chat'
    ui.enterSettings()
    expect(ui.view).toBe('settings')
    expect(ui.previousView).toBe('chat')
    ui.exitSettings()
    expect(ui.view).toBe('chat')
    // 再次从 skills 进 settings,退出回 skills(不是默认 chat)
    ui.view = 'skills'
    ui.enterSettings()
    ui.exitSettings()
    expect(ui.view).toBe('skills')
  })

  it('setView 切主区视图,不污染 previousView(scene: 非设置态下导航)', () => {
    const ui = useUiStore()
    ui.setView('chat')
    expect(ui.view).toBe('chat')
    expect(ui.previousView).toBe('welcome')  // setView 不动 previousView,只在 enterSettings 时记录
    ui.setView('skills')
    expect(ui.view).toBe('skills')
    expect(ui.previousView).toBe('welcome')
  })

  it('toggleSidebar 后再开,持久 previousView 不变', () => {
    const ui = useUiStore()
    ui.setView('chat')
    ui.toggleSidebar()
    expect(ui.sidebarOpen).toBe(false)
    ui.toggleSidebar()
    expect(ui.sidebarOpen).toBe(true)
    // sidebar 是独立 UI 态,不动 view/previousView
    expect(ui.view).toBe('chat')
  })
})

import type { Component } from 'vue'
import { markRaw } from 'vue'
import type { FileTab, ReadFileModel } from '../../types/presentation'
import TextViewer from '../../components/file-tabs/TextViewer.vue'

const TextViewerRaw = markRaw(TextViewer)

function makeFakeTab(id: string, filePath: string = 'src/app.ts'): FileTab {
  const parts = filePath.split('/')
  const fileName = parts.pop() ?? filePath
  const directory = parts.length > 0 ? parts.join('/') + '/' : undefined
  const model: ReadFileModel = {
    _kind: 'read',
    filePath,
    fileName,
    directory,
    lines: [],
    totalLines: 0,
    truncated: false,
    lineStart: 0,
    options: { wrap: false, showLineNumbers: true },
  }
  return {
    type: 'file',
    id,
    title: fileName,
    subtitle: directory,
    filePath,
    component: TextViewerRaw,
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

  it('closeFileTab 关闭当前激活 tab，切换到相邻', () => {
    const ui = useUiStore()
    ui.openFileTab(makeFakeTab('t1'))
    ui.openFileTab(makeFakeTab('t2'))
    ui.openFileTab(makeFakeTab('t3'))
    expect(ui.activeFileTabId).toBe('t3')
    ui.closeFileTab('t3') // 关闭当前
    expect(ui.activeFileTabId).toBe('t2') // 切换到相邻（t3 在末尾，无右侧 → 左侧 t2）
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