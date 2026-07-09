import { Effect, Layer } from "effect"
import { describe, it, expect } from "bun:test"
import { ReplayEngine, replayEngineLayer, MockEnv, mockEnvLayer } from "../replay"
import { EvolutionDB, evolutionDBLayer } from "../db"
import * as Schema from "../schema"

const combinedLayer = Layer.merge(
  Layer.provide(replayEngineLayer, Layer.merge(mockEnvLayer, evolutionDBLayer)),
  Layer.merge(mockEnvLayer, evolutionDBLayer)
)

describe("ReplayEngine", () => {
  it("should compare results correctly", async () => {
    const program = Effect.gen(function* () {
      const engine = yield* ReplayEngine
      
      const original: Schema.Outcome = { success: true, duration_ms: 100 }
      const replayed: Schema.Outcome = { success: true, duration_ms: 95 }
      
      const comparison = yield* engine.compareResults(original, replayed)
      expect(comparison.match).toBe(true)
      expect(comparison.differences.length).toBe(0)
      
      const mismatchedOriginal: Schema.Outcome = { success: true, duration_ms: 100 }
      const mismatchedReplayed: Schema.Outcome = { success: false, duration_ms: 200 }
      
      const mismatchComparison = yield* engine.compareResults(mismatchedOriginal, mismatchedReplayed)
      expect(mismatchComparison.match).toBe(false)
      expect(mismatchComparison.differences.length).toBeGreaterThan(0)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should setup mock environment from trajectory", async () => {
    const program = Effect.gen(function* () {
      const engine = yield* ReplayEngine
      const mockEnv = yield* MockEnv
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      const trajectory: Schema.Trajectory = {
        trajectory_id: "traj_mock" as Schema.TrajectoryId,
        skill_id: "skill_mock" as Schema.SkillId,
        session_id: "session_mock",
        trigger_event: "skill_end",
        context: { description: "Mock test", environment: {} },
        actions: [
          { tool_name: "bash", tool_input: { command: "echo test" }, timestamp: Date.now() },
          { tool_name: "read", tool_input: { path: "/test" }, timestamp: Date.now() + 100 },
        ],
        outcome: { success: true, duration_ms: 200 },
        created_at: Date.now(),
      }
      
      yield* db.insertTrajectory(trajectory)
      yield* engine.setupMockEnvironment(trajectory)
      
      const bashResult = mockEnv.getMockResult("bash", { command: "echo test" })
      expect(bashResult).toBeDefined()
      expect(bashResult.success).toBe(true)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should replay trajectory and return result", async () => {
    const program = Effect.gen(function* () {
      const engine = yield* ReplayEngine
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      const trajectory: Schema.Trajectory = {
        trajectory_id: "traj_replay" as Schema.TrajectoryId,
        skill_id: "skill_replay" as Schema.SkillId,
        session_id: "session_replay",
        trigger_event: "skill_end",
        context: { description: "Replay test", environment: {} },
        actions: [
          { tool_name: "bash", tool_input: { command: "ls" }, timestamp: Date.now() },
        ],
        outcome: { success: true, duration_ms: 50 },
        created_at: Date.now(),
      }
      
      yield* db.insertTrajectory(trajectory)
      
      const result = yield* engine.replayTrajectory("traj_replay" as Schema.TrajectoryId)
      expect(result.replay_success).toBe(true)
      expect(result.comparison.match).toBe(true)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
})