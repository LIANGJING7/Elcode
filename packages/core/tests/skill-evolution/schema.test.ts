import { describe, expect, test } from "bun:test"
import { skill_usage } from "@/skill-evolution/schema"

describe("Skill Evolution Schema", () => {
  test("should define skill_usage table", () => {
    expect(skill_usage).toBeDefined()
  })

  test("should have skill_name as primary key", () => {
    expect(skill_usage.skill_name).toBeDefined()
  })

  test("should have use_count field", () => {
    expect(skill_usage.use_count).toBeDefined()
  })

  test("should have lifecycle_state field", () => {
    expect(skill_usage.lifecycle_state).toBeDefined()
  })

  test("should have timestamp fields", () => {
    expect(skill_usage.time_created).toBeDefined()
    expect(skill_usage.time_updated).toBeDefined()
  })
})