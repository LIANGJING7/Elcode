import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SidebarWorkspaces from '../SidebarWorkspaces.vue'
import { useWorkspaceStore } from '../../../stores/workspace'
import type { Workspace } from '../../../../types/ipc'

// 真实 store 方法会落到 window.desktop IPC, 这里按 session.test.ts 的约定 stub.
// 注: Add Workspace 按钮已移除, 添加工作区改由 WelcomeView 的 open-folder 入口承担.
const mockWorkspace = {
  list: vi.fn().mockResolvedValue([]),
  getCwd: vi.fn().mockResolvedValue(''),
  add: vi.fn(),
  remove: vi.fn(),
  select: vi.fn().mockResolvedValue(true),
  openFolder: vi.fn(),
}
// 直接挂在 jsdom 的 window 上(而非 vi.stubGlobal 替换整个 window),
// 否则会丢掉 window.MouseEvent/InputEvent 构造器, @vue/test-utils 的 trigger/setValue 会崩.
;(window as unknown as { desktop: unknown }).desktop = { workspace: mockWorkspace, session: {} }

function mkWs(over: Partial<Workspace> = {}): Workspace {
  return { id: 'ws-a', name: 'repo', path: 'C:/repo', lastAccessed: new Date(0), ...over }
}

describe('SidebarWorkspaces', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('点击 workspace 行触发 selectWorkspace', async () => {
    const store = useWorkspaceStore()
    store.workspaces = [
      mkWs({ id: 'ws-a', name: 'agent-repo', path: 'C:/repo', lastAccessed: new Date(0) }),
      mkWs({ id: 'ws-b', name: 'website', path: 'C:/web', lastAccessed: new Date(1) }),
    ]
    const w = mount(SidebarWorkspaces)
    await w.find('button[data-workspace-id="ws-b"]').trigger('click')
    // selectWorkspace 内部 await window.desktop.workspace.select (已 mock 成 true)
    await vi.waitFor(() => expect(store.currentWorkspace?.id).toBe('ws-b'))
    expect(store.currentWorkspace?.id).toBe('ws-b')
  })

  it('当前 workspace 高亮', () => {
    const store = useWorkspaceStore()
    store.workspaces = [mkWs({ id: 'ws-a', name: 'x', path: 'C:/x' })]
    store.currentWorkspace = store.workspaces[0]
    const w = mount(SidebarWorkspaces)
    expect(w.find('button[data-workspace-id="ws-a"]').classes()).toContain('is-current')
  })
})
