import { Effect, Layer, Context, Ref } from "effect"
import { EvolutionDB } from "./db"
import { TrajectoryRecorder } from "./recorder"
import * as Schema from "./schema"
import { randomUUID } from "crypto"

export interface CycleBuilderInterface {
  readonly startCycle: (trigger: Schema.CycleTrigger) => Effect.Effect<Schema.CycleId>
  readonly addTrajectory: (cycleId: Schema.CycleId, trajectoryId: Schema.TrajectoryId) => Effect.Effect<void>
  readonly setPattern: (cycleId: Schema.CycleId, patternId: Schema.PatternId) => Effect.Effect<void>
  readonly setProposal: (cycleId: Schema.CycleId, proposal: Schema.SkillProposal) => Effect.Effect<void>
  readonly completeCycle: (cycleId: Schema.CycleId) => Effect.Effect<void>
}

export class CycleBuilder extends Context.Service<CycleBuilder, CycleBuilderInterface>()("@opencode/evolution/CycleBuilder") {}

export interface CycleTriggerInterface {
  readonly shouldTrigger: (failureRate: number) => boolean
  readonly checkAndTrigger: () => Effect.Effect<Schema.CycleId | null>
}

export class CycleTrigger extends Context.Service<CycleTrigger, CycleTriggerInterface>()("@opencode/evolution/CycleTrigger") {}

export const cycleTriggerLayer: Layer.Layer<CycleTrigger, never, EvolutionDB> = Layer.effect(
  CycleTrigger,
  Effect.gen(function* () {
    const db = yield* EvolutionDB
    
    const shouldTriggerImpl = (failureRate: number): boolean => {
      return failureRate > 0.3
    }
    
    const checkAndTriggerImpl = (): Effect.Effect<Schema.CycleId | null> =>
      Effect.gen(function* () {
        const trajectories = yield* db.getTrajectories()
        if (trajectories.length < 10) return null
        
        const failures = trajectories.filter(t => !t.outcome.success).length
        const failureRate = failures / trajectories.length
        
        if (shouldTriggerImpl(failureRate)) {
          const cycleId = randomUUID() as Schema.CycleId
          const cycle: Schema.EvolutionCycle = {
            cycle_id: cycleId,
            trigger: "failure_spike",
            trajectories: [],
            status: "recorded",
            created_at: Date.now(),
            updated_at: Date.now(),
            provenance: ["trigger_detected", `failure_rate:${failureRate.toFixed(2)}`],
          }
          yield* db.insertCycle(cycle)
          return cycleId
        }
        
        return null
      })
    
    return CycleTrigger.of({
      shouldTrigger: shouldTriggerImpl,
      checkAndTrigger: checkAndTriggerImpl,
    })
  })
)

export const cycleBuilderLayer: Layer.Layer<CycleBuilder, never, EvolutionDB> = Layer.effect(
  CycleBuilder,
  Effect.gen(function* () {
    const db = yield* EvolutionDB
    
    const startCycleImpl = (trigger: Schema.CycleTrigger): Effect.Effect<Schema.CycleId> =>
      Effect.gen(function* () {
        const cycleId = randomUUID() as Schema.CycleId
        const cycle: Schema.EvolutionCycle = {
          cycle_id: cycleId,
          trigger,
          trajectories: [],
          status: "recorded",
          created_at: Date.now(),
          updated_at: Date.now(),
          provenance: [`trigger:${trigger}`],
        }
        yield* db.insertCycle(cycle)
        return cycleId
      })
    
    const addTrajectoryImpl = (cycleId: Schema.CycleId, trajectoryId: Schema.TrajectoryId) =>
      Effect.gen(function* () {
        const cycles = yield* db.getCycles()
        const cycle = cycles.find(c => c.cycle_id === cycleId)
        if (!cycle) throw new Error(`Cycle ${cycleId} not found`)
        
        const updatedCycle: Schema.EvolutionCycle = {
          ...cycle,
          trajectories: [...cycle.trajectories, trajectoryId],
          updated_at: Date.now(),
          provenance: [...cycle.provenance, `trajectory_added:${trajectoryId}`],
        }
        yield* db.updateCycle(updatedCycle)
      })
    
    const setPatternImpl = (cycleId: Schema.CycleId, patternId: Schema.PatternId) =>
      Effect.gen(function* () {
        const cycles = yield* db.getCycles()
        const cycle = cycles.find(c => c.cycle_id === cycleId)
        if (!cycle) throw new Error(`Cycle ${cycleId} not found`)
        
        const updatedCycle: Schema.EvolutionCycle = {
          ...cycle,
          pattern: patternId,
          status: "patterned",
          updated_at: Date.now(),
          provenance: [...cycle.provenance, `pattern_detected:${patternId}`],
        }
        yield* db.updateCycle(updatedCycle)
      })
    
    const setProposalImpl = (cycleId: Schema.CycleId, proposal: Schema.SkillProposal) =>
      Effect.gen(function* () {
        const cycles = yield* db.getCycles()
        const cycle = cycles.find(c => c.cycle_id === cycleId)
        if (!cycle) throw new Error(`Cycle ${cycleId} not found`)
        
        const updatedCycle: Schema.EvolutionCycle = {
          ...cycle,
          proposal: JSON.stringify(proposal),
          status: "proposed",
          updated_at: Date.now(),
          provenance: [...cycle.provenance, `proposal_generated:${proposal.skill_name}`],
        }
        yield* db.updateCycle(updatedCycle)
      })
    
    const completeCycleImpl = (cycleId: Schema.CycleId) =>
      Effect.gen(function* () {
        const cycles = yield* db.getCycles()
        const cycle = cycles.find(c => c.cycle_id === cycleId)
        if (!cycle) throw new Error(`Cycle ${cycleId} not found`)
        
        const updatedCycle: Schema.EvolutionCycle = {
          ...cycle,
          status: "completed",
          updated_at: Date.now(),
          provenance: [...cycle.provenance, "cycle_completed"],
        }
        yield* db.updateCycle(updatedCycle)
      })
    
    return CycleBuilder.of({
      startCycle: startCycleImpl,
      addTrajectory: addTrajectoryImpl,
      setPattern: setPatternImpl,
      setProposal: setProposalImpl,
      completeCycle: completeCycleImpl,
    })
  })
)

export const Test = Layer.merge(
  Layer.merge(
    Layer.provide(cycleTriggerLayer, EvolutionDB.Test),
    Layer.provide(cycleBuilderLayer, EvolutionDB.Test)
  ),
  EvolutionDB.Test
)