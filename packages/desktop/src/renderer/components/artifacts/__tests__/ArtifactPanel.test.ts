import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ArtifactPanel from '../ArtifactPanel.vue'
import { useUiStore } from '../../../stores/ui'
import type { ArtifactInstance } from '../../../artifacts/artifactRegistry'

describe('ArtifactPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('artifacts 0→>0 触发自动展开', async () => {
    const ui = useUiStore()
    ui.artifactPanelOpen = false
    ui.hasUserClosedArtifactPanel = false

    const w = mount(ArtifactPanel, { props: { artifacts: [] } })
    expect(ui.artifactPanelOpen).toBe(false)

    const art: ArtifactInstance = { id: 't1', type: 'diff', toolCall: { id: 't1', name: 'edit_file', args: {} }, props: {} }
    await w.setProps({ artifacts: [art] })
    expect(ui.artifactPanelOpen).toBe(true)
  })

  it('用户已主动关后, 不自动展开', async () => {
    const ui = useUiStore()
    ui.closeArtifactPanel() // sets hasUserClosedArtifactPanel = true

    const w = mount(ArtifactPanel, { props: { artifacts: [] } })
    const art: ArtifactInstance = { id: 't1', type: 'diff', toolCall: { id: 't1', name: 'edit_file', args: {} }, props: {} }
    await w.setProps({ artifacts: [art] })
    expect(ui.artifactPanelOpen).toBe(false)
  })

  it('close-btn 点击调用 closeArtifactPanel', async () => {
    const ui = useUiStore()
    ui.artifactPanelOpen = true
    const w = mount(ArtifactPanel, { props: { artifacts: [] } })
    await w.find('[data-testid="close-btn"]').trigger('click')
    expect(ui.artifactPanelOpen).toBe(false)
    expect(ui.hasUserClosedArtifactPanel).toBe(true)
  })
})