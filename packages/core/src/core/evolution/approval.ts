import { Effect, Layer, Context, Ref } from "effect"
import { EvolutionDB } from "./db"
import * as Schema from "./schema"

export interface ApprovalRequest {
  readonly cycleId: Schema.CycleId
  readonly proposal: Schema.SkillProposal
  readonly requestedAt: number
  readonly status: "pending" | "approved" | "rejected" | "deferred"
  readonly reviewer?: string
  readonly reviewedAt?: number
  readonly comments?: string[]
}

export interface ApprovalGateInterface {
  readonly requestApproval: (cycleId: Schema.CycleId, proposal: Schema.SkillProposal) => Effect.Effect<string>
  readonly approve: (requestId: string, reviewer: string, comment?: string) => Effect.Effect<void>
  readonly reject: (requestId: string, reviewer: string, reason: string) => Effect.Effect<void>
  readonly defer: (requestId: string, reviewer: string, until: number) => Effect.Effect<void>
  readonly getPendingRequests: () => Effect.Effect<ApprovalRequest[]>
  readonly getRequest: (requestId: string) => Effect.Effect<ApprovalRequest | null>
}

export class ApprovalGate extends Context.Service<ApprovalGate, ApprovalGateInterface>()("@opencode/evolution/ApprovalGate") {}

export const approvalGateLayer: Layer.Layer<ApprovalGate, never, EvolutionDB> = Layer.effect(
  ApprovalGate,
  Effect.gen(function* () {
    const db = yield* EvolutionDB
    const requestsRef = yield* Ref.make<Map<string, ApprovalRequest>>(new Map())
    
    const requestApprovalImpl = (cycleId: Schema.CycleId, proposal: Schema.SkillProposal): Effect.Effect<string> =>
      Effect.gen(function* () {
        const requestId = `approval_${cycleId}_${Date.now()}`
        const request: ApprovalRequest = {
          cycleId,
          proposal,
          requestedAt: Date.now(),
          status: "pending",
          comments: [],
        }
        
        yield* Ref.update(requestsRef, map => {
          const newMap = new Map(map)
          newMap.set(requestId, request)
          return newMap
        })
        
        return requestId
      })
    
    const approveImpl = (requestId: string, reviewer: string, comment?: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        const requests = yield* Ref.get(requestsRef)
        const request = requests.get(requestId)
        
        if (!request) throw new Error(`Request ${requestId} not found`)
        
        const updated: ApprovalRequest = {
          ...request,
          status: "approved",
          reviewer,
          reviewedAt: Date.now(),
          comments: comment ? [...(request.comments || []), comment] : request.comments,
        }
        
        yield* Ref.update(requestsRef, map => {
          const newMap = new Map(map)
          newMap.set(requestId, updated)
          return newMap
        })
        
        const cycles = yield* db.getCycles()
        const cycle = cycles.find(c => c.cycle_id === request.cycleId)
        if (cycle) {
          yield* db.updateCycle({
            ...cycle,
            status: "approved",
            updated_at: Date.now(),
            provenance: [...cycle.provenance, `approved_by:${reviewer}`],
          })
        }
      })
    
    const rejectImpl = (requestId: string, reviewer: string, reason: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        const requests = yield* Ref.get(requestsRef)
        const request = requests.get(requestId)
        
        if (!request) throw new Error(`Request ${requestId} not found`)
        
        const updated: ApprovalRequest = {
          ...request,
          status: "rejected",
          reviewer,
          reviewedAt: Date.now(),
          comments: [...(request.comments || []), `Rejected: ${reason}`],
        }
        
        yield* Ref.update(requestsRef, map => {
          const newMap = new Map(map)
          newMap.set(requestId, updated)
          return newMap
        })
        
        const cycles = yield* db.getCycles()
        const cycle = cycles.find(c => c.cycle_id === request.cycleId)
        if (cycle) {
          yield* db.updateCycle({
            ...cycle,
            status: "rejected",
            updated_at: Date.now(),
            provenance: [...cycle.provenance, `rejected_by:${reviewer}`, `reason:${reason}`],
          })
        }
      })
    
    const deferImpl = (requestId: string, reviewer: string, until: number): Effect.Effect<void> =>
      Effect.gen(function* () {
        const requests = yield* Ref.get(requestsRef)
        const request = requests.get(requestId)
        
        if (!request) throw new Error(`Request ${requestId} not found`)
        
        const updated: ApprovalRequest = {
          ...request,
          status: "deferred",
          reviewer,
          reviewedAt: Date.now(),
          comments: [...(request.comments || []), `Deferred until ${new Date(until).toISOString()}`],
        }
        
        yield* Ref.update(requestsRef, map => {
          const newMap = new Map(map)
          newMap.set(requestId, updated)
          return newMap
        })
        
        const cycles = yield* db.getCycles()
        const cycle = cycles.find(c => c.cycle_id === request.cycleId)
        if (cycle) {
          yield* db.updateCycle({
            ...cycle,
            status: "deferred",
            updated_at: Date.now(),
            provenance: [...cycle.provenance, `deferred_by:${reviewer}`, `until:${until}`],
          })
        }
      })
    
    const getPendingRequestsImpl = (): Effect.Effect<ApprovalRequest[]> =>
      Effect.gen(function* () {
        const requests = yield* Ref.get(requestsRef)
        return Array.from(requests.values()).filter(r => r.status === "pending")
      })
    
    const getRequestImpl = (requestId: string): Effect.Effect<ApprovalRequest | null> =>
      Effect.gen(function* () {
        const requests = yield* Ref.get(requestsRef)
        return requests.get(requestId) || null
      })
    
    return ApprovalGate.of({
      requestApproval: requestApprovalImpl,
      approve: approveImpl,
      reject: rejectImpl,
      defer: deferImpl,
      getPendingRequests: getPendingRequestsImpl,
      getRequest: getRequestImpl,
    })
  })
)

export const Test = Layer.merge(
  Layer.provide(approvalGateLayer, EvolutionDB.Test),
  EvolutionDB.Test
)