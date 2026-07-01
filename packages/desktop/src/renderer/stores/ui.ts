import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FileTab } from '../types/presentation'

export type View = 'welcome' | 'newSession' | 'chat' | 'skills' | 'mcp' | 'settings'
export type SettingsSection = 'appearance' | 'models' | 'mcp' | 'skills'

export const useUiStore = defineStore('ui', () => {
  // 单一 source of truth: view. previousView 仅在进/出 settings 时记/读
  const view = ref<View>('welcome')
  const previousView = ref<View>('welcome')
  const settingsSection = ref<SettingsSection>('appearance')

  // 面板与导航 UI 态(均不污染 view 语义)
  const sidebarOpen = ref(true)

  // ===== FileTabs 状态 (VS Code 风格持久标签页) =====
  const fileTabs = ref<FileTab[]>([])
  const activeFileTabId = ref<string | null>(null)

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

  // ===== FileTabs 方法 =====
  function openFileTab(tab: FileTab) {
    const existing = fileTabs.value.find((t) => t.id === tab.id)
    if (existing) {
      activeFileTabId.value = tab.id
      return
    }
    fileTabs.value.push(tab)
    activeFileTabId.value = tab.id
  }

  function selectFileTab(id: string) {
    if (fileTabs.value.find((t) => t.id === id)) {
      activeFileTabId.value = id
    }
  }

  function closeFileTab(id: string) {
    const idx = fileTabs.value.findIndex((t) => t.id === id)
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

  function updateFileTabViewerState(id: string, state: Partial<NonNullable<FileTab['viewerState']>>) {
    const tab = fileTabs.value.find((t) => t.id === id)
    if (tab) {
      tab.viewerState = { ...tab.viewerState, ...state }
    }
  }

  // 切会话时调用: 重置面板态
  // fileTabs 保持不变 — VS Code 风格持久标签页
  function resetForSession() {
    // 可根据需要重置 fileTabs 或保持持久
  }

  return {
    view, previousView, settingsSection,
    sidebarOpen,
    fileTabs, activeFileTabId,
    setView, enterSettings, exitSettings, toggleSidebar,
    openFileTab, selectFileTab, closeFileTab, closeAllFileTabs, updateFileTabViewerState,
    resetForSession,
  }
})