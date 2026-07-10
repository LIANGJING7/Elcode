import { Effect, Layer, Context, Ref } from "effect"
import { EvolutionDB } from "./db"
import * as Schema from "./schema"

export interface MockEnvironment {
  readonly toolResults: Map<string, any>
  readonly setMockResult: (toolName: string, input: any, result: any) => void
  readonly getMockResult: (toolName: string, input: any) => any | undefined
}

export class MockEnv extends Context.Service<MockEnv, MockEnvironment>()("@opencode/evolution/MockEnv") {}

export const mockEnvLayer: Layer.Layer<MockEnv, never, never> = Layer.effect(
  MockEnv,
  Effect.gen(function* () {
    const toolResultsRef = yield* Ref.make<Map<string, any>>(new Map())
    
    const setMockResultImpl = (toolName: string, input: any, result: any) =>
      Ref.update(toolResultsRef, map => {
        const key = `${toolName}:${JSON.stringify(input)}`
        const newMap = new Map(map)
        newMap.set(key, result)
        return newMap
      })
    
    const getMockResultImpl = (toolName: string, input: any) => {
      const key = `${toolName}:${JSON.stringify(input)}`
      const map = Ref.get(toolResultsRef)
      return map.pipe(Effect.map(m => m.get(key)))
    }
    
    return MockEnv.of({
      toolResults: yield* Ref.get(toolResultsRef),
      setMockResult: setMockResultImpl,
      getMockResult: (toolName, input) => Effect.runSync(getMockResultImpl(toolName, input)),
    })
  })
)

export interface ReplayEngineInterface {
  readonly replayTrajectory: (trajectoryId: Schema.TrajectoryId) => Effect.Effect<Schema.ReplayResult>
  readonly compareResults: (original: Schema.Outcome, replayed: Schema.Outcome) => Effect.Effect<Schema.ComparisonResult>
  readonly setupMockEnvironment: (trajectory: Schema.Trajectory) => Effect.Effect<void>
}

export class ReplayEngine extends Context.Service<ReplayEngine, ReplayEngineInterface>()("@opencode/evolution/ReplayEngine") {}

export const replayEngineLayer: Layer.Layer<ReplayEngine, never, EvolutionDB | MockEnv> = Layer.effect(
  ReplayEngine,
  Effect.gen(function* () {
    const db = yield* EvolutionDB
    const mockEnv = yield* MockEnv
    
    const setupMockEnvironmentImpl = (trajectory: Schema.Trajectory): Effect.Effect<void> =>
      Effect.gen(function* () {
        for (const action of trajectory.actions) {
          const mockResult = {
            success: true,
            output: `Mocked result for ${action.tool_name}`,
            timestamp: action.timestamp + 100,
          }
          yield* mockEnv.setMockResult(action.tool_name, action.tool_input, mockResult)
        }
      })
    
    const replayTrajectoryImpl = (trajectoryId: Schema.TrajectoryId): Effect.Effect<Schema.ReplayResult> =>
      Effect.gen(function* () {
        const trajectories = yield* db.getTrajectories()
        const trajectory = trajectories.find(t => t.trajectory_id === trajectoryId)
        
        if (!trajectory) {
          return {
            trajectory_id: trajectoryId,
            replay_success: false,
            original_outcome: { success: false, duration_ms: 0 },
            replayed_outcome: { success: false, duration_ms: 0 },
            comparison: { match: false, differences: ["Trajectory not found"] },
            replayed_at: Date.now(),
          }
        }
        
        yield* setupMockEnvironmentImpl(trajectory)
        
        const replayedActions: Schema.Action[] = []
        const startTime = Date.now()
        let replaySuccess = true
        
        for (const action of trajectory.actions) {
          const mockResult = mockEnv.getMockResult(action.tool_name, action.tool_input)
          
          if (!mockResult) {
            replaySuccess = false
            break
          }
          
          replayedActions.push({
            tool_name: action.tool_name,
            tool_input: action.tool_input,
            timestamp: startTime + replayedActions.length * 100,
          })
        }
        
        const duration = Date.now() - startTime
        const replayedOutcome: Schema.Outcome = {
          success: replaySuccess,
          duration_ms: duration,
        }
        
        const comparison = yield* compareResultsImpl(trajectory.outcome, replayedOutcome)
        
        return {
          trajectory_id: trajectoryId,
          replay_success: replaySuccess,
          original_outcome: trajectory.outcome,
          replayed_outcome: replayedOutcome,
          comparison,
          replayed_at: Date.now(),
        }
      })
    
    const compareResultsImpl = (original: Schema.Outcome, replayed: Schema.Outcome): Effect.Effect<Schema.ComparisonResult> =>
      Effect.sync(() => {
        const differences: string[] = []
        
        if (original.success !== replayed.success) {
          differences.push(`Success mismatch: ${original.success} vs ${replayed.success}`)
        }
        
        const durationDiff = Math.abs(original.duration_ms - replayed.duration_ms)
        if (durationDiff > 100) {
          differences.push(`Duration diff: ${durationDiff}ms`)
        }
        
        return {
          match: differences.length === 0,
          differences,
        }
      })
    
    return ReplayEngine.of({
      replayTrajectory: replayTrajectoryImpl,
      compareResults: compareResultsImpl,
      setupMockEnvironment: setupMockEnvironmentImpl,
    })
  })
)

export const Test = Layer.merge(
  Layer.provide(replayEngineLayer, Layer.merge(mockEnvLayer, EvolutionDB.Test)),
  Layer.merge(mockEnvLayer, EvolutionDB.Test)
)