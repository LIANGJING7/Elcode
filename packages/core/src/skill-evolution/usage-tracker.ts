import { eq } from "drizzle-orm"
import { serviceUse } from "@/core/effect/service-use"
import { Effect, Layer, Context, Clock } from "effect"
import { Database } from "@/core/database/database"
import { skill_usage } from "./schema"
import { LifecycleState, type UsageStats } from "./types"

export type SkillUsageRow = typeof skill_usage.$inferSelect

export interface Interface {
  readonly recordUse: (skillName: string) => Effect.Effect<void, never, Database.Service | Clock.Clock>
  readonly getStats: (skillName: string) => Effect.Effect<SkillUsageRow | undefined, never, Database.Service>
  readonly markArchived: (skillName: string) => Effect.Effect<void, never, Database.Service | Clock.Clock>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/UsageTracker") {}

export const use = serviceUse(Service)

export const layer: Layer.Layer<Service, never, Database.Service | Clock.Clock> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const { db } = yield* Database.Service

    const recordUse = Effect.fn("UsageTracker.recordUse")(function* (skillName: string) {
      const now = yield* Clock.currentTimeMillis

      const existing = yield* db.select().from(skill_usage).where(eq(skill_usage.skill_name, skillName)).get()

      if (existing) {
        yield* db
          .update(skill_usage)
          .set({
            use_count: existing.use_count + 1,
            last_used_at: now,
            time_updated: now,
          })
          .where(eq(skill_usage.skill_name, skillName))
          .run()
      } else {
        yield* db
          .insert(skill_usage)
          .values({
            skill_name: skillName,
            use_count: 1,
            last_used_at: now,
            first_used_at: now,
            lifecycle_state: LifecycleState.ACTIVE,
            time_created: now,
            time_updated: now,
          })
          .run()
      }
    })

    const getStats = Effect.fn("UsageTracker.getStats")((skillName: string) =>
      db.select().from(skill_usage).where(eq(skill_usage.skill_name, skillName)).get(),
    )

    const markArchived = Effect.fn("UsageTracker.markArchived")(function* (skillName: string) {
      const now = yield* Clock.currentTimeMillis

      yield* db
        .update(skill_usage)
        .set({
          lifecycle_state: LifecycleState.ARCHIVED,
          time_updated: now,
        })
        .where(eq(skill_usage.skill_name, skillName))
        .run()
    })

    return Service.of({
      recordUse,
      getStats,
      markArchived,
    })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(Database.defaultLayer))

export * as UsageTracker from "./usage-tracker"