import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
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

  describe("Schema Validation", () => {
    test("should validate valid SkillCreated data", () => {
      const result = Schema.decodeUnknownSync(SkillCreated.data)({
        skillName: "test-skill",
        skillPath: "/test/path",
        reason: "initial creation",
      })
      expect(result).toEqual({
        skillName: "test-skill",
        skillPath: "/test/path",
        reason: "initial creation",
      })
    })

    test("should reject SkillCreated data with missing fields", () => {
      expect(() =>
        Schema.decodeUnknownSync(SkillCreated.data)({
          skillName: "test-skill",
        }),
      ).toThrow()
    })

    test("should reject SkillCreated data with wrong field types", () => {
      expect(() =>
        Schema.decodeUnknownSync(SkillCreated.data)({
          skillName: "test-skill",
          skillPath: 123,
          reason: "test",
        }),
      ).toThrow()
    })

    test("should validate valid SkillUpdated data", () => {
      const result = Schema.decodeUnknownSync(SkillUpdated.data)({
        skillName: "test-skill",
        oldPrompt: "old",
        newPrompt: "new",
        reason: "update",
      })
      expect(result).toEqual({
        skillName: "test-skill",
        oldPrompt: "old",
        newPrompt: "new",
        reason: "update",
      })
    })

    test("should reject SkillUpdated data with missing required fields", () => {
      expect(() =>
        Schema.decodeUnknownSync(SkillUpdated.data)({
          skillName: "test-skill",
          oldPrompt: "old",
        }),
      ).toThrow()
    })

    test("should validate valid SkillDeprecated data", () => {
      const result = Schema.decodeUnknownSync(SkillDeprecated.data)({
        skillName: "test-skill",
        reason: "deprecated",
        lifecycleState: "archived",
      })
      expect(result).toEqual({
        skillName: "test-skill",
        reason: "deprecated",
        lifecycleState: "archived",
      })
    })

    test("should reject SkillDeprecated data with missing required fields", () => {
      expect(() =>
        Schema.decodeUnknownSync(SkillDeprecated.data)({
          skillName: "test-skill",
        }),
      ).toThrow()
    })

    test("should verify SkillCreated schema field types are String", () => {
      const fields = SkillCreated.data.fields
      expect(fields.skillName).toBe(Schema.String)
      expect(fields.skillPath).toBe(Schema.String)
      expect(fields.reason).toBe(Schema.String)
    })

    test("should verify SkillUpdated schema field types are String", () => {
      const fields = SkillUpdated.data.fields
      expect(fields.skillName).toBe(Schema.String)
      expect(fields.oldPrompt).toBe(Schema.String)
      expect(fields.newPrompt).toBe(Schema.String)
      expect(fields.reason).toBe(Schema.String)
    })

    test("should verify SkillDeprecated schema field types are String", () => {
      const fields = SkillDeprecated.data.fields
      expect(fields.skillName).toBe(Schema.String)
      expect(fields.reason).toBe(Schema.String)
      expect(fields.lifecycleState).toBe(Schema.String)
    })
  })
})