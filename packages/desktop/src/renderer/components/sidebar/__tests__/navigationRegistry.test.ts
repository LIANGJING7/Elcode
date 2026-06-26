import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { navigationRegistry, getNavigationViewIds, isNavigationView } from '../../../navigation/navigationRegistry'

describe('navigationRegistry', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('首版注册 skills 与 mcp 两个导航项', () => {
    const ids = getNavigationViewIds()
    expect(ids).toEqual(['skills', 'mcp'])
  })

  it('每个注册项含 id/label/icon/view/order', () => {
    for (const item of navigationRegistry) {
      expect(item.id).toBeTruthy()
      expect(item.label).toBeTruthy()
      expect(item.icon).toBeTruthy()
      expect(typeof item.view).toBe('string')
      expect(typeof item.order).toBe('number')
    }
  })

  it('isNavigationView 识别 navigation view 与系统 view', () => {
    expect(isNavigationView('skills')).toBe(true)
    expect(isNavigationView('mcp')).toBe(true)
    expect(isNavigationView('chat')).toBe(false)
    expect(isNavigationView('welcome')).toBe(false)
    expect(isNavigationView('settings')).toBe(false)
  })

  it('getNavigationViewIds 已按 order 升序', () => {
    const ids = getNavigationViewIds()
    const orders = ids.map(id => navigationRegistry.find(i => i.id === id)!.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})