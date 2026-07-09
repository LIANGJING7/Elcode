import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FileTab, PanelTab } from '../types/presentation'
import { useSubagentStore } from './subagent'

export type View = 'welcome' | 'newSession' | 'chat' | 'skills' | 'mcp' | 'settings'
export type SettingsSection = 'models' | 'mcp' | 'skills'

export const useUiStore = defineStore('ui', () => {
  // 单一 source of truth: view. previousView 仅在进/出 settings 时记/读
  const view = ref<View>('welcome')
  const previousView = ref<View>('welcome')
  const settingsSection = ref<SettingsSection>('models')

  // 面板与导航 UI 态(均不污染 view 语义)
  const sidebarOpen = ref(true)

  // ===== PanelTabs 状态 (VS Code 风格持久标签页 - unified) =====
  const panelTabs = ref<PanelTab[]>([])
  const activePanelTabId = ref<string | null>(null)

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

  // ===== PanelTabs 方法 =====
  function openPanel(tab: PanelTab) {
    const existing = panelTabs.value.find((t) => t.id === tab.id && t.type === tab.type)
    if (existing) {
      activePanelTabId.value = tab.id
      return
    }
    panelTabs.value.push(tab)
    activePanelTabId.value = tab.id
  }

  function closePanel(tabId: string) {
    const idx = panelTabs.value.findIndex((t) => t.id === tabId)
    if (idx === -1) return
    
    const tab = panelTabs.value[idx]
    panelTabs.value.splice(idx, 1)
    
    // Recycle SubagentStore detail for subagent tabs
    if (tab.type === 'subagent') {
      useSubagentStore().removeDetail(tabId)
    }
    
    if (activePanelTabId.value === tabId) {
      const next = panelTabs.value[idx] ?? panelTabs.value[idx - 1]
      activePanelTabId.value = next?.id ?? null
    }
  }

  function selectPanelTab(id: string) {
    if (panelTabs.value.find((t) => t.id === id)) {
      activePanelTabId.value = id
    }
  }

  function closeAllPanelTabs() {
    panelTabs.value = []
    activePanelTabId.value = null
  }

  function updateFileTabViewerState(id: string, state: Partial<NonNullable<FileTab['viewerState']>>) {
    const tab = panelTabs.value.find((t) => t.id === id)
    if (tab && tab.type !== 'subagent') {
      (tab as FileTab).viewerState = { ...(tab as FileTab).viewerState, ...state }
    }
  }

  // ===== Backward Compatibility Aliases =====
  const fileTabs = computed(() => panelTabs.value.filter((t) => t.type !== 'subagent') as FileTab[])
  const activeFileTabId = computed(() => {
    const active = panelTabs.value.find((t) => t.id === activePanelTabId.value)
    return active?.type !== 'subagent' ? activePanelTabId.value : null
  })

  // 切会话时调用: 重置面板态
  // panelTabs 保持不变 — VS Code 风格持久标签页
  function resetForSession() {
    // 可根据需要重置 panelTabs 或保持持久
  }

  return {
    view, previousView, settingsSection,
    sidebarOpen,
    // New unified panel system
    panelTabs, activePanelTabId,
    openPanel, closePanel, selectPanelTab, closeAllPanelTabs,
    updateFileTabViewerState,
    // Backward compatibility aliases
    fileTabs, activeFileTabId,
    openFileTab: (tab: FileTab) => openPanel(tab),
    closeFileTab: (id: string) => closePanel(id),
    selectFileTab: (id: string) => selectPanelTab(id),
    closeAllFileTabs: () => closeAllPanelTabs(),
    // View methods
    setView, enterSettings, exitSettings, toggleSidebar,
    resetForSession,
  }
})