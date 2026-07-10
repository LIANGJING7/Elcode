import { Effect } from "effect"
import { describe, it, expect } from "bun:test"
import { EvolutionDB, evolutionDBLayer } from "../db"
import * as Schema from "../schema"

describe("EvolutionDB", () => {
  it("should initialize database schema", async () => {
    const program = Effect.gen(function* () {
      const db = yield* EvolutionDB
      yield* db.init()

      const trajectories = yield* db.getTrajectories()
      expect(trajectories.length).toBe(0)

      const cycles = yield* db.getCycles()
      expect(cycles.length).toBe(0)
    })

    await Effect.runPromise(program.pipe(Effect.provide(evolutionDBLayer)))
  })

  it("should insert and retrieve trajectory", async () => {
    const program = Effect.gen(function* () {
      const db = yield* EvolutionDB
      yield* db.init()

      const trajectory: Schema.Trajectory = {
        trajectory_id: "traj_001" as Schema.TrajectoryId,
        skill_id: "skill_001" as Schema.SkillId,
        session_id: "session_001",
        trigger_event: "skill_start",
        context: {
          description: "Test task",
          environment: {},
        },
        actions: [],
        outcome: {
          success: true,
          duration_ms: 100,
        },
        created_at: Date.now(),
      }

      yield* db.insertTrajectory(trajectory)

      const retrieved = yield* db.getTrajectories()
      expect(retrieved.length).toBe(1)
      expect(retrieved[0].trajectory_id).toBe(trajectory.trajectory_id)
    })

    await Effect.runPromise(program.pipe(Effect.provide(evolutionDBLayer)))
  })

  it("should insert and retrieve evolution cycle", async () => {
    const program = Effect.gen(function* () {
      const db = yield* EvolutionDB
      yield* db.init()

      const cycle: Schema.EvolutionCycle = {
        cycle_id: "cycle_001" as Schema.CycleId,
        trigger: "failure_spike",
        trajectories: [],
        status: "recorded",
        created_at: Date.now(),
        updated_at: Date.now(),
        provenance: ["init"],
      }

      yield* db.insertCycle(cycle)

      const retrieved = yield* db.getCycles()
      expect(retrieved.length).toBe(1)
      expect(retrieved[0].cycle_id).toBe(cycle.cycle_id)
    })

    await Effect.runPromise(program.pipe(Effect.provide(evolutionDBLayer)))
  })

  it("should update cycle status", async () => {
    const program = Effect.gen(function* () {
      const db = yield* EvolutionDB
      yield* db.init()

      const cycle: Schema.EvolutionCycle = {
        cycle_id: "cycle_002" as Schema.CycleId,
        trigger: "manual",
        trajectories: [],
        status: "recorded",
        created_at: Date.now(),
        updated_at: Date.now(),
        provenance: ["init"],
      }

      yield* db.insertCycle(cycle)

      const updatedCycle: Schema.EvolutionCycle = {
        ...cycle,
        status: "patterned",
        updated_at: Date.now(),
        provenance: [...cycle.provenance, "pattern_detected"],
      }

      yield* db.updateCycle(updatedCycle)

      const retrieved = yield* db.getCycles("patterned")
      expect(retrieved.length).toBe(1)
      expect(retrieved[0].status).toBe("patterned")
    })

    await Effect.runPromise(program.pipe(Effect.provide(evolutionDBLayer)))
  })
})