import { Effect, Layer, Context, Clock, Schedule } from "effect"
import { and, eq, lt } from "drizzle-orm"
import { serviceUse } from "@/core/effect/service-use"
import { Database } from "@/core/database/database"
import { FSUtil } from "@/core/fs-util"
import { EventV2 } from "@/core/event"
import { skill_usage } from "./schema"
import { LifecycleState } from "./types"
import { SkillDeprecated } from "./events"
import os from "os"
import path from "path"

export interface Interface {
  readonly scan: () => Effect.Effect<void, never, Database.Service | FSUtil.Service | EventV2.Service | Clock.Clock>
  readonly startScheduler: () => Effect.Effect<void, never, Database.Service | FSUtil.Service | EventV2.Service | Clock.Clock>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/SkillCurator") {}

export const use = serviceUse(Service)

export const layer: Layer.Layer<Service, never, Database.Service | FSUtil.Service | EventV2.Service | Clock.Clock> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const { db } = yield* Database.Service
    const fsys = yield* FSUtil.Service
    const events = yield* EventV2.Service

    const scan = Effect.fn("SkillCurator.scan")(function* () {
      const now = yield* Clock.currentTimeMillis
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000

      const staleThreshold = now - thirtyDaysMs
      const archiveThreshold = now - ninetyDaysMs

      yield* db
        .update(skill_usage)
        .set({
          lifecycle_state: LifecycleState.STALE,
          time_updated: now,
        })
        .where(
          and(
            eq(skill_usage.lifecycle_state, LifecycleState.ACTIVE),
            lt(skill_usage.last_used_at, staleThreshold),
          ),
        )
        .run()

      const toArchive = yield* db
        .select()
        .from(skill_usage)
        .where(
          and(
            eq(skill_usage.lifecycle_state, LifecycleState.STALE),
            lt(skill_usage.last_used_at, archiveThreshold),
          ),
        )
        .all()

      for (const skill of toArchive) {
        const skillsBaseDir = path.join(process.env.LCODE_TEST_HOME ?? os.homedir(), ".config", "opencode", "skills")
        const archiveDir = path.join(skillsBaseDir, ".archive")
        const activePath = path.join(skillsBaseDir, skill.skill_name)
        const archivePath = path.join(archiveDir, skill.skill_name)

        const exists = yield* fsys.exists(activePath)
        if (exists) {
          yield* fsys.ensureDir(archiveDir)
          yield* Effect.tryPromise({
            try: async () => {
              const { rename } = await import("fs/promises")
              await rename(activePath, archivePath)
              return true
            },
            catch: (error) => new Error(`Failed to archive skill ${skill.skill_name}: ${error}`),
          })
        }

        yield* db
          .update(skill_usage)
          .set({
            lifecycle_state: LifecycleState.ARCHIVED,
            time_updated: now,
          })
          .where(eq(skill_usage.skill_name, skill.skill_name))
          .run()

        yield* events.publish(SkillDeprecated, {
          skillName: skill.skill_name,
          reason: "Unused for 90 days",
          lifecycleState: LifecycleState.ARCHIVED,
        })
      }
    })

    const startScheduler = Effect.fn("SkillCurator.startScheduler")(function* () {
      const schedule = Schedule.spaced(24 * 60 * 60 * 1000)
      yield* Effect.repeat(scan, schedule)
    })

    return Service.of({
      scan,
      startScheduler,
    })
  }),
)

export const defaultLayer = layer.pipe(
  Layer.provide(Database.defaultLayer),
  Layer.provide(FSUtil.defaultLayer),
  Layer.provide(EventV2.layer),
)

export * as SkillCurator from "./curator"