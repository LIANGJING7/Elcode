import { describe, expect, test, beforeAll, afterAll } from "bun:test"
import { Effect, Layer } from "effect"
import { UsageTracker, type SkillUsageRow } from "@/skill-evolution/usage-tracker"
import { Database } from "@/core/database/database"

describe("UsageTracker", () => {
  const testLayer = Database.layerFromPath(":memory:")

  test("should record skill usage", async () => {
    const program = Effect.gen(function* () {
      yield* UsageTracker.use.recordUse("test-skill")
      const stats = yield* UsageTracker.use.getStats("test-skill")
      return stats
    }).pipe(Effect.provide(UsageTracker.layer), Effect.provide(testLayer))

    const result = await Effect.runPromise(program)

    expect(result?.use_count).toBe(1)
    expect(result?.lifecycle_state).toBe("active")
  })

  test("should increment use_count on repeated calls", async () => {
    const program = Effect.gen(function* () {
      yield* UsageTracker.use.recordUse("test-skill")
      yield* UsageTracker.use.recordUse("test-skill")
      const stats = yield* UsageTracker.use.getStats("test-skill")
      return stats
    }).pipe(Effect.provide(UsageTracker.layer), Effect.provide(testLayer))

    const result = await Effect.runPromise(program)

    expect(result?.use_count).toBe(2)
  })

  test("should mark skill as archived", async () => {
    const program = Effect.gen(function* () {
      yield* UsageTracker.use.recordUse("archive-test")
      yield* UsageTracker.use.markArchived("archive-test")
      const stats = yield* UsageTracker.use.getStats("archive-test")
      return stats
    }).pipe(Effect.provide(UsageTracker.layer), Effect.provide(testLayer))

    const result = await Effect.runPromise(program)

    expect(result?.lifecycle_state).toBe("archived")
  })
})