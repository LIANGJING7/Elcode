import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { useGlobalShortcuts } from '../useGlobalShortcuts'
import { useUiStore } from '../../stores/ui'

const Host = defineComponent({
  setup() {
    useGlobalShortcuts()
    return () => h('div')
  },
})

function mkEvent(key: string, opts: KeyboardEventInit = {}) {
  return new KeyboardEvent('keydown', { key, bubbles: true, ...opts })
}

describe('useGlobalShortcuts', () => {
  let dispatchOrig: typeof document.dispatchEvent
  beforeEach(() => {
    setActivePinia(createPinia())
    dispatchOrig = document.dispatchEvent.bind(document)
  })
  afterEach(() => {
    document.dispatchEvent = dispatchOrig
  })

  it('Ctrl/Cmd+B 切侧栏', () => {
    const ui = useUiStore()
    ui.sidebarOpen = true
    const w = mount(Host)
    document.dispatchEvent(mkEvent('b', { ctrlKey: true }))
    expect(ui.sidebarOpen).toBe(false)
    document.dispatchEvent(mkEvent('b', { metaKey: true }))
    expect(ui.sidebarOpen).toBe(true)
    w.unmount()
  })

  it('Ctrl/Cmd+N 不在本期 hook 内强行绑(避免触发系统新窗口) — 实<App> 层通过 IPC 触发, 此处只校验不抛', () => {
    const w = mount(Host)
    expect(() => document.dispatchEvent(mkEvent('n', { ctrlKey: true }))).not.toThrow()
    w.unmount()
  })
})