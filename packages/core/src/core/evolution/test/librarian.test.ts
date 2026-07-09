import { Effect, Layer } from "effect"
import { describe, it, expect } from "bun:test"
import { Librarian, Test } from "../librarian"
import * as Schema from "../schema"

describe("Librarian", () => {
  it("should index a skill file", async () => {
    const program = Effect.gen(function* () {
      const librarian = yield* Librarian
      
      const skill = yield* librarian.indexSkill("/test/skills/test_skill.md")
      expect(skill.skillId).toBeDefined()
      expect(skill.skillName).toBe("test_skill")
      expect(skill.content).toBeDefined()
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(Test)))
  })
  
  it("should search skills by query", async () => {
    const program = Effect.gen(function* () {
      const librarian = yield* Librarian
      
      yield* librarian.indexSkill("/test/skills/pattern_skill.md")
      yield* librarian.indexSkill("/test/skills/debug_skill.md")
      
      const results = yield* librarian.searchSkills("pattern")
      expect(results.length).toBe(1)
      expect(results[0].skillName).toBe("pattern_skill")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(Test)))
  })
  
  it("should extract anchors from content", async () => {
    const program = Effect.gen(function* () {
      const librarian = yield* Librarian
      
      const anchors = librarian.extractAnchors(`
## Key Decisions
Use Effect patterns

## Constraints
Must use bun:sqlite

CRITICAL: Always call db.init()
`)
      expect(anchors.length).toBeGreaterThan(0)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(Test)))
  })
  
  it("should update skill content", async () => {
    const program = Effect.gen(function* () {
      const librarian = yield* Librarian
      
      const skill = yield* librarian.indexSkill("/test/skills/updateable.md")
      yield* librarian.updateSkill(skill.skillId, "Updated content")
      
      const retrieved = yield* librarian.getSkill(skill.skillId)
      expect(retrieved?.content).toBe("Updated content")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(Test)))
  })
})