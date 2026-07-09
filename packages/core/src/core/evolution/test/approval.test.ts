import { Effect, Layer } from "effect"
import { describe, it, expect } from "bun:test"
import { ApprovalGate, approvalGateLayer } from "../approval"
import { CycleBuilder, cycleBuilderLayer } from "../cycle"
import { EvolutionDB, evolutionDBLayer } from "../db"
import * as Schema from "../schema"

const combinedLayer = Layer.merge(
  Layer.merge(
    Layer.provide(approvalGateLayer, evolutionDBLayer),
    Layer.provide(cycleBuilderLayer, evolutionDBLayer)
  ),
  evolutionDBLayer
)

describe("ApprovalGate", () => {
  it("should request approval and track pending requests", async () => {
    const program = Effect.gen(function* () {
      const gate = yield* ApprovalGate
      const builder = yield* CycleBuilder
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      const cycleId = yield* builder.startCycle("manual")
      
      const proposal: Schema.SkillProposal = {
        skill_name: "test_skill",
        skill_description: "Test skill proposal",
        rationale: "Test rationale",
        estimated_impact: "high",
      }
      
      const requestId = yield* gate.requestApproval(cycleId, proposal)
      expect(requestId).toContain("approval")
      
      const pending = yield* gate.getPendingRequests()
      expect(pending.length).toBe(1)
      expect(pending[0].status).toBe("pending")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should approve request and update cycle status", async () => {
    const program = Effect.gen(function* () {
      const gate = yield* ApprovalGate
      const builder = yield* CycleBuilder
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      const cycleId = yield* builder.startCycle("manual")
      
      const proposal: Schema.SkillProposal = {
        skill_name: "approved_skill",
        skill_description: "Approved skill",
        rationale: "Good rationale",
        estimated_impact: "medium",
      }
      
      const requestId = yield* gate.requestApproval(cycleId, proposal)
      yield* gate.approve(requestId, "reviewer_1", "Looks good")
      
      const request = yield* gate.getRequest(requestId)
      expect(request?.status).toBe("approved")
      expect(request?.reviewer).toBe("reviewer_1")
      expect(request?.comments).toContain("Looks good")
      
      const cycles = yield* db.getCycles()
      const cycle = cycles.find(c => c.cycle_id === cycleId)
      expect(cycle?.status).toBe("approved")
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should reject request with reason", async () => {
    const program = Effect.gen(function* () {
      const gate = yield* ApprovalGate
      const builder = yield* CycleBuilder
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      const cycleId = yield* builder.startCycle("manual")
      
      const proposal: Schema.SkillProposal = {
        skill_name: "rejected_skill",
        skill_description: "Rejected skill",
        rationale: "Bad rationale",
        estimated_impact: "low",
      }
      
      const requestId = yield* gate.requestApproval(cycleId, proposal)
      yield* gate.reject(requestId, "reviewer_2", "Insufficient rationale")
      
      const request = yield* gate.getRequest(requestId)
      expect(request?.status).toBe("rejected")
      expect(request?.comments).toContain("Rejected: Insufficient rationale")
      
      const pending = yield* gate.getPendingRequests()
      expect(pending.length).toBe(0)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
  
  it("should defer request with deadline", async () => {
    const program = Effect.gen(function* () {
      const gate = yield* ApprovalGate
      const builder = yield* CycleBuilder
      const db = yield* EvolutionDB
      
      yield* db.init()
      
      const cycleId = yield* builder.startCycle("manual")
      
      const proposal: Schema.SkillProposal = {
        skill_name: "deferred_skill",
        skill_description: "Deferred skill",
        rationale: "Needs more info",
        estimated_impact: "high",
      }
      
      const requestId = yield* gate.requestApproval(cycleId, proposal)
      const deferUntil = Date.now() + 86400000
      yield* gate.defer(requestId, "reviewer_3", deferUntil)
      
      const request = yield* gate.getRequest(requestId)
      expect(request?.status).toBe("deferred")
      expect(request?.comments?.length).toBeGreaterThan(0)
    })
    
    await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)))
  })
})