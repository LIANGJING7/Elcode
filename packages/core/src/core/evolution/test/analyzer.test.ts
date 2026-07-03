import { Effect, Layer } from "effect"
import { describe, it, expect } from "bun:test"
import { PatternAnalyzer, patternAnalyzerLayer } from "../analyzer"
import { EvolutionDB, evolutionDBLayer } from "../db"
import * as Schema from "../schema"

const combinedLayer = Layer.merge(
  Layer.provide(patternAnalyzerLayer, evolutionDBLayer),
  evolutionDBLayer
)

describe("PatternAnalyzer", () => {
  it("should calculate confidence correctly", async () => {
    const program = Effect.gen(function* () {
      const analyzer = yield* PatternAnalyzer
      
      const lowConfidence = analyzer.calculateConfidence(1, 0.5)
      expect(lowConfidence).toBeLessThan(0.5)
      
      const highConfidence = analyzer.calculateConfidence(10, 0.1)
      expect(highConfidence).toBeGreaterThan(0.7)
      
      const zeroCount = analyzer.calculateConfidence(0, 0.5)
      expect(zeroCount).toBe(0)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should detect failure patterns from trajectories", async () => {
    const program = Effect.gen(function* () {
      const analyzer = yield* PatternAnalyzer
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      const trajectories: Schema.Trajectory[] = [
        {
          trajectory_id: "traj_1" as Schema.TrajectoryId,
          skill_id: "skill_test" as Schema.SkillId,
          session_id: "session_1",
          trigger_event: "skill_end",
          context: { description: "Task A", environment: {} },
          actions: [],
          outcome: { success: false, duration_ms: 100, error_message: "Failed" },
          feedback: { suggested_fix: "Fix A" },
          created_at: Date.now(),
        },
        {
          trajectory_id: "traj_2" as Schema.TrajectoryId,
          skill_id: "skill_test" as Schema.SkillId,
          session_id: "session_2",
          trigger_event: "skill_end",
          context: { description: "Task A", environment: {} },
          actions: [],
          outcome: { success: false, duration_ms: 100, error_message: "Failed" },
          created_at: Date.now(),
        },
        {
          trajectory_id: "traj_3" as Schema.TrajectoryId,
          skill_id: "skill_test" as Schema.SkillId,
          session_id: "session_3",
          trigger_event: "skill_end",
          context: { description: "Task A", environment: {} },
          actions: [],
          outcome: { success: false, duration_ms: 100, error_message: "Failed" },
          feedback: { suggested_fix: "Fix B" },
          created_at: Date.now(),
        },
      ]
      
      const patterns = yield* analyzer.detectFailurePatterns(trajectories)
      expect(patterns.length).toBe(1)
      expect(patterns[0].occurrence_count).toBe(3)
      expect(patterns[0].failure_rate).toBe(1)
      expect(patterns[0].suggested_fix).toBe("Fix A")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should analyze patterns for a cycle", async () => {
    const program = Effect.gen(function* () {
      const analyzer = yield* PatternAnalyzer
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      const cycle: Schema.EvolutionCycle = {
        cycle_id: "cycle_1" as Schema.CycleId,
        trigger: "failure_spike",
        trajectories: ["traj_1", "traj_2", "traj_3"] as Schema.TrajectoryId[],
        status: "recorded",
        created_at: Date.now(),
        updated_at: Date.now(),
        provenance: ["init"],
      }
      
      yield* db.insertCycle(cycle)
      
      const trajectories: Schema.Trajectory[] = [
        {
          trajectory_id: "traj_1" as Schema.TrajectoryId,
          cycle_id: "cycle_1" as Schema.CycleId,
          skill_id: "skill_test" as Schema.SkillId,
          session_id: "session_1",
          trigger_event: "skill_end",
          context: { description: "Task B", environment: {} },
          actions: [],
          outcome: { success: false, duration_ms: 100 },
          created_at: Date.now(),
        },
        {
          trajectory_id: "traj_2" as Schema.TrajectoryId,
          cycle_id: "cycle_1" as Schema.CycleId,
          skill_id: "skill_test" as Schema.SkillId,
          session_id: "session_2",
          trigger_event: "skill_end",
          context: { description: "Task B", environment: {} },
          actions: [],
          outcome: { success: false, duration_ms: 100 },
          created_at: Date.now(),
        },
        {
          trajectory_id: "traj_3" as Schema.TrajectoryId,
          cycle_id: "cycle_1" as Schema.CycleId,
          skill_id: "skill_test" as Schema.SkillId,
          session_id: "session_3",
          trigger_event: "skill_end",
          context: { description: "Task B", environment: {} },
          actions: [],
          outcome: { success: false, duration_ms: 100 },
          created_at: Date.now(),
        },
      ]
      
      for (const traj of trajectories) {
        yield* db.insertTrajectory(traj)
      }
      
      const patterns = yield* analyzer.analyze("cycle_1" as Schema.CycleId)
      expect(patterns.length).toBe(1)
      
      const storedPatterns = yield* db.getPatterns()
      expect(storedPatterns.length).toBe(1)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
})