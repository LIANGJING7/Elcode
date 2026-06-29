import { defineStore } from 'pinia'
import { ref } from 'vue'

export type View = 'welcome' | 'newSession' | 'chat' | 'skills' | 'mcp' | 'settings'
export type SettingsSection = 'appearance' | 'models' | 'mcp' | 'skills'

export const useUiStore = defineStore('ui', () => {
  // 单一 source of truth: view. previousView 仅在进/出 settings 时记/读
  const view = ref<View>('welcome')
  const previousView = ref<View>('welcome')
  const settingsSection = ref<SettingsSection>('appearance')

  // 面板与导航 UI 态(均不污染 view 语义)
  const sidebarOpen = ref(true)
  const artifactPanelOpen = ref(false)
  const hasUserClosedArtifactPanel = ref(false)
  const inspectorOpen = ref(true)
  const activeToolCallId = ref<string | null>(null)

  function setView(v: View) {
    // setView 用于导航切主区视图(非 settings 进出);不动 previousView
    view.value = v
  }

  function enterSettings() {
    if (view.value === 'settings') return
    previousView.value = view.value
    view.value = 'settings'
  }

  function exitSettings() {
    if (view.value !== 'settings') return
    view.value = previousView.value
    // 出 settings 时若 previousView 已被改到 settings(异常态), 回退 welcome
    if (view.value === 'settings') view.value = 'welcome'
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  // 产物面板自动展开规则: 由 artifact store 调用"在 artifacts.length 0→>0 边界"
  // 只在 !hasUserClosedArtifactPanel 时真正开,否则无效
  function openArtifactPanelAutomatically() {
    if (hasUserClosedArtifactPanel.value) return
    artifactPanelOpen.value = true
  }

  // 用户主动收起 → 置 hasUserClosedArtifactPanel,压制未来自动展开
  function closeArtifactPanel() {
    artifactPanelOpen.value = false
    hasUserClosedArtifactPanel.value = true
  }

  // 用户主动唤回 → 清回 false
  function openArtifactPanel() {
    artifactPanelOpen.value = true
    hasUserClosedArtifactPanel.value = false
  }

  // 用户单独收起 Inspector(上层 Artifact 区不动)
  function toggleInspector() {
    inspectorOpen.value = !inspectorOpen.value
  }

  // 切会话时调用: 重置面板态(回到默认自动展开 + 无选中)
  function resetForSession() {
    hasUserClosedArtifactPanel.value = false
    artifactPanelOpen.value = false
    activeToolCallId.value = null
    inspectorOpen.value = true
  }

  return {
    view, previousView, settingsSection,
    sidebarOpen, artifactPanelOpen, hasUserClosedArtifactPanel, inspectorOpen, activeToolCallId,
    setView, enterSettings, exitSettings, toggleSidebar,
    openArtifactPanelAutomatically, closeArtifactPanel, openArtifactPanel, toggleInspector,
    resetForSession,
  }
})