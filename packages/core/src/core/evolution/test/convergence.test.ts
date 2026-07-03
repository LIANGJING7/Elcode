import { Effect, Layer } from "effect"
import { describe, it, expect } from "bun:test"
import { ConvergenceControl, convergenceControlLayer } from "../convergence"
import { Librarian, librarianLayer, Test as LibrarianTest } from "../librarian"
import * as Schema from "../schema"

const combinedLayer = Layer.merge(
  Layer.provide(convergenceControlLayer, LibrarianTest),
  LibrarianTest
)

describe("ConvergenceControl", () => {
  it("should calculate drift score correctly", async () => {
    const program = Effect.gen(function* () {
      const control = yield* ConvergenceControl
      
      const noDrift = control.calculateDriftScore("Same content", "Same content")
      expect(noDrift).toBe(0)
      
      const partialDrift = control.calculateDriftScore("Use Effect patterns", "Use functional patterns")
      expect(partialDrift).toBeGreaterThan(0)
      expect(partialDrift).toBeLessThan(1)
      
      const fullDrift = control.calculateDriftScore("Original anchor", "Completely different")
      expect(fullDrift).toBeGreaterThan(0.5)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should check anchor drift for skill", async () => {
    const program = Effect.gen(function* () {
      const control = yield* ConvergenceControl
      const librarian = yield* Librarian
      
      const skill = yield* librarian.indexSkill("/test/skills/anchor_skill.md")
      
      const proposedContent = `
## Key Decisions
Changed decisions

## Constraints
Different constraints
`
      const drifts = yield* control.checkAnchorDrift(skill.skillId, proposedContent)
      
      expect(drifts.length).toBe(0)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should validate drift threshold", async () => {
    const program = Effect.gen(function* () {
      const control = yield* ConvergenceControl
      
      const lowDrift: Schema.AnchorDrift = {
        skillId: "skill_1" as Schema.SkillId,
        anchor: "Test anchor",
        originalContent: "Original",
        proposedContent: "Similar",
        driftScore: 0.2,
        detectedAt: Date.now(),
      }
      
      const validLow = yield* control.validateDrift(lowDrift)
      expect(validLow).toBe(false)
      
      const highDrift: Schema.AnchorDrift = {
        skillId: "skill_2" as Schema.SkillId,
        anchor: "Test anchor",
        originalContent: "Original",
        proposedContent: "Different",
        driftScore: 0.4,
        detectedAt: Date.now(),
      }
      
      const validHigh = yield* control.validateDrift(highDrift)
      expect(validHigh).toBe(true)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should record and retrieve drift history", async () => {
    const program = Effect.gen(function* () {
      const control = yield* ConvergenceControl
      
      const drift: Schema.AnchorDrift = {
        skillId: "skill_history" as Schema.SkillId,
        anchor: "Test",
        originalContent: "Original",
        proposedContent: "Changed",
        driftScore: 0.5,
        detectedAt: Date.now(),
      }
      
      yield* control.recordDrift(drift)
      
      const history = yield* control.getDriftHistory("skill_history" as Schema.SkillId)
      expect(history.length).toBe(1)
      expect(history[0].anchor).toBe("Test")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
})