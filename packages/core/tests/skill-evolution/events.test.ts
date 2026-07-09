import { describe, expect, test } from "bun:test"
import { SkillCreated, SkillUpdated, SkillDeprecated } from "@/skill-evolution/events"

describe("Skill Evolution Events", () => {
  test("should define SkillCreated event", () => {
    expect(SkillCreated.type).toBe("skill-evolution.skill.created")
  })

  test("should define SkillUpdated event", () => {
    expect(SkillUpdated.type).toBe("skill-evolution.skill.updated")
  })

  test("should define SkillDeprecated event", () => {
    expect(SkillDeprecated.type).toBe("skill-evolution.skill.deprecated")
  })
})