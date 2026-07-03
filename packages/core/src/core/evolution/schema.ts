import { Schema } from "effect"

export const TrajectoryId = Schema.String.pipe(Schema.brand("TrajectoryId"))
export type TrajectoryId = typeof TrajectoryId.Type

export const CycleId = Schema.String.pipe(Schema.brand("CycleId"))
export type CycleId = typeof CycleId.Type

export const PatternId = Schema.String.pipe(Schema.brand("PatternId"))
export type PatternId = typeof PatternId.Type

export const SkillId = Schema.String.pipe(Schema.brand("SkillId"))
export type SkillId = typeof SkillId.Type

export const TriggerEvent = Schema.Literal("skill_start", "skill_end", "tool_call", "error")
export type TriggerEvent = typeof TriggerEvent.Type

export const CycleStatus = Schema.Literal(
  "recorded", "patterned", "proposed", "replayed", 
  "convergence_checked", "approved", "applied", "rejected", "deferred"
)
export type CycleStatus = typeof CycleStatus.Type

export const CycleTrigger = Schema.Literal("failure_spike", "repeat_pattern", "manual", "scheduled")
export type CycleTrigger = typeof CycleTrigger.Type

export const TaskContext = Schema.Struct({
  description: Schema.String,
  environment: Schema.Record({ key: Schema.String, value: Schema.String }),
  user_intent: Schema.String.pipe(Schema.optional),
})
export type TaskContext = typeof TaskContext.Type

export const Action = Schema.Struct({
  tool_name: Schema.String,
  tool_input: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  timestamp: Schema.Number,
})
export type Action = typeof Action.Type

export const Outcome = Schema.Struct({
  success: Schema.Boolean,
  error_message: Schema.String.pipe(Schema.optional),
  result: Schema.Unknown.pipe(Schema.optional),
  duration_ms: Schema.Number,
})
export type Outcome = typeof Outcome.Type

export const UserFeedback = Schema.Struct({
  rating: Schema.Number.pipe(Schema.between(1, 5)),
  comment: Schema.String.pipe(Schema.optional),
  timestamp: Schema.Number,
})
export type UserFeedback = typeof UserFeedback.Type

export const Trajectory = Schema.Struct({
  trajectory_id: TrajectoryId,
  cycle_id: CycleId.pipe(Schema.optional),
  skill_id: SkillId,
  session_id: Schema.String,
  trigger_event: TriggerEvent,
  context: TaskContext,
  actions: Schema.Array(Action),
  outcome: Outcome,
  feedback: UserFeedback.pipe(Schema.optional),
  created_at: Schema.Number,
})
export type Trajectory = typeof Trajectory.Type

export const Pattern = Schema.Struct({
  pattern_id: PatternId,
  occurrence_count: Schema.Number,
  failure_rate: Schema.Number,
  suggested_fix: Schema.String,
  confidence: Schema.Number.pipe(Schema.between(0, 1)),
  detected_at: Schema.Number,
})
export type Pattern = typeof Pattern.Type

export const EvolutionCycle = Schema.Struct({
  cycle_id: CycleId,
  trigger: CycleTrigger,
  trajectories: Schema.Array(TrajectoryId),
  pattern: PatternId.pipe(Schema.optional),
  confidence_model: Schema.Struct({
    failure_consistency: Schema.Number,
    repairability: Schema.Number,
    generality: Schema.Number,
  }).pipe(Schema.optional),
  proposal: Schema.String.pipe(Schema.optional),
  status: CycleStatus,
  created_at: Schema.Number,
  updated_at: Schema.Number,
  provenance: Schema.Array(Schema.String),
})
export type EvolutionCycle = typeof EvolutionCycle.Type

export const PolicyTrace = Schema.Struct({
  trace_id: Schema.String.pipe(Schema.brand("TraceId")),
  cycle_id: CycleId,
  decision_type: Schema.Literal("pattern_detected", "proposal_generated", "negative_filter"),
  matched_rules: Schema.Array(Schema.String),
  score_breakdown: Schema.Array(Schema.Struct({
    dimension: Schema.String,
    score: Schema.Number,
    weight: Schema.Number,
  })),
  final_decision: Schema.String,
  rationale: Schema.String,
  created_at: Schema.Number,
})
export type PolicyTrace = typeof PolicyTrace.Type

export const NegativePattern = Schema.Struct({
  pattern_id: PatternId,
  forbidden_behavior: Schema.String,
  reason: Schema.Literal("overgeneralization", "tool_misuse", "planning_failure", "context_loss"),
  triggered_by: Schema.Array(TrajectoryId),
  created_at: Schema.Number,
})
export type NegativePattern = typeof NegativePattern.Type