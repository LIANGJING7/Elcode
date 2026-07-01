/**
 * Render Scheduler
 * 
 * Uses requestAnimationFrame to batch consume pending deltas,
 * preventing excessive Vue re-renders from high-frequency events.
 */

import { streamingReducer, consumePendingDeltas } from './reducer'
import type { StreamingState, StreamAction } from './types'

// ============================================
// Types
// ============================================

interface SchedulerOptions {
  /** Callback to trigger Vue render */
  onRender: () => void
  /** Minimum interval between renders (ms), default 16ms (~60fps) */
  minInterval?: number
}

interface Scheduler {
  /** Schedule a render on next RAF */
  scheduleRender: () => void
  /** Cancel pending RAF */
  cancel: () => void
  /** Start the scheduler */
  start: () => void
  /** Stop the scheduler */
  stop: () => void
}

// ============================================
// Scheduler Factory
// ============================================

/**
 * Create a RAF-based render scheduler
 */
export function createRenderScheduler(options: SchedulerOptions): Scheduler {
  const { onRender, minInterval = 16 } = options
  
  let rafId: number | null = null
  let lastRenderTime = 0
  let running = false

  function tick() {
    if (!running) return
    
    const now = performance.now()
    const elapsed = now - lastRenderTime
    
    // Throttle to minInterval
    if (elapsed < minInterval) {
      rafId = requestAnimationFrame(tick)
      return
    }
    
    // Trigger render
    lastRenderTime = now
    onRender()
    
    // Continue ticking if still running
    if (running) {
      rafId = requestAnimationFrame(tick)
    }
  }

  return {
    scheduleRender() {
      // Immediate scheduling if not already scheduled
      if (rafId === null) {
        rafId = requestAnimationFrame(tick)
      }
    },

    cancel() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    },

    start() {
      if (!running) {
        running = true
        lastRenderTime = performance.now()
        rafId = requestAnimationFrame(tick)
      }
    },

    stop() {
      running = false
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }
  }
}

// ============================================
// Scheduler with State
// ============================================

interface SchedulerWithStateOptions {
  /** Get current state */
  getState: () => StreamingState
  /** Trigger Vue render */
  triggerRender: () => void
}

/**
 * Create scheduler that automatically consumes pending deltas
 */
export function createSchedulerWithState(options: SchedulerWithStateOptions): Scheduler {
  const { getState, triggerRender } = options
  
  return createRenderScheduler({
    onRender() {
      // Consume pending deltas into content - directly mutate state
      const state = getState()
      
      // Consume message pending deltas
      const messagePending = state.message.pending
      if (messagePending.length > 0) {
        // Append deltas directly - Vue tracks this on reactive arrays
        state.message.content += messagePending.join('')
        // Clear by setting length instead of creating new array
        messagePending.length = 0
      }
      
      // Consume reasoning pending deltas
      const reasoningPending = state.reasoning.pending
      if (reasoningPending.length > 0) {
        // Append deltas directly - Vue tracks this on reactive arrays
        state.reasoning.content += reasoningPending.join('')
        // Clear by setting length instead of creating new array
        reasoningPending.length = 0
      }
      
      // Trigger Vue render
      triggerRender()
    },
    minInterval: 16  // ~60fps max
  })
}

// ============================================
// Progress Throttle
// ============================================

/**
 * Throttle high-frequency progress events
 * Returns a function that only allows progress updates every `interval` ms
 */
export function createProgressThrottle(interval: number = 100) {
  let lastProgressTime = 0
  let pendingProgress: { callId: string; content: unknown[] } | null = null
  let flushScheduled = false

  return {
    /** Add progress event (may be throttled) */
    addProgress(callId: string, content: unknown[]): boolean {
      const now = Date.now()
      
      // If within throttle window, accumulate
      if (now - lastProgressTime < interval) {
        if (pendingProgress && pendingProgress.callId === callId) {
          pendingProgress.content.push(...content)
        } else {
          pendingProgress = { callId, content }
        }
        
        // Schedule flush if not already
        if (!flushScheduled) {
          flushScheduled = true
          setTimeout(() => this.flush(), interval)
        }
        
        return false  // Throttled
      }
      
      // Outside throttle window, allow immediately
      lastProgressTime = now
      return true
    },

    /** Flush accumulated progress */
    flush(): { callId: string; content: unknown[] } | null {
      flushScheduled = false
      const result = pendingProgress
      pendingProgress = null
      
      if (result) {
        lastProgressTime = Date.now()
      }
      
      return result
    },

    /** Reset throttle state */
    reset() {
      lastProgressTime = 0
      pendingProgress = null
      flushScheduled = false
    }
  }
}