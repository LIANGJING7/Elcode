import { Effect, Layer } from "effect"
import { describe, it, expect } from "bun:test"
import { TrajectoryRecorder, trajectoryRecorderLayer } from "../recorder"
import { EvolutionDB, evolutionDBLayer } from "../db"
import * as Schema from "../schema"

describe("TrajectoryRecorder", () => {
  it("should record a complete trajectory", async () => {
    const program = Effect.gen(function* () {
      const recorder = yield* TrajectoryRecorder
      const db = yield* EvolutionDB

      yield* db.init()

      const trajectoryId = yield* recorder.record(
        "skill_test" as Schema.SkillId,
        "session_001",
        "skill_end",
        {
          description: "Test task",
          environment: {},
        },
        [
          {
            tool_name: "bash",
            tool_input: { command: "echo test" },
            timestamp: Date.now(),
          },
        ],
        {
          success: true,
          duration_ms: 100,
        }
      )

      expect(trajectoryId).toBeDefined()

      const trajectories = yield* db.getTrajectories()
      expect(trajectories.length).toBe(1)
      expect(trajectories[0].actions.length).toBe(1)
    })

    const testLayer = Layer.merge(
      evolutionDBLayer,
      trajectoryRecorderLayer
    )
    await Effect.runPromise(program.pipe(Effect.provide(testLayer)))
  })

  it("should record skill start/end hooks", async () => {
    const program = Effect.gen(function* () {
      const recorder = yield* TrajectoryRecorder
      const db = yield* EvolutionDB

      yield* db.init()

      yield* recorder.recordHook(
        "skill_test" as Schema.SkillId,
        "session_002",
        "start",
        { description: "Test hook", environment: {} }
      )

      yield* recorder.recordHook(
        "skill_test" as Schema.SkillId,
        "session_002",
        "end",
        { description: "Test hook", environment: {} }
      )

      const trajectories = yield* db.getTrajectories()
      expect(trajectories.length).toBe(2)
      expect(trajectories[0].trigger_event).toBe("skill_start")
      expect(trajectories[1].trigger_event).toBe("skill_end")
    })

    const testLayer = Layer.merge(
      evolutionDBLayer,
      trajectoryRecorderLayer
    )
    await Effect.runPromise(program.pipe(Effect.provide(testLayer)))
  })
})