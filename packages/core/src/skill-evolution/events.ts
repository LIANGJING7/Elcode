import { Schema } from "effect"
import { EventV2 } from "@/core/event"

export const SkillCreated = EventV2.define({
  type: "skill-evolution.skill.created",
  schema: {
    skillName: Schema.String,
    skillPath: Schema.String,
    reason: Schema.String,
  },
})

export const SkillUpdated = EventV2.define({
  type: "skill-evolution.skill.updated",
  schema: {
    skillName: Schema.String,
    oldPrompt: Schema.String,
    newPrompt: Schema.String,
    reason: Schema.String,
  },
})

export const SkillDeprecated = EventV2.define({
  type: "skill-evolution.skill.deprecated",
  schema: {
    skillName: Schema.String,
    reason: Schema.String,
    lifecycleState: Schema.String,
  },
})