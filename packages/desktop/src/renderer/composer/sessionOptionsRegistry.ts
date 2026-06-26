/**
 * Session 选项注册表: 驱动 Composer 底部 SessionOptions UI 的选项列表。
 * 每个 SessionOption 含 key/label/type/value/options/allowed/default。
 * allowed 限制选项何时可改: 'create'(仅建会话时)/'runtime'(运行时亦可)。
 */

export type SessionOptionKey = 'model' | 'mode' | 'reasoning' | 'permission' | string

export interface SessionOption<T = unknown> {
  key: SessionOptionKey
  label: string
  type: 'select'
  value: T
  options: { value: T; label: string }[]
  allowed: ('create' | 'runtime')[]
  default: T
}

/**
 * 全局注册表: key -> SessionOption。
 * 默认含 model + mode 两项; 可经 registerSessionOption 扩展/覆盖。
 */
export const sessionOptionsRegistry: Record<string, SessionOption> = {
  model: {
    key: 'model',
    label: '模型',
    type: 'select',
    value: '',
    options: [],
    allowed: ['create', 'runtime'],
    default: ''
  },
  mode: {
    key: 'mode',
    label: '模式',
    type: 'select',
    value: 'build',
    options: [{ value: 'build', label: 'build' }, { value: 'plan', label: 'plan' }],
    allowed: ['create', 'runtime'],
    default: 'build'
  }
}

/**
 * 注册/覆盖 SessionOption。
 * 用例: 插件扩展选项(如 reasoning/permission)。
 */
export function registerSessionOption<T>(opt: SessionOption<T>): void {
  sessionOptionsRegistry[opt.key] = opt as SessionOption
}