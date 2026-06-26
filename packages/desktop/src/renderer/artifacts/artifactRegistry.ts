/**
 * Artifact registry: 可扩展的产物类型注册表.
 * 每个 ArtifactRenderer 定义如何识别和渲染一类产物 (如 diff/todo).
 * registry 驱动 artifactStore 从 toolCalls 派生 artifacts.
 */

import type { ToolCall } from '../../types/ipc'

export type ArtifactType = 'diff' | 'todo' | 'terminal' | 'preview' | string // 不含 "tool"

/** 产物实例: 从 toolCall 派生的渲染单元. id === toolCall.id (引用不复制). */
export interface ArtifactInstance {
  id: string // === 关联 ToolCall.id (不另生成)
  type: ArtifactType
  toolCall: ToolCall // 引用消息流对象, 不复制
  props: unknown // 通常 === toolCall.args
  groupId?: string // 预留 ArtifactGroup (phase evaluation+)
}

/** 产物渲染器: 定义如何识别和展示一类产物. */
export interface ArtifactRenderer {
  type: ArtifactType
  label: string
  icon?: string
  /** 判断某 toolCall.name 是否命中此渲染器. */
  applicable: (toolName: string) => boolean
  // groupable?: boolean; groupBy?: (tc: ToolCall) => string | undefined (首版预留字段, 不做分组实现)
}

/** 注册表: key === type. */
export const artifactRegistry: Record<ArtifactType, ArtifactRenderer> = {} as Record<ArtifactType, ArtifactRenderer>

/** 注册渲染器. */
export function registerArtifactRenderer(r: ArtifactRenderer): void {
  artifactRegistry[r.type] = r
}

/** 根据 toolName 查匹配的 artifact type, 无则 null. */
export function pickArtifactType(toolName: string): ArtifactType | null {
  for (const type in artifactRegistry) {
    const r = artifactRegistry[type]
    if (r.applicable(toolName)) return r.type
  }
  return null
}