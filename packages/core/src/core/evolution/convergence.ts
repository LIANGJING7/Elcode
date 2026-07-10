import { Effect, Layer, Context, Ref } from "effect"
import { Librarian } from "./librarian"
import * as Schema from "./schema"

export interface AnchorDrift {
  readonly skillId: Schema.SkillId
  readonly anchor: string
  readonly originalContent: string
  readonly proposedContent: string
  readonly driftScore: number
  readonly detectedAt: number
}

export interface ConvergenceControlInterface {
  readonly checkAnchorDrift: (skillId: Schema.SkillId, proposedContent: string) => Effect.Effect<AnchorDrift[]>
  readonly validateDrift: (drift: AnchorDrift) => Effect.Effect<boolean>
  readonly recordDrift: (drift: AnchorDrift) => Effect.Effect<void>
  readonly getDriftHistory: (skillId: Schema.SkillId) => Effect.Effect<AnchorDrift[]>
  readonly calculateDriftScore: (original: string, proposed: string) => number
}

export class ConvergenceControl extends Context.Service<ConvergenceControl, ConvergenceControlInterface>()("@opencode/evolution/ConvergenceControl") {}

const DRIFT_THRESHOLD = 0.3

export const convergenceControlLayer: Layer.Layer<ConvergenceControl, never, Librarian> = Layer.effect(
  ConvergenceControl,
  Effect.gen(function* () {
    const librarian = yield* Librarian
    const driftHistoryRef = yield* Ref.make<Map<Schema.SkillId, AnchorDrift[]>>(new Map())
    
    const calculateDriftScoreImpl = (original: string, proposed: string): number => {
      const originalWords = original.toLowerCase().split(/\s+/)
      const proposedWords = proposed.toLowerCase().split(/\s+/)
      
      const intersection = originalWords.filter(w => proposedWords.includes(w))
      const union = [...new Set([...originalWords, ...proposedWords])]
      
      if (union.length === 0) return 0
      
      const jaccardSimilarity = intersection.length / union.length
      return 1 - jaccardSimilarity
    }
    
    const checkAnchorDriftImpl = (skillId: Schema.SkillId, proposedContent: string): Effect.Effect<AnchorDrift[]> =>
      Effect.gen(function* () {
        const skill = yield* librarian.getSkill(skillId)
        if (!skill) return []
        
        const originalAnchors = skill.anchors
        const proposedAnchors = librarian.extractAnchors(proposedContent)
        
        const drifts: AnchorDrift[] = []
        
        for (const originalAnchor of originalAnchors) {
          const matchingProposed = proposedAnchors.find(p => 
            p.toLowerCase().includes(originalAnchor.toLowerCase().slice(0, 20))
          )
          
          if (!matchingProposed) {
            const drift: AnchorDrift = {
              skillId,
              anchor: originalAnchor,
              originalContent: originalAnchor,
              proposedContent: "",
              driftScore: 1.0,
              detectedAt: Date.now(),
            }
            drifts.push(drift)
          } else {
            const score = calculateDriftScoreImpl(originalAnchor, matchingProposed)
            if (score > DRIFT_THRESHOLD) {
              const drift: AnchorDrift = {
                skillId,
                anchor: originalAnchor,
                originalContent: originalAnchor,
                proposedContent: matchingProposed,
                driftScore: score,
                detectedAt: Date.now(),
              }
              drifts.push(drift)
            }
          }
        }
        
        return drifts
      })
    
    const validateDriftImpl = (drift: AnchorDrift): Effect.Effect<boolean> =>
      Effect.sync(() => {
        return drift.driftScore > DRIFT_THRESHOLD && drift.driftScore < 0.7
      })
    
    const recordDriftImpl = (drift: AnchorDrift): Effect.Effect<void> =>
      Ref.update(driftHistoryRef, map => {
        const existing = map.get(drift.skillId) || []
        const newMap = new Map(map)
        newMap.set(drift.skillId, [...existing, drift])
        return newMap
      })
    
    const getDriftHistoryImpl = (skillId: Schema.SkillId): Effect.Effect<AnchorDrift[]> =>
      Effect.gen(function* () {
        const history = yield* Ref.get(driftHistoryRef)
        return history.get(skillId) || []
      })
    
    return ConvergenceControl.of({
      checkAnchorDrift: checkAnchorDriftImpl,
      validateDrift: validateDriftImpl,
      recordDrift: recordDriftImpl,
      getDriftHistory: getDriftHistoryImpl,
      calculateDriftScore: calculateDriftScoreImpl,
    })
  })
)

export const Test = Layer.provide(convergenceControlLayer, Librarian.Test)