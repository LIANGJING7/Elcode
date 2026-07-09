import { Effect, Layer, Context } from "effect"
import { describe, it, expect } from "bun:test"
import { EvolutionDB, evolutionDBLayer } from "../db"
import { TrajectoryRecorder } from "../recorder"
import * as Schema from "../schema"
import { randomUUID } from "crypto"

const testTrajectoryRecorderLayer = Layer.effect(
  TrajectoryRecorder,
  Effect.gen(function* () {
    const db = yield* EvolutionDB
    
    const ongoingTrajectories = new Map<string, {
      actions: Schema.Action[]
      startTime: number
    }>()
    
    const recordImpl = (skillId: Schema.SkillId, sessionId: string, triggerEvent: Schema.TriggerEvent, context: Schema.TaskContext, actions: Schema.Action[], outcome: Schema.Outcome, feedback?: Schema.UserFeedback) =>
      Effect.gen(function* () {
        const trajectoryId = randomUUID() as Schema.TrajectoryId
        const trajectory: Schema.Trajectory = {
          trajectory_id: trajectoryId,
          skill_id: skillId,
          session_id: sessionId,
          trigger_event: triggerEvent,
          context,
          actions,
          outcome,
          feedback,
          created_at: Date.now(),
        }
        yield* db.insertTrajectory(trajectory)
        return trajectoryId
      })
    
    const recordHookImpl = (skillId: Schema.SkillId, sessionId: string, hookType: "start" | "end" | "error", context: Schema.TaskContext) =>
      Effect.gen(function* () {
        const hookKey = `${skillId}:${sessionId}`
        
        if (hookType === "start") {
          ongoingTrajectories.set(hookKey, { actions: [], startTime: Date.now() })
          yield* recordImpl(skillId, sessionId, "skill_start", context, [], { success: true, duration_ms: 0 })
        } else {
          const ongoing = ongoingTrajectories.get(hookKey)
          if (!ongoing) return
          const duration = Date.now() - ongoing.startTime
          yield* recordImpl(
            skillId, sessionId,
            hookType === "end" ? "skill_end" : "error",
            context, ongoing.actions,
            { success: hookType === "end", duration_ms: duration, error_message: hookType === "error" ? "Skill execution failed" : undefined }
          )
          ongoingTrajectories.delete(hookKey)
        }
      })
    
    return TrajectoryRecorder.of({
      record: recordImpl,
      recordHook: recordHookImpl,
    })
  })
)

describe("TrajectoryRecorder", () => {
  it("should record a complete trajectory", async () => {
    const combinedLayer = Layer.merge(
      Layer.provide(testTrajectoryRecorderLayer, evolutionDBLayer),
      evolutionDBLayer
    )
    
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
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })

  it("should record skill start/end hooks", async () => {
    const combinedLayer = Layer.merge(
      Layer.provide(testTrajectoryRecorderLayer, evolutionDBLayer),
      evolutionDBLayer
    )
    
    const program = Effect.gen(function* () {
      const recorder = yield* TrajectoryRecorder
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      yield* recorder.recordHook(
        "skill_test" as Schema.SkillId,
        "session_001",
        "start",
        { description: "Test hook", environment: {} }
      )
      
      yield* recorder.recordHook(
        "skill_test" as Schema.SkillId,
        "session_001",
        "end",
        { description: "Test hook", environment: {} }
      )
      
      const trajectories = yield* db.getTrajectories()
      expect(trajectories.length).toBe(2)
      expect(trajectories[0].trigger_event).toBe("skill_start")
      expect(trajectories[1].trigger_event).toBe("skill_end")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
})