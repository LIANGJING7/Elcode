import { describe, expect, test } from "bun:test"
import { LifecycleState } from "@/skill-evolution/types"

describe("Skill Evolution Types", () => {
  test("should define LifecycleState enum", () => {
    expect(LifecycleState.ACTIVE).toBe("active")
    expect(LifecycleState.STALE).toBe("stale")
    expect(LifecycleState.ARCHIVED).toBe("archived")
  })
})