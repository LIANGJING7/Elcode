import { describe, it, expect, beforeEach } from 'vitest'
import {
  sessionOptionsRegistry,
  registerSessionOption,
  type SessionOption,
  type SessionOptionKey
} from '../../../composer/sessionOptionsRegistry'

describe('sessionOptionsRegistry', () => {
  beforeEach(() => {
    // Reset registry to defaults before each test
    // Note: in production, registry is global; tests should restore defaults
    sessionOptionsRegistry.model = {
      key: 'model',
      label: '模型',
      type: 'select',
      value: '',
      options: [],
      allowed: ['create', 'runtime'],
      default: ''
    }
    sessionOptionsRegistry.mode = {
      key: 'mode',
      label: '模式',
      type: 'select',
      value: 'build',
      options: [{ value: 'build', label: 'build' }, { value: 'plan', label: 'plan' }],
      allowed: ['create', 'runtime'],
      default: 'build'
    }
  })

  it('registry 含默认 model + mode 两 option', () => {
    expect(sessionOptionsRegistry.model).toBeDefined()
    expect(sessionOptionsRegistry.mode).toBeDefined()
    expect(Object.keys(sessionOptionsRegistry).length).toBeGreaterThanOrEqual(2)
  })

  it('SessionOption 结构含 key/label/type/value/options/default/allowed', () => {
    const model = sessionOptionsRegistry.model as SessionOption<string>
    expect(model.key).toBe('model')
    expect(model.label).toBe('模型')
    expect(model.type).toBe('select')
    expect(model.value).toBe('')
    expect(model.options).toEqual([])
    expect(model.allowed).toEqual(['create', 'runtime'])
    expect(model.default).toBe('')
  })

  it('mode option 含 build/plan 两选项', () => {
    const mode = sessionOptionsRegistry.mode as SessionOption<string>
    expect(mode.options).toEqual([
      { value: 'build', label: 'build' },
      { value: 'plan', label: 'plan' }
    ])
    expect(mode.default).toBe('build')
    expect(mode.value).toBe('build')
  })

  it('registerSessionOption 添加新 option 到 registry', () => {
    const reasoning: SessionOption<boolean> = {
      key: 'reasoning',
      label: '推理',
      type: 'select',
      value: false,
      options: [{ value: false, label: '关闭' }, { value: true, label: '开启' }],
      allowed: ['create'],
      default: false
    }
    registerSessionOption(reasoning)
    expect(sessionOptionsRegistry.reasoning).toBeDefined()
    expect((sessionOptionsRegistry.reasoning as SessionOption<boolean>).label).toBe('推理')
  })

  it('registerSessionOption 覆盖已存在的 option', () => {
    const newMode: SessionOption<string> = {
      key: 'mode',
      label: '运行模式',
      type: 'select',
      value: 'plan',
      options: [{ value: 'build', label: '构建' }, { value: 'plan', label: '规划' }],
      allowed: ['create', 'runtime'],
      default: 'build'
    }
    registerSessionOption(newMode)
    expect((sessionOptionsRegistry.mode as SessionOption<string>).label).toBe('运行模式')
    expect((sessionOptionsRegistry.mode as SessionOption<string>).options).toEqual([
      { value: 'build', label: '构建' },
      { value: 'plan', label: '规划' }
    ])
  })

  it('allowed 字段限制 option 何时可改 ("create"|"runtime")', () => {
    const model = sessionOptionsRegistry.model as SessionOption<string>
    expect(model.allowed).toContain('create')
    expect(model.allowed).toContain('runtime')

    // reasoning only allowed at create time
    const reasoning: SessionOption<boolean> = {
      key: 'reasoning',
      label: '推理',
      type: 'select',
      value: false,
      options: [{ value: false, label: '关闭' }, { value: true, label: '开启' }],
      allowed: ['create'],
      default: false
    }
    registerSessionOption(reasoning)
    expect((sessionOptionsRegistry.reasoning as SessionOption<boolean>).allowed).toEqual(['create'])
  })
})