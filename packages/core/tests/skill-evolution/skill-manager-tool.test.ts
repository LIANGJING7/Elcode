import { describe, expect, test } from "bun:test"
import { Effect, Layer, Context } from "effect"
import { SkillManagerTool } from "@/skill-evolution/skill-manager-tool"
import { UsageTracker } from "@/skill-evolution/usage-tracker"
import { Database } from "@/core/database/database"
import { FSUtil } from "@/core/fs-util"
import { Global } from "@/core/global"
import { SkillV2 } from "@/core/skill"
import { access, readFile } from "fs/promises"

const mockSkillV2Layer = Layer.effect(
  SkillV2.Service,
  Effect.sync(() =>
    SkillV2.Service.of({
      transform: Effect.fn("MockSkillV2.transform")(function* () {}),
      sources: Effect.fn("MockSkillV2.sources")(function* () {
        return []
      }),
      list: Effect.fn("MockSkillV2.list")(function* () {
        return []
      }),
    }),
  ),
)

describe("SkillManagerTool", () => {
  test("should create skill file", async () => {
    const testLayer = SkillManagerTool.layer.pipe(
      Layer.provide(UsageTracker.layer),
      Layer.provide(mockSkillV2Layer),
      Layer.provide(FSUtil.defaultLayer),
      Layer.provide(Global.defaultLayer),
      Layer.provide(Database.layerFromPath(":memory:")),
    )

    const program = Effect.gen(function* () {
      const result = yield* SkillManagerTool.use.create("test-skill", "Test prompt content", "test reason")
      return result
    }).pipe(Effect.provide(testLayer))

    const skillPath = await Effect.runPromise(program)

    expect(skillPath).toContain("test-skill")
    expect(skillPath).toContain("SKILL.md")

    const fileExists = await access(skillPath).then(() => true).catch(() => false)
    expect(fileExists).toBe(true)

    const content = await readFile(skillPath, "utf-8")
    expect(content).toContain("test-skill")
    expect(content).toContain("Test prompt content")
  })

  test("should record usage after creation", async () => {
    const dbLayer = Database.layerFromPath(":memory:")

    const testLayer = SkillManagerTool.layer.pipe(
      Layer.provide(UsageTracker.layer),
      Layer.provide(mockSkillV2Layer),
      Layer.provide(FSUtil.defaultLayer),
      Layer.provide(Global.defaultLayer),
    )

    const program = Effect.gen(function* () {
      yield* SkillManagerTool.use.create("usage-test", "prompt", "reason")
      const stats = yield* UsageTracker.use.getStats("usage-test")
      return stats
    })
      .pipe(Effect.provide(UsageTracker.layer))
      .pipe(Effect.provide(testLayer))
      .pipe(Effect.provide(dbLayer))

    const stats = await Effect.runPromise(program)

    expect(stats?.use_count).toBe(1)
    expect(stats?.lifecycle_state).toBe("active")
  })
})