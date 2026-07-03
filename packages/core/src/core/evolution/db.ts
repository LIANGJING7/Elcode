import { Database } from "bun:sqlite"
import { Effect, Layer, Context } from "effect"
import * as Schema from "./schema"

export interface EvolutionDBInterface {
  readonly db: Database.Database
  readonly init: () => Effect.Effect<void>
  readonly insertTrajectory: (trajectory: Schema.Trajectory) => Effect.Effect<void>
  readonly insertCycle: (cycle: Schema.EvolutionCycle) => Effect.Effect<void>
  readonly insertPattern: (pattern: Schema.Pattern) => Effect.Effect<void>
  readonly insertPolicyTrace: (trace: Schema.PolicyTrace) => Effect.Effect<void>
  readonly insertNegativePattern: (pattern: Schema.NegativePattern) => Effect.Effect<void>
  readonly getTrajectories: (cycleId?: Schema.CycleId) => Effect.Effect<Schema.Trajectory[]>
  readonly getCycles: (status?: Schema.CycleStatus) => Effect.Effect<Schema.EvolutionCycle[]>
  readonly getPatterns: () => Effect.Effect<Schema.Pattern[]>
  readonly getNegativePatterns: () => Effect.Effect<Schema.NegativePattern[]>
  readonly updateCycle: (cycle: Schema.EvolutionCycle) => Effect.Effect<void>
  readonly getPolicyTraces: (cycleId: Schema.CycleId) => Effect.Effect<Schema.PolicyTrace[]>
}

export class EvolutionDB extends Context.Service<EvolutionDB, EvolutionDBInterface>()("@opencode/evolution/EvolutionDB") {}

export const evolutionDBLayer: Layer.Layer<EvolutionDB, never, never> = Layer.effect(
  EvolutionDB,
  Effect.gen(function* () {
    const dbPath = process.env.EVOLUTION_DB_PATH || ":memory:"
    const db = new Database(dbPath)

    return EvolutionDB.of({
      db,

      init: () =>
        Effect.sync(() => {
          db.exec(`
            CREATE TABLE IF NOT EXISTS trajectories (
              trajectory_id TEXT PRIMARY KEY,
              cycle_id TEXT,
              skill_id TEXT,
              session_id TEXT,
              trigger_event TEXT,
              context TEXT,
              actions TEXT,
              outcome TEXT,
              feedback TEXT,
              created_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS evolution_cycles (
              cycle_id TEXT PRIMARY KEY,
              trigger TEXT,
              trajectories TEXT,
              pattern TEXT,
              confidence_model TEXT,
              proposal TEXT,
              status TEXT,
              provenance TEXT,
              created_at INTEGER,
              updated_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS patterns (
              pattern_id TEXT PRIMARY KEY,
              occurrence_count INTEGER,
              failure_rate REAL,
              suggested_fix TEXT,
              confidence REAL,
              detected_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS policy_traces (
              trace_id TEXT PRIMARY KEY,
              cycle_id TEXT,
              decision_type TEXT,
              matched_rules TEXT,
              score_breakdown TEXT,
              final_decision TEXT,
              rationale TEXT,
              created_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS negative_patterns (
              pattern_id TEXT PRIMARY KEY,
              forbidden_behavior TEXT,
              reason TEXT,
              triggered_by TEXT,
              created_at INTEGER
            );

            CREATE INDEX IF NOT EXISTS idx_trajectories_cycle ON trajectories(cycle_id);
            CREATE INDEX IF NOT EXISTS idx_trajectories_skill ON trajectories(skill_id);
            CREATE INDEX IF NOT EXISTS idx_cycles_status ON evolution_cycles(status);
            CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence);
          `)
        }),

      insertTrajectory: (trajectory) =>
        Effect.sync(() => {
          const stmt = db.prepare(`
            INSERT INTO trajectories VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          stmt.run(
            trajectory.trajectory_id,
            trajectory.cycle_id || null,
            trajectory.skill_id,
            trajectory.session_id,
            trajectory.trigger_event,
            JSON.stringify(trajectory.context),
            JSON.stringify(trajectory.actions),
            JSON.stringify(trajectory.outcome),
            trajectory.feedback ? JSON.stringify(trajectory.feedback) : null,
            trajectory.created_at
          )
        }),

      insertCycle: (cycle) =>
        Effect.sync(() => {
          const stmt = db.prepare(`
            INSERT INTO evolution_cycles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          stmt.run(
            cycle.cycle_id,
            cycle.trigger,
            JSON.stringify(cycle.trajectories),
            cycle.pattern || null,
            cycle.confidence_model ? JSON.stringify(cycle.confidence_model) : null,
            cycle.proposal || null,
            cycle.status,
            JSON.stringify(cycle.provenance),
            cycle.created_at,
            cycle.updated_at
          )
        }),

      insertPattern: (pattern) =>
        Effect.sync(() => {
          const stmt = db.prepare(`
            INSERT INTO patterns VALUES (?, ?, ?, ?, ?, ?)
          `)
          stmt.run(
            pattern.pattern_id,
            pattern.occurrence_count,
            pattern.failure_rate,
            pattern.suggested_fix,
            pattern.confidence,
            pattern.detected_at
          )
        }),

      insertPolicyTrace: (trace) =>
        Effect.sync(() => {
          const stmt = db.prepare(`
            INSERT INTO policy_traces VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          stmt.run(
            trace.trace_id,
            trace.cycle_id,
            trace.decision_type,
            JSON.stringify(trace.matched_rules),
            JSON.stringify(trace.score_breakdown),
            trace.final_decision,
            trace.rationale,
            trace.created_at
          )
        }),

      insertNegativePattern: (pattern) =>
        Effect.sync(() => {
          const stmt = db.prepare(`
            INSERT INTO negative_patterns VALUES (?, ?, ?, ?, ?)
          `)
          stmt.run(
            pattern.pattern_id,
            pattern.forbidden_behavior,
            pattern.reason,
            JSON.stringify(pattern.triggered_by),
            pattern.created_at
          )
        }),

      getTrajectories: (cycleId) =>
        Effect.sync(() => {
          const stmt = cycleId
            ? db.prepare("SELECT * FROM trajectories WHERE cycle_id = ?")
            : db.prepare("SELECT * FROM trajectories")
          const rows = cycleId ? stmt.all(cycleId) : stmt.all()
          return rows.map((row: any) => ({
            trajectory_id: row.trajectory_id as Schema.TrajectoryId,
            cycle_id: row.cycle_id as Schema.CycleId | undefined,
            skill_id: row.skill_id as Schema.SkillId,
            session_id: row.session_id,
            trigger_event: row.trigger_event as Schema.TriggerEvent,
            context: JSON.parse(row.context),
            actions: JSON.parse(row.actions),
            outcome: JSON.parse(row.outcome),
            feedback: row.feedback ? JSON.parse(row.feedback) : undefined,
            created_at: row.created_at,
          }))
        }),

      getCycles: (status) =>
        Effect.sync(() => {
          const stmt = status
            ? db.prepare("SELECT * FROM evolution_cycles WHERE status = ?")
            : db.prepare("SELECT * FROM evolution_cycles")
          const rows = status ? stmt.all(status) : stmt.all()
          return rows.map((row: any) => ({
            cycle_id: row.cycle_id as Schema.CycleId,
            trigger: row.trigger as Schema.CycleTrigger,
            trajectories: JSON.parse(row.trajectories),
            pattern: row.pattern as Schema.PatternId | undefined,
            confidence_model: row.confidence_model ? JSON.parse(row.confidence_model) : undefined,
            proposal: row.proposal,
            status: row.status as Schema.CycleStatus,
            created_at: row.created_at,
            updated_at: row.updated_at,
            provenance: JSON.parse(row.provenance),
          }))
        }),

      getPatterns: () =>
        Effect.sync(() => {
          const stmt = db.prepare("SELECT * FROM patterns")
          const rows = stmt.all()
          return rows.map((row: any) => ({
            pattern_id: row.pattern_id as Schema.PatternId,
            occurrence_count: row.occurrence_count,
            failure_rate: row.failure_rate,
            suggested_fix: row.suggested_fix,
            confidence: row.confidence,
            detected_at: row.detected_at,
          }))
        }),

      getNegativePatterns: () =>
        Effect.sync(() => {
          const stmt = db.prepare("SELECT * FROM negative_patterns")
          const rows = stmt.all()
          return rows.map((row: any) => ({
            pattern_id: row.pattern_id as Schema.PatternId,
            forbidden_behavior: row.forbidden_behavior,
            reason: row.reason as Schema.NegativePattern["reason"],
            triggered_by: JSON.parse(row.triggered_by),
            created_at: row.created_at,
          }))
        }),

      updateCycle: (cycle) =>
        Effect.sync(() => {
          const stmt = db.prepare(`
            UPDATE evolution_cycles
            SET status = ?, updated_at = ?, provenance = ?, pattern = ?, confidence_model = ?, proposal = ?
            WHERE cycle_id = ?
          `)
          stmt.run(
            cycle.status,
            cycle.updated_at,
            JSON.stringify(cycle.provenance),
            cycle.pattern || null,
            cycle.confidence_model ? JSON.stringify(cycle.confidence_model) : null,
            cycle.proposal || null,
            cycle.cycle_id
          )
        }),

      getPolicyTraces: (cycleId) =>
        Effect.sync(() => {
          const stmt = db.prepare("SELECT * FROM policy_traces WHERE cycle_id = ?")
          const rows = stmt.all(cycleId)
          return rows.map((row: any) => ({
            trace_id: row.trace_id as Schema.PolicyTrace["trace_id"],
            cycle_id: row.cycle_id as Schema.CycleId,
            decision_type: row.decision_type as Schema.PolicyTrace["decision_type"],
            matched_rules: JSON.parse(row.matched_rules),
            score_breakdown: JSON.parse(row.score_breakdown),
            final_decision: row.final_decision,
            rationale: row.rationale,
            created_at: row.created_at,
          }))
        }),
    })
  })
)

export const Test = evolutionDBLayer