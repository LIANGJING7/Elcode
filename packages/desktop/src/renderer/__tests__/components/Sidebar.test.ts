import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Sidebar from '../../components/Sidebar.vue'
import type { Conversation } from '../../../types/ipc'

vi.mock('../../utils/formatting', () => ({
  formatRelative: vi.fn(() => '2 hours ago')
}))

const mockConversations: Conversation[] = [
  { id: 'session-1', title: 'Chat 1', messages: [], createdAt: new Date(), updatedAt: new Date() },
  { id: 'session-2', title: 'Chat 2', messages: [], createdAt: new Date(), updatedAt: new Date() }
]

describe('Sidebar.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render conversations list', () => {
    const wrapper = mount(Sidebar, {
      props: { conversations: mockConversations, currentSessionId: null },
      global: {
        stubs: {
          PlusIcon: { template: '<span class="plus-icon" />' },
          SearchIcon: { template: '<span class="search-icon" />' }
        }
      }
    })
    const items = wrapper.findAll('.conversation-item')
    expect(items.length).toBe(2)
    expect(items[0].text()).toContain('Chat 1')
  })

  it('should highlight active conversation', () => {
    const wrapper = mount(Sidebar, {
      props: { conversations: mockConversations, currentSessionId: 'session-2' },
      global: {
        stubs: {
          PlusIcon: { template: '<span class="plus-icon" />' },
          SearchIcon: { template: '<span class="search-icon" />' }
        }
      }
    })
    const items = wrapper.findAll('.conversation-item')
    expect(items[1].classes()).toContain('bg-accent')
  })

  it('should emit newChat event', async () => {
    const wrapper = mount(Sidebar, {
      props: { conversations: mockConversations, currentSessionId: null },
      global: {
        stubs: {
          PlusIcon: { template: '<span class="plus-icon" />' },
          SearchIcon: { template: '<span class="search-icon" />' }
        }
      }
    })
    const button = wrapper.find('.new-chat-button')
    await button.trigger('click')
    expect(wrapper.emitted('newChat')).toBeTruthy()
  })

  it('should emit selectSession event', async () => {
    const wrapper = mount(Sidebar, {
      props: { conversations: mockConversations, currentSessionId: null },
      global: {
        stubs: {
          PlusIcon: { template: '<span class="plus-icon" />' },
          SearchIcon: { template: '<span class="search-icon" />' }
        }
      }
    })
    const item = wrapper.find('.conversation-item')
    await item.trigger('click')
    expect(wrapper.emitted('selectSession')).toBeTruthy()
    expect(wrapper.emitted('selectSession')![0]).toEqual(['session-1'])
  })

  it('should filter conversations by search', async () => {
    const wrapper = mount(Sidebar, {
      props: { conversations: mockConversations, currentSessionId: null },
      global: {
        stubs: {
          PlusIcon: { template: '<span class="plus-icon" />' },
          SearchIcon: { template: '<span class="search-icon" />' }
        }
      }
    })
    const searchInput = wrapper.find('input[type="text"]')
    await searchInput.setValue('Chat 2')
    const items = wrapper.findAll('.conversation-item')
    expect(items.length).toBe(1)
    expect(items[0].text()).toContain('Chat 2')
  })
})