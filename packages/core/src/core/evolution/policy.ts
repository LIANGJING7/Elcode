import { Effect, Layer, Context } from "effect"
import { EvolutionDB } from "./db"
import * as Schema from "./schema"
import { randomUUID } from "crypto"

export interface PolicyTraceInterface {
  readonly recordDecision: (
    cycleId: Schema.CycleId,
    decisionType: Schema.PolicyTrace["decision_type"],
    matchedRules: string[],
    scoreBreakdown: Record<string, number>,
    finalDecision: string,
    rationale: string
  ) => Effect.Effect<void>
  readonly getTrace: (cycleId: Schema.CycleId) => Effect.Effect<Schema.PolicyTrace[]>
}

export class PolicyTrace extends Context.Service<PolicyTrace, PolicyTraceInterface>()("@opencode/evolution/PolicyTrace") {}

export const policyTraceLayer: Layer.Layer<PolicyTrace, never, EvolutionDB> = Layer.effect(
  PolicyTrace,
  Effect.gen(function* () {
    const db = yield* EvolutionDB
    
    const recordDecisionImpl = (
      cycleId: Schema.CycleId,
      decisionType: Schema.PolicyTrace["decision_type"],
      matchedRules: string[],
      scoreBreakdown: Record<string, number>,
      finalDecision: string,
      rationale: string
    ): Effect.Effect<void> =>
      Effect.gen(function* () {
        const trace: Schema.PolicyTrace = {
          trace_id: randomUUID(),
          cycle_id: cycleId,
          decision_type: decisionType,
          matched_rules: matchedRules,
          score_breakdown: scoreBreakdown,
          final_decision: finalDecision,
          rationale: rationale,
          created_at: Date.now(),
        }
        yield* db.insertPolicyTrace(trace)
      })
    
    const getTraceImpl = (cycleId: Schema.CycleId): Effect.Effect<Schema.PolicyTrace[]> =>
      db.getPolicyTraces(cycleId)
    
    return PolicyTrace.of({
      recordDecision: recordDecisionImpl,
      getTrace: getTraceImpl,
    })
  })
)

export const Test = Layer.merge(
  Layer.provide(policyTraceLayer, EvolutionDB.Test),
  EvolutionDB.Test
)