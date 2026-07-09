import { describe, expect, test } from "bun:test"
import { Effect, Layer, Context } from "effect"
import { SkillManagerTool, InvalidSkillNameError, SkillNotFoundError } from "@/skill-evolution/skill-manager-tool"
import { UsageTracker } from "@/skill-evolution/usage-tracker"
import { Database } from "@/core/database/database"
import { FSUtil } from "@/core/fs-util"
import { Global } from "@/core/global"
import { SkillV2 } from "@/core/skill"
import { access, readFile } from "fs/promises"
import { join } from "path"
import os from "os"

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

const mockSkillV2LayerWithSkills = (skills: Array<{ name: string; location: string }>) =>
  Layer.effect(
    SkillV2.Service,
    Effect.sync(() =>
      SkillV2.Service.of({
        transform: Effect.fn("MockSkillV2.transform")(function* () {}),
        sources: Effect.fn("MockSkillV2.sources")(function* () {
          return []
        }),
        list: Effect.fn("MockSkillV2.list")(function* () {
          return skills
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

  test("should reject path traversal in skill name", async () => {
    const testLayer = SkillManagerTool.layer.pipe(
      Layer.provide(UsageTracker.layer),
      Layer.provide(mockSkillV2Layer),
      Layer.provide(FSUtil.defaultLayer),
      Layer.provide(Global.defaultLayer),
      Layer.provide(Database.layerFromPath(":memory:")),
    )

    const program = SkillManagerTool.use.create("../../etc/passwd", "prompt", "reason")
      .pipe(Effect.provide(testLayer))

    const result = await Effect.runPromise(program).catch((error) => error)
    
    expect(result._tag).toBe("InvalidSkillNameError")
  })

  test("should reject invalid skill name with slashes", async () => {
    const testLayer = SkillManagerTool.layer.pipe(
      Layer.provide(UsageTracker.layer),
      Layer.provide(mockSkillV2Layer),
      Layer.provide(FSUtil.defaultLayer),
      Layer.provide(Global.defaultLayer),
      Layer.provide(Database.layerFromPath(":memory:")),
    )

    const program = SkillManagerTool.use.create("invalid/name", "prompt", "reason")
      .pipe(Effect.provide(testLayer))

    const result = await Effect.runPromise(program).catch((error) => error)
    
    expect(result._tag).toBe("InvalidSkillNameError")
  })

  test("should update skill file", async () => {
    const home = process.env.LCODE_TEST_HOME ?? os.homedir()
    const skillLocation = join(home, ".config", "lcode", "skills", "update-test", "SKILL.md")
    
    const mockLayer = mockSkillV2LayerWithSkills([
      { name: "update-test", location: skillLocation }
    ])

    const testLayer = SkillManagerTool.layer.pipe(
      Layer.provide(UsageTracker.layer),
      Layer.provide(mockLayer),
      Layer.provide(FSUtil.defaultLayer),
      Layer.provide(Global.defaultLayer),
      Layer.provide(Database.layerFromPath(":memory:")),
    )

    const program = Effect.gen(function* () {
      yield* SkillManagerTool.use.create("update-test", "old prompt", "initial")
      yield* SkillManagerTool.use.update("update-test", "new prompt", "update")
      
      const skillDir = join(home, ".config", "lcode", "skills", "update-test")
      return yield* Effect.tryPromise({
        try: async () => readFile(join(skillDir, "SKILL.md"), "utf-8"),
        catch: () => null
      })
    }).pipe(Effect.provide(testLayer))

    const content = await Effect.runPromise(program)
    
    expect(content).toContain("new prompt")
    expect(content).toContain("Updated:")
  })

  test("should fail update for non-existent skill", async () => {
    const testLayer = SkillManagerTool.layer.pipe(
      Layer.provide(UsageTracker.layer),
      Layer.provide(mockSkillV2Layer),
      Layer.provide(FSUtil.defaultLayer),
      Layer.provide(Global.defaultLayer),
      Layer.provide(Database.layerFromPath(":memory:")),
    )

    const program = SkillManagerTool.use.update("nonexistent", "prompt", "reason")
      .pipe(Effect.provide(testLayer))

    const result = await Effect.runPromise(program).catch((error) => error)
    
    expect(result._tag).toBe("SkillNotFoundError")
  })

  test("should delete skill by archiving", async () => {
    const testHome = join(os.tmpdir(), "lcode-test-delete-" + Date.now())
    const testConfig = join(testHome, ".config", "lcode")
    process.env.LCODE_TEST_HOME = testHome
    
    const skillLocation = join(testConfig, "skills", "delete-test", "SKILL.md")
    
    const mockLayer = mockSkillV2LayerWithSkills([
      { name: "delete-test", location: skillLocation }
    ])

    const globalTestLayer = Global.layerWith({
      config: testConfig
    })

    const dbLayer = Database.layerFromPath(":memory:")
    
    const testLayer = SkillManagerTool.layer.pipe(
      Layer.provide(UsageTracker.layer),
      Layer.provide(mockLayer),
      Layer.provide(FSUtil.defaultLayer),
      Layer.provide(globalTestLayer),
    )

    const program = Effect.gen(function* () {
      yield* SkillManagerTool.use.create("delete-test", "prompt", "test")
      yield* SkillManagerTool.use.delete("delete-test")
      
      const stats = yield* UsageTracker.use.getStats("delete-test")
      return stats
    })
      .pipe(Effect.provide(UsageTracker.layer))
      .pipe(Effect.provide(testLayer))
      .pipe(Effect.provide(dbLayer))

    const stats = await Effect.runPromise(program)
    
    expect(stats?.lifecycle_state).toBe("archived")
    
    delete process.env.LCODE_TEST_HOME
  })
})