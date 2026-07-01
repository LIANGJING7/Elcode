import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MessageAssistant from '../MessageAssistant.vue'
import type { Message } from '../../../../types/ipc'

// Mock shiki to avoid async highlighter loading in jsdom
vi.mock('shiki', () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    codeToHtml: (code: string) => `<pre class="shiki">${code}</pre>`,
  }),
}))

async function flushPromises() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('MessageAssistant', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('渲染纯文本内容', () => {
    const msg: Message = {
      id: 'm1', role: 'assistant',
      content: 'Hello world',
      timestamp: new Date(),
    }
    const w = mount(MessageAssistant, { props: { message: msg } })
    expect(w.text()).toContain('Hello world')
  })

  it('渲染代码块', async () => {
    const msg: Message = {
      id: 'm2', role: 'assistant',
      content: '```ts\nconst x = 1\n```',
      timestamp: new Date(),
    }
    const w = mount(MessageAssistant, { props: { message: msg } })
    await flushPromises()
    await w.vm.$nextTick()
    expect(w.text()).toContain('const x = 1')
  })

  it('渲染 tool calls', () => {
    const msg: Message = {
      id: 'm3', role: 'assistant',
      content: 'done',
      timestamp: new Date(),
      toolCalls: [{
        id: 'tc1', name: 'bash', status: 'completed',
        args: { command: 'ls' }, output: { structured: { type: 'bash', exitCode: 0 } },
      }],
    }
    const w = mount(MessageAssistant, { props: { message: msg } })
    expect(w.find('[data-tool-name="bash"]').exists()).toBe(true)
  })

  it('openFile 事件向上传递', async () => {
    const msg: Message = {
      id: 'm4', role: 'assistant',
      content: '',
      timestamp: new Date(),
      toolCalls: [{
        id: 'tc1', name: 'read', status: 'completed',
        args: { filePath: 'a.ts' },
        output: { structured: { type: 'text-page', content: 'hello' } },
      }],
    }
    const w = mount(MessageAssistant, { props: { message: msg } })
    // Click summary to trigger openFile
    await w.find('.summary').trigger('click')
    expect(w.emitted('openFile')).toBeTruthy()
  })
})
