import { Effect, Layer } from "effect"
import { describe, it, expect } from "bun:test"
import { CycleTrigger, CycleBuilder, cycleTriggerLayer, cycleBuilderLayer } from "../cycle"
import { EvolutionDB, evolutionDBLayer } from "../db"
import * as Schema from "../schema"

const combinedLayer = Layer.merge(
  Layer.merge(
    Layer.provide(cycleTriggerLayer, evolutionDBLayer),
    Layer.provide(cycleBuilderLayer, evolutionDBLayer)
  ),
  evolutionDBLayer
)

describe("CycleTrigger", () => {
  it("should trigger when failure rate exceeds threshold", async () => {
    const program = Effect.gen(function* () {
      const trigger = yield* CycleTrigger
      
      expect(trigger.shouldTrigger(0.2)).toBe(false)
      expect(trigger.shouldTrigger(0.35)).toBe(true)
      expect(trigger.shouldTrigger(0.5)).toBe(true)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should check trajectories and trigger cycle", async () => {
    const program = Effect.gen(function* () {
      const trigger = yield* CycleTrigger
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      for (let i = 0; i < 12; i++) {
        const traj: Schema.Trajectory = {
          trajectory_id: `traj_${i}` as Schema.TrajectoryId,
          skill_id: "skill_test" as Schema.SkillId,
          session_id: `session_${i}`,
          trigger_event: "skill_end",
          context: { description: "Task", environment: {} },
          actions: [],
          outcome: { success: i % 3 === 0, duration_ms: 100 },
          created_at: Date.now(),
        }
        yield* db.insertTrajectory(traj)
      }
      
      const cycleId = yield* trigger.checkAndTrigger()
      expect(cycleId).toBeDefined()
      
      const cycles = yield* db.getCycles()
      expect(cycles.length).toBe(1)
      expect(cycles[0].trigger).toBe("failure_spike")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
})

describe("CycleBuilder", () => {
  it("should start a cycle with given trigger", async () => {
    const program = Effect.gen(function* () {
      const builder = yield* CycleBuilder
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      const cycleId = yield* builder.startCycle("manual")
      expect(cycleId).toBeDefined()
      
      const cycles = yield* db.getCycles()
      expect(cycles.length).toBe(1)
      expect(cycles[0].trigger).toBe("manual")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should manage cycle lifecycle", async () => {
    const program = Effect.gen(function* () {
      const builder = yield* CycleBuilder
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      const cycleId = yield* builder.startCycle("manual")
      
      yield* builder.addTrajectory(cycleId, "traj_1" as Schema.TrajectoryId)
      yield* builder.addTrajectory(cycleId, "traj_2" as Schema.TrajectoryId)
      
      yield* builder.setPattern(cycleId, "pattern_1" as Schema.PatternId)
      
      const proposal: Schema.SkillProposal = {
        skill_name: "new_skill",
        skill_description: "A new skill proposal",
        rationale: "Based on detected pattern",
        estimated_impact: "high",
      }
      yield* builder.setProposal(cycleId, proposal)
      
      yield* builder.completeCycle(cycleId)
      
      const cycles = yield* db.getCycles()
      const cycle = cycles.find(c => c.cycle_id === cycleId)
      expect(cycle?.status).toBe("completed")
      expect(cycle?.trajectories.length).toBe(2)
      expect(cycle?.pattern).toBe("pattern_1" as Schema.PatternId)
      expect(cycle?.proposal).toBeDefined()
      expect(cycle?.provenance.length).toBe(6)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
})