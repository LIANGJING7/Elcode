import { Effect, Layer } from "effect"
import { describe, it, expect } from "bun:test"
import { SkillProposer, skillProposerLayer } from "../proposer"
import { EvolutionDB, evolutionDBLayer } from "../db"
import * as Schema from "../schema"

const combinedLayer = Layer.merge(
  Layer.provide(skillProposerLayer, evolutionDBLayer),
  evolutionDBLayer
)

describe("SkillProposer", () => {
  it("should generate proposal from pattern", async () => {
    const program = Effect.gen(function* () {
      const proposer = yield* SkillProposer
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      const pattern: Schema.Pattern = {
        pattern_id: "pattern_123" as Schema.PatternId,
        occurrence_count: 5,
        failure_rate: 0.6,
        suggested_fix: "Add validation check",
        confidence: 0.75,
        detected_at: Date.now(),
      }
      
      const proposal = yield* proposer.generateProposal(pattern)
      expect(proposal.skill_name).toContain("skill_pattern")
      expect(proposal.skill_description).toBe("Add validation check")
      expect(proposal.estimated_impact).toBe("high")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should validate proposal correctly", async () => {
    const program = Effect.gen(function* () {
      const proposer = yield* SkillProposer
      
      const validProposal: Schema.SkillProposal = {
        skill_name: "test_skill",
        skill_description: "A valid skill description for testing",
        rationale: "This proposal is based on detected patterns",
        estimated_impact: "high",
      }
      
      const isValid = yield* proposer.validateProposal(validProposal)
      expect(isValid).toBe(true)
      
      const invalidProposal: Schema.SkillProposal = {
        skill_name: "ab",
        skill_description: "Too short",
        rationale: "Short",
        estimated_impact: "invalid",
      }
      
      const isInvalid = yield* proposer.validateProposal(invalidProposal)
      expect(isInvalid).toBe(false)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should apply negative pattern filter", async () => {
    const program = Effect.gen(function* () {
      const proposer = yield* SkillProposer
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      const negativePattern: Schema.NegativePattern = {
        pattern_id: "neg_1" as Schema.PatternId,
        forbidden_behavior: "delete all",
        reason: "destructive",
        triggered_by: ["pattern_test"],
        created_at: Date.now(),
      }
      yield* db.insertNegativePattern(negativePattern)
      
      const proposal: Schema.SkillProposal = {
        skill_name: "test_skill",
        skill_description: "This skill will delete all files",
        rationale: "Test rationale",
        estimated_impact: "medium",
      }
      
      const filtered = yield* proposer.applyNegativeFilter(proposal)
      expect(filtered?.skill_description).toContain("[filtered]")
      expect(filtered?.rationale).toContain("filtered: destructive")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
})