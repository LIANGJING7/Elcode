import { describe, expect, test } from "bun:test"
import { SkillCreated, SkillUpdated, SkillDeprecated } from "@/skill-evolution/events"

describe("Skill Evolution Events", () => {
  test("should define SkillCreated event type", () => {
    expect(SkillCreated.type).toBe("skill-evolution.skill.created")
  })

  test("should define SkillUpdated event type", () => {
    expect(SkillUpdated.type).toBe("skill-evolution.skill.updated")
  })

  test("should define SkillDeprecated event type", () => {
    expect(SkillDeprecated.type).toBe("skill-evolution.skill.deprecated")
  })

  test("should have valid schema for SkillCreated payload", () => {
    expect(SkillCreated.data).toBeDefined()
    expect(Object.keys(SkillCreated.data.fields)).toContain("skillName")
    expect(Object.keys(SkillCreated.data.fields)).toContain("skillPath")
    expect(Object.keys(SkillCreated.data.fields)).toContain("reason")
  })

  test("should have valid schema for SkillUpdated payload", () => {
    expect(SkillUpdated.data).toBeDefined()
    expect(Object.keys(SkillUpdated.data.fields)).toContain("skillName")
    expect(Object.keys(SkillUpdated.data.fields)).toContain("oldPrompt")
    expect(Object.keys(SkillUpdated.data.fields)).toContain("newPrompt")
    expect(Object.keys(SkillUpdated.data.fields)).toContain("reason")
  })

  test("should have valid schema for SkillDeprecated payload", () => {
    expect(SkillDeprecated.data).toBeDefined()
    expect(Object.keys(SkillDeprecated.data.fields)).toContain("skillName")
    expect(Object.keys(SkillDeprecated.data.fields)).toContain("reason")
    expect(Object.keys(SkillDeprecated.data.fields)).toContain("lifecycleState")
  })
})