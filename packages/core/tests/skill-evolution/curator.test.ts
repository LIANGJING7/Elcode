import { describe, expect, test } from "bun:test"
import { Effect, Layer, Stream } from "effect"
import { SkillCurator } from "@/skill-evolution/curator"
import { UsageTracker } from "@/skill-evolution/usage-tracker"
import { LifecycleState } from "@/skill-evolution/types"
import { Database } from "@/core/database/database"
import { FSUtil } from "@/core/fs-util"
import { EventV2 } from "@/core/event"
import { skill_usage } from "@/skill-evolution/schema"
import { SkillDeprecated } from "@/skill-evolution/events"
import { join } from "path"
import { mkdir, rm } from "fs/promises"

describe("SkillCurator", () => {
  test("should mark skills as stale after 30 days", async () => {
    const dbLayer = Database.layerFromPath(":memory:")
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000

    const program = Effect.gen(function* () {
      const { db } = yield* Database.Service

      yield* db
        .insert(skill_usage)
        .values({
          skill_name: "stale-test",
          use_count: 1,
          last_used_at: thirtyOneDaysAgo,
          first_used_at: thirtyOneDaysAgo,
          lifecycle_state: LifecycleState.ACTIVE,
          time_created: thirtyOneDaysAgo,
          time_updated: thirtyOneDaysAgo,
        })
        .run()

      yield* SkillCurator.use.scan()

      const stats = yield* UsageTracker.use.getStats("stale-test")

      return stats?.lifecycle_state
    })
      .pipe(Effect.provide(SkillCurator.layer))
      .pipe(Effect.provide(UsageTracker.layer))
      .pipe(Effect.provide(FSUtil.defaultLayer))
      .pipe(Effect.provide(EventV2.layer))
      .pipe(Effect.provide(dbLayer))

    const lifecycleState = await Effect.runPromise(program)

    expect(lifecycleState).toBe(LifecycleState.STALE)
  })

  test("should mark skills as archived after 90 days", async () => {
    const dbLayer = Database.layerFromPath(":memory:")
    const ninetyOneDaysAgo = Date.now() - 91 * 24 * 60 * 60 * 1000
    
    const testHome = join(process.cwd(), "test-home-" + Date.now())
    const skillsDir = join(testHome, ".config", "opencode", "skills")
    const skillDir = join(skillsDir, "archive-test")
    const skillFile = join(skillDir, "SKILL.md")
    const archiveDir = join(skillsDir, ".archive")
    const archivedFile = join(archiveDir, "archive-test", "SKILL.md")

    await mkdir(skillDir, { recursive: true })
    await import("fs/promises").then((fs) => fs.writeFile(skillFile, "# archive-test\nTest content"))

    const originalHome = process.env.LCODE_TEST_HOME
    process.env.LCODE_TEST_HOME = testHome

    const program = Effect.gen(function* () {
      const { db } = yield* Database.Service
      const fsys = yield* FSUtil.Service

      yield* db
        .insert(skill_usage)
        .values({
          skill_name: "archive-test",
          use_count: 1,
          last_used_at: ninetyOneDaysAgo,
          first_used_at: ninetyOneDaysAgo,
          lifecycle_state: LifecycleState.STALE,
          time_created: ninetyOneDaysAgo,
          time_updated: ninetyOneDaysAgo,
        })
        .run()

      yield* SkillCurator.use.scan()

      const stats = yield* UsageTracker.use.getStats("archive-test")

      const exists = yield* fsys.exists(archivedFile)

      return { lifecycleState: stats?.lifecycle_state, archived: exists }
    })
      .pipe(Effect.provide(SkillCurator.layer))
      .pipe(Effect.provide(UsageTracker.layer))
      .pipe(Effect.provide(FSUtil.defaultLayer))
      .pipe(Effect.provide(EventV2.layer))
      .pipe(Effect.provide(dbLayer))

    const result = await Effect.runPromise(program)

    expect(result.lifecycleState).toBe(LifecycleState.ARCHIVED)
    expect(result.archived).toBe(true)

    process.env.LCODE_TEST_HOME = originalHome
    await rm(testHome, { recursive: true, force: true }).catch(() => {})
  })

  test("should not archive active skills", async () => {
    const dbLayer = Database.layerFromPath(":memory:")

    const program = Effect.gen(function* () {
      const { db } = yield* Database.Service

      yield* db
        .insert(skill_usage)
        .values({
          skill_name: "active-test",
          use_count: 5,
          last_used_at: Date.now(),
          first_used_at: Date.now(),
          lifecycle_state: LifecycleState.ACTIVE,
          time_created: Date.now(),
          time_updated: Date.now(),
        })
        .run()

      yield* SkillCurator.use.scan()

      const stats = yield* UsageTracker.use.getStats("active-test")

      return stats?.lifecycle_state
    })
      .pipe(Effect.provide(SkillCurator.layer))
      .pipe(Effect.provide(UsageTracker.layer))
      .pipe(Effect.provide(FSUtil.defaultLayer))
      .pipe(Effect.provide(EventV2.layer))
      .pipe(Effect.provide(dbLayer))

    const lifecycleState = await Effect.runPromise(program)

    expect(lifecycleState).toBe(LifecycleState.ACTIVE)
  })

  test("should publish SkillDeprecated events on archive", async () => {
    const dbLayer = Database.layerFromPath(":memory:")
    const ninetyOneDaysAgo = Date.now() - 91 * 24 * 60 * 60 * 1000

    const program = Effect.gen(function* () {
      const { db } = yield* Database.Service
      const events = yield* EventV2.Service

      let eventReceived = false

      const listener = (event: any) =>
        Effect.sync(() => {
          if (event.data.skillName === "event-test") {
            eventReceived = true
          }
        })

      yield* events.listen(listener)

      yield* db
        .insert(skill_usage)
        .values({
          skill_name: "event-test",
          use_count: 1,
          last_used_at: ninetyOneDaysAgo,
          first_used_at: ninetyOneDaysAgo,
          lifecycle_state: LifecycleState.STALE,
          time_created: ninetyOneDaysAgo,
          time_updated: ninetyOneDaysAgo,
        })
        .run()

      yield* SkillCurator.use.scan()

      yield* Effect.sleep(200)

      return eventReceived
    })
      .pipe(Effect.provide(SkillCurator.layer))
      .pipe(Effect.provide(UsageTracker.layer))
      .pipe(Effect.provide(FSUtil.defaultLayer))
      .pipe(Effect.provide(EventV2.layer))
      .pipe(Effect.provide(dbLayer))

    const received = await Effect.runPromise(program)

    expect(received).toBe(true)
  })
})