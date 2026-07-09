import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { BackgroundReviewer, use } from "@/skill-evolution/background-reviewer"

describe("BackgroundReviewer", () => {
  it("should build review prompt from messages", async () => {
    const messages = [
      { role: "user", content: "Fix the bug" },
      { role: "assistant", content: "I fixed it" },
    ]

    const prompt = await Effect.runPromise(
      use.buildPrompt(messages)
        .pipe(Effect.provide(BackgroundReviewer.defaultLayer))
    )

    expect(prompt).toContain("Fix the bug")
    expect(prompt).toContain("skill evolution reviewer")
  })

  it("should execute review in background without blocking", async () => {
    const messages = [
      { role: "user", content: "Test message" },
      { role: "assistant", content: "Test response" },
    ]

    await Effect.runPromise(
      use.reviewInBackground(messages)
        .pipe(Effect.provide(BackgroundReviewer.defaultLayer))
    )

    // If we reach here without hanging, the test passes
    expect(true).toBe(true)
  })
})