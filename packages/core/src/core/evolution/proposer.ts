import { Effect, Layer, Context } from "effect"
import { EvolutionDB } from "./db"
import * as Schema from "./schema"
import { randomUUID } from "crypto"

export interface SkillProposerInterface {
  readonly generateProposal: (pattern: Schema.Pattern) => Effect.Effect<Schema.SkillProposal>
  readonly validateProposal: (proposal: Schema.SkillProposal) => Effect.Effect<boolean>
  readonly applyNegativeFilter: (proposal: Schema.SkillProposal) => Effect.Effect<Schema.SkillProposal | null>
}

export class SkillProposer extends Context.Service<SkillProposer, SkillProposerInterface>()("@opencode/evolution/SkillProposer") {}

export const skillProposerLayer: Layer.Layer<SkillProposer, never, EvolutionDB> = Layer.effect(
  SkillProposer,
  Effect.gen(function* () {
    const db = yield* EvolutionDB
    
    const generateProposalImpl = (pattern: Schema.Pattern): Effect.Effect<Schema.SkillProposal> =>
      Effect.gen(function* () {
        const negativePatterns = yield* db.getNegativePatterns()
        
        let skillName = `skill_pattern_${pattern.pattern_id.slice(0, 8)}`
        let skillDescription = pattern.suggested_fix || "Auto-generated skill from pattern"
        
        const rationale = `Pattern detected: ${pattern.occurrence_count} occurrences, ${pattern.failure_rate.toFixed(2)} failure rate`
        
        const estimatedImpact = pattern.confidence > 0.7 ? "high" : pattern.confidence > 0.4 ? "medium" : "low"
        
        const proposal: Schema.SkillProposal = {
          skill_name: skillName,
          skill_description: skillDescription,
          rationale,
          estimated_impact: estimatedImpact,
        }
        
        const filtered = yield* applyNegativeFilterImpl(proposal, negativePatterns)
        return filtered || proposal
      })
    
    const validateProposalImpl = (proposal: Schema.SkillProposal): Effect.Effect<boolean> =>
      Effect.gen(function* () {
        if (!proposal.skill_name || proposal.skill_name.length < 3) return false
        if (!proposal.skill_description || proposal.skill_description.length < 10) return false
        if (!proposal.rationale || proposal.rationale.length < 10) return false
        if (!["low", "medium", "high"].includes(proposal.estimated_impact)) return false
        
        return true
      })
    
    const applyNegativeFilterImpl = (proposal: Schema.SkillProposal, negativePatterns?: Schema.NegativePattern[]): Effect.Effect<Schema.SkillProposal | null> =>
      Effect.gen(function* () {
        const negatives = negativePatterns || (yield* db.getNegativePatterns())
        
        for (const neg of negatives) {
          if (proposal.skill_description.toLowerCase().includes(neg.forbidden_behavior.toLowerCase())) {
            const filtered: Schema.SkillProposal = {
              ...proposal,
              skill_description: proposal.skill_description.replace(
                new RegExp(neg.forbidden_behavior, "gi"),
                "[filtered]"
              ),
              rationale: `${proposal.rationale} (filtered: ${neg.reason})`,
            }
            return filtered
          }
        }
        
        return proposal
      })
    
    return SkillProposer.of({
      generateProposal: generateProposalImpl,
      validateProposal: validateProposalImpl,
      applyNegativeFilter: (proposal) => applyNegativeFilterImpl(proposal),
    })
  })
)

export const Test = Layer.merge(
  Layer.provide(skillProposerLayer, EvolutionDB.Test),
  EvolutionDB.Test
)