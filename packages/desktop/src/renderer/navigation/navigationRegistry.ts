// 首版注册 skills / mcp。未来加 memory/agents/prompts 仅在此 push 一项。
import type { View } from '../stores/ui'

export interface NavigationItem {
  id: string
  label: string
  icon: string // icon 组件名或 svg path,见 SidebarHeader
  view: Exclude<View, 'welcome' | 'chat' | 'settings'>
  order: number
}

// registry 顺序由 order 决定(SidebarHeader 渲染时排序)
export const navigationRegistry: NavigationItem[] = [
  { id: 'skills', label: 'Skills', icon: 'sparkles', view: 'skills', order: 10 },
  { id: 'mcp', label: 'MCP', icon: 'bolt', view: 'mcp', order: 20 },
]

export function getNavigationViewIds(): string[] {
  return [...navigationRegistry].sort((a, b) => a.order - b.order).map((i) => i.id)
}

export function isNavigationView(v: string): boolean {
  return navigationRegistry.some((item) => item.view === v)
}