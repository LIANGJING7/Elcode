// 首版注册 skills。未来加 memory/agents/prompts 仅在此 push 一项。
import type { View } from '../stores/ui'

export interface NavigationItem {
  id: string
  label: string
  icon: string // icon 组件名或 svg path,见 SidebarHeader
  view: Exclude<View, 'welcome' | 'chat' | 'settings'>
  order: number
  enterSettings?: boolean // 如果为 true,点击后进入设置而非切换 view
  settingsSection?: string // 进入设置时要显示的设置分区
}

// registry 顺序由 order 决定(SidebarHeader 渲染时排序)
export const navigationRegistry: NavigationItem[] = [
  { id: 'skills', label: '技能', icon: 'sparkles', view: 'skills', order: 10, enterSettings: true, settingsSection: 'skills' },
]

export function getNavigationViewIds(): string[] {
  return [...navigationRegistry].sort((a, b) => a.order - b.order).map((i) => i.id)
}

export function isNavigationView(v: string): boolean {
  return navigationRegistry.some((item) => item.view === v)
}