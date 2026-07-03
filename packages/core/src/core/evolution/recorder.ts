import { Effect, Layer, Context } from "effect"
import { EvolutionDB, Test as EvolutionDBTest } from "./db"
import * as Schema from "./schema"
import { randomUUID } from "crypto"

export interface TrajectoryRecorderInterface {
  readonly record: (
    skillId: Schema.SkillId,
    sessionId: string,
    triggerEvent: Schema.TriggerEvent,
    context: Schema.TaskContext,
    actions: Schema.Action[],
    outcome: Schema.Outcome,
    feedback?: Schema.UserFeedback
  ) => Effect.Effect<Schema.TrajectoryId>

  readonly recordHook: (
    skillId: Schema.SkillId,
    sessionId: string,
    hookType: "start" | "end" | "error",
    context: Schema.TaskContext
  ) => Effect.Effect<void>
}

export class TrajectoryRecorder extends Context.Service<TrajectoryRecorder, TrajectoryRecorderInterface>()("@opencode/evolution/TrajectoryRecorder") {}

export const trajectoryRecorderLayer: Layer.Layer<TrajectoryRecorder, never, EvolutionDB> = Layer.effect(
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

    return TrajectoryRecorder.of({
      record: recordImpl,

      recordHook: (skillId, sessionId, hookType, context) =>
        Effect.gen(function* () {
          const hookKey = `${skillId}:${sessionId}`

          if (hookType === "start") {
            ongoingTrajectories.set(hookKey, {
              actions: [],
              startTime: Date.now(),
            })

            yield* recordImpl(
              skillId,
              sessionId,
              "skill_start",
              context,
              [],
              {
                success: true,
                duration_ms: 0,
              }
            )
          } else if (hookType === "end" || hookType === "error") {
            const ongoing = ongoingTrajectories.get(hookKey)
            if (!ongoing) return

            const duration = Date.now() - ongoing.startTime

            yield* recordImpl(
              skillId,
              sessionId,
              hookType === "end" ? "skill_end" : "error",
              context,
              ongoing.actions,
              {
                success: hookType === "end",
                duration_ms: duration,
                error_message: hookType === "error" ? "Skill execution failed" : undefined,
              }
            )

            ongoingTrajectories.delete(hookKey)
          }
        }),
    })
  })
)

export const Test = Layer.provide(
  trajectoryRecorderLayer,
  EvolutionDBTest
)