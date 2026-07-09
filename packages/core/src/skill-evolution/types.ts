import { Schema } from "effect"

export enum LifecycleState {
  ACTIVE = 'active',
  STALE = 'stale',
  ARCHIVED = 'archived',
}

export interface SkillUpdate {
  type: 'create' | 'update' | 'delete'
  skillName?: string
  newPrompt?: string
  reason?: string
}

export const SkillUpdateSchema = Schema.Struct({
  type: Schema.Literal("create", "update", "delete"),
  skillName: Schema.optional(Schema.String),
  newPrompt: Schema.optional(Schema.String),
  reason: Schema.optional(Schema.String),
})

export interface ReviewResult {
  shouldUpdate: boolean
  updates: SkillUpdate[]
  confidence: number
}

export const ReviewResultSchema = Schema.Struct({
  shouldUpdate: Schema.Boolean,
  confidence: Schema.Number,
  updates: Schema.Array(SkillUpdateSchema),
})

export interface UsageStats {
  skillName: string
  useCount: number
  lastUsedAt: number
  firstUsedAt: number
  lifecycleState: LifecycleState
}