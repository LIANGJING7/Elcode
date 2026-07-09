import { Effect, Layer } from "effect"
import { describe, it, expect } from "bun:test"
import { PolicyTrace, policyTraceLayer } from "../policy"
import { EvolutionDB, evolutionDBLayer } from "../db"
import * as Schema from "../schema"

const combinedLayer = Layer.merge(
  Layer.provide(policyTraceLayer, evolutionDBLayer),
  evolutionDBLayer
)

describe("PolicyTrace", () => {
  it("should record policy decision", async () => {
    const program = Effect.gen(function* () {
      const trace = yield* PolicyTrace
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      yield* trace.recordDecision(
        "cycle_1" as Schema.CycleId,
        "pattern_approval",
        ["rule_1", "rule_2"],
        { confidence: 0.8, impact: 0.6 },
        "approved",
        "High confidence pattern with significant impact"
      )
      
      const traces = yield* db.getPolicyTraces("cycle_1" as Schema.CycleId)
      expect(traces.length).toBe(1)
      expect(traces[0].decision_type).toBe("pattern_approval")
      expect(traces[0].matched_rules.length).toBe(2)
      expect(traces[0].final_decision).toBe("approved")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should get trace history for cycle", async () => {
    const program = Effect.gen(function* () {
      const trace = yield* PolicyTrace
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      yield* trace.recordDecision(
        "cycle_2" as Schema.CycleId,
        "pattern_approval",
        ["rule_1"],
        { confidence: 0.9 },
        "approved",
        "First decision"
      )
      
      yield* trace.recordDecision(
        "cycle_2" as Schema.CycleId,
        "proposal_validation",
        ["rule_3", "rule_4"],
        { validity: 0.95, safety: 0.8 },
        "validated",
        "Second decision"
      )
      
      const traces = yield* trace.getTrace("cycle_2" as Schema.CycleId)
      expect(traces.length).toBe(2)
      expect(traces[0].decision_type).toBe("pattern_approval")
      expect(traces[1].decision_type).toBe("proposal_validation")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
})