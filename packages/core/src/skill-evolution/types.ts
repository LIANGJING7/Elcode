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

export interface ReviewResult {
  shouldUpdate: boolean
  updates: SkillUpdate[]
  confidence: number
}

export interface UsageStats {
  skill_name: string
  use_count: number
  last_used_at: number
  first_used_at: number
  lifecycle_state: string
}