// packages/desktop/src/types/model-options.ts

// Anthropic thinking 参数
export interface AnthropicThinkingOptions {
  type?: 'enabled' | 'disabled'
  budgetTokens?: number
}

// 纯数据模型 - 只包含写入配置的字段
export interface ModelOptions {
  // OpenAI 系列
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
  textVerbosity?: 'low' | 'medium' | 'high'
  reasoningSummary?: 'auto' | 'concise' | 'hidden'
  include?: string[]
  // Anthropic 系列
  thinking?: AnthropicThinkingOptions
}

// 添加模型 payload
export interface AddModelPayload {
  modelId: string
  name?: string
  options?: ModelOptions
}

// 字段 key 类型
type OptionKey =
  | 'reasoningEffort'
  | 'textVerbosity'
  | 'reasoningSummary'
  | 'include'
  | 'thinking'
  | 'thinking.type'
  | 'thinking.budgetTokens'

// 字段元数据基类
interface BaseField {
  key: OptionKey
  label: string
  description?: string
}

// 下拉选择字段
interface SelectField extends BaseField {
  type: 'select'
  options: { value: string; label: string }[]
}

// 数字输入字段
interface NumberField extends BaseField {
  type: 'number'
}

// 列表字段
interface ListField extends BaseField {
  type: 'list'
  itemPlaceholder: string
}

// 组字段
interface GroupField extends BaseField {
  type: 'group'
  children: OptionField[]
}

// 字段联合类型
export type OptionField = SelectField | NumberField | ListField | GroupField

// 供应商 → 字段映射
export const OPTIONS_BY_NPM: Record<string, OptionField[]> = {
  '@ai-sdk/openai': [
    {
      key: 'reasoningEffort',
      label: '推理强度',
      description: '控制模型用于推理的计算量',
      type: 'select',
      options: [
        { value: 'none', label: 'none - 无推理' },
        { value: 'minimal', label: 'minimal - 最小' },
        { value: 'low', label: 'low - 低' },
        { value: 'medium', label: 'medium - 中等' },
        { value: 'high', label: 'high - 高' },
        { value: 'xhigh', label: 'xhigh - 超高' },
        { value: 'max', label: 'max - 最大' },
      ],
    },
    {
      key: 'textVerbosity',
      label: '文字详细度',
      description: '控制输出文字的简洁程度',
      type: 'select',
      options: [
        { value: 'low', label: 'low - 简洁' },
        { value: 'medium', label: 'medium - 中等' },
        { value: 'high', label: 'high - 详细' },
      ],
    },
    {
      key: 'reasoningSummary',
      label: '推理摘要',
      description: '控制模型返回的推理摘要级别',
      type: 'select',
      options: [
        { value: 'auto', label: 'auto - 自动' },
        { value: 'concise', label: 'concise - 简洁' },
        { value: 'hidden', label: 'hidden - 隐藏' },
      ],
    },
    {
      key: 'include',
      label: '包含内容',
      description: '指定响应中需要额外返回的内容（例如 reasoning.encrypted_content）',
      type: 'list',
      itemPlaceholder: 'reasoning.encrypted_content',
    },
  ],
  '@ai-sdk/openai-compatible': [
    {
      key: 'reasoningEffort',
      label: '推理强度',
      description: '控制模型用于推理的计算量',
      type: 'select',
      options: [
        { value: 'none', label: 'none - 无推理' },
        { value: 'minimal', label: 'minimal - 最小' },
        { value: 'low', label: 'low - 低' },
        { value: 'medium', label: 'medium - 中等' },
        { value: 'high', label: 'high - 高' },
        { value: 'xhigh', label: 'xhigh - 超高' },
        { value: 'max', label: 'max - 最大' },
      ],
    },
    {
      key: 'textVerbosity',
      label: '文字详细度',
      description: '控制输出文字的简洁程度',
      type: 'select',
      options: [
        { value: 'low', label: 'low - 简洁' },
        { value: 'medium', label: 'medium - 中等' },
        { value: 'high', label: 'high - 详细' },
      ],
    },
    {
      key: 'reasoningSummary',
      label: '推理摘要',
      description: '控制模型返回的推理摘要级别',
      type: 'select',
      options: [
        { value: 'auto', label: 'auto - 自动' },
        { value: 'concise', label: 'concise - 简洁' },
        { value: 'hidden', label: 'hidden - 隐藏' },
      ],
    },
    {
      key: 'include',
      label: '包含内容',
      description: '指定响应中需要额外返回的内容（例如 reasoning.encrypted_content）',
      type: 'list',
      itemPlaceholder: 'reasoning.encrypted_content',
    },
  ],
  '@ai-sdk/google': [
    {
      key: 'reasoningEffort',
      label: '推理强度',
      description: '控制模型用于推理的计算量',
      type: 'select',
      options: [
        { value: 'none', label: 'none - 无推理' },
        { value: 'minimal', label: 'minimal - 最小' },
        { value: 'low', label: 'low - 低' },
        { value: 'medium', label: 'medium - 中等' },
        { value: 'high', label: 'high - 高' },
        { value: 'xhigh', label: 'xhigh - 超高' },
        { value: 'max', label: 'max - 最大' },
      ],
    },
    {
      key: 'textVerbosity',
      label: '文字详细度',
      description: '控制输出文字的简洁程度',
      type: 'select',
      options: [
        { value: 'low', label: 'low - 简洁' },
        { value: 'medium', label: 'medium - 中等' },
        { value: 'high', label: 'high - 详细' },
      ],
    },
  ],
  '@ai-sdk/anthropic': [
    {
      key: 'thinking',
      label: '思考',
      description: 'Anthropic 扩展思考模式',
      type: 'group',
      children: [
        {
          key: 'thinking.type',
          label: '思考类型',
          type: 'select',
          options: [
            { value: 'enabled', label: 'enabled - 启用' },
            { value: 'disabled', label: 'disabled - 禁用' },
          ],
        },
        {
          key: 'thinking.budgetTokens',
          label: '预算 Token',
          description: '思考过程中最多可使用的 Token 数。数值越大，模型可进行更深入的推理，但响应时间和成本可能增加。',
          type: 'number',
        },
      ],
    },
  ],
}