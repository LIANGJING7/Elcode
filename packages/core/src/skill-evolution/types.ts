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
  skillName: string
  useCount: number
  lastUsedAt: number
  firstUsedAt: number
  lifecycleState: LifecycleState
}