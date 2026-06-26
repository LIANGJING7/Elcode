import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '../ui'

describe('uiStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts in welcome when no prior view set', () => {
    const ui = useUiStore()
    expect(ui.view).toBe('welcome')
    expect(ui.previousView).toBe('welcome')
    expect(ui.settingsSection).toBe('appearance')
    expect(ui.artifactPanelOpen).toBe(false)
    expect(ui.hasUserClosedArtifactPanel).toBe(false)
    expect(ui.inspectorOpen).toBe(true)
    expect(ui.activeToolCallId).toBeNull()
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

  it('closeArtifactPanel 提示用户主动关后,压制未来自动展开', () => {
    const ui = useUiStore()
    ui.openArtifactPanelAutomatically()   // 首次 0→>0 触发
    expect(ui.artifactPanelOpen).toBe(true)
    ui.closeArtifactPanel()                // 用户主动收起
    expect(ui.artifactPanelOpen).toBe(false)
    expect(ui.hasUserClosedArtifactPanel).toBe(true)
    ui.openArtifactPanelAutomatically()   // 再次触发但被压制
    expect(ui.artifactPanelOpen).toBe(false)
    ui.openArtifactPanel()                 // 用户主动唤回
    expect(ui.artifactPanelOpen).toBe(true)
    expect(ui.hasUserClosedArtifactPanel).toBe(false)
  })

  it('resetForSession 切会话清锁,恢复自动展开默认', () => {
    const ui = useUiStore()
    ui.closeArtifactPanel()
    ui.resetForSession()
    expect(ui.hasUserClosedArtifactPanel).toBe(false)
    expect(ui.activeToolCallId).toBeNull()
  })
})