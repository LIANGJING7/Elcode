import { Effect, Layer, Context } from "effect"
import { EvolutionDB } from "./db"
import * as Schema from "./schema"
import { randomUUID } from "crypto"

export interface PatternAnalyzerInterface {
  readonly analyze: (cycleId: Schema.CycleId) => Effect.Effect<Schema.Pattern[]>
  readonly detectFailurePatterns: (trajectories: Schema.Trajectory[]) => Effect.Effect<Schema.Pattern[]>
  readonly calculateConfidence: (occurrenceCount: number, failureRate: number) => number
}

export class PatternAnalyzer extends Context.Service<PatternAnalyzer, PatternAnalyzerInterface>()("@opencode/evolution/PatternAnalyzer") {}

export const patternAnalyzerLayer: Layer.Layer<PatternAnalyzer, never, EvolutionDB> = Layer.effect(
  PatternAnalyzer,
  Effect.gen(function* () {
    const db = yield* EvolutionDB
    
    const calculateConfidenceImpl = (occurrenceCount: number, failureRate: number): number => {
      if (occurrenceCount === 0) return 0
      const frequencyWeight = Math.min(occurrenceCount / 10, 1)
      const failureWeight = 1 - failureRate
      return frequencyWeight * 0.4 + failureWeight * 0.6
    }
    
    const detectFailurePatternsImpl = (trajectories: Schema.Trajectory[]): Effect.Effect<Schema.Pattern[]> =>
      Effect.gen(function* () {
        const patterns: Map<string, {
          count: number
          failures: number
          fixes: string[]
        }> = new Map()
        
        for (const traj of trajectories) {
          if (!traj.outcome.success) {
            const key = `${traj.skill_id}:${traj.trigger_event}:${traj.context.description}`
            const existing = patterns.get(key) || { count: 0, failures: 0, fixes: [] }
            existing.count++
            existing.failures++
            if (traj.feedback?.suggested_fix && !existing.fixes.includes(traj.feedback.suggested_fix)) {
              existing.fixes.push(traj.feedback.suggested_fix)
            }
            patterns.set(key, existing)
          }
        }
        
        const detectedPatterns: Schema.Pattern[] = []
        for (const [key, data] of patterns) {
          if (data.count >= 3) {
            const pattern: Schema.Pattern = {
              pattern_id: randomUUID() as Schema.PatternId,
              occurrence_count: data.count,
              failure_rate: data.failures / data.count,
              suggested_fix: data.fixes[0] || "Review and refactor",
              confidence: calculateConfidenceImpl(data.count, data.failures / data.count),
              detected_at: Date.now(),
            }
            detectedPatterns.push(pattern)
            yield* db.insertPattern(pattern)
          }
        }
        
        return detectedPatterns
      })
    
    const analyzeImpl = (cycleId: Schema.CycleId): Effect.Effect<Schema.Pattern[]> =>
      Effect.gen(function* () {
        const trajectories = yield* db.getTrajectories(cycleId)
        return yield* detectFailurePatternsImpl(trajectories)
      })
    
    return PatternAnalyzer.of({
      analyze: analyzeImpl,
      detectFailurePatterns: detectFailurePatternsImpl,
      calculateConfidence: calculateConfidenceImpl,
    })
  })
)

export const Test = Layer.merge(
  Layer.provide(patternAnalyzerLayer, EvolutionDB.Test),
  EvolutionDB.Test
)