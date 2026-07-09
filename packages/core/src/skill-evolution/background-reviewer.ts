import { Context, Effect, Layer, Schema } from "effect"
import { serviceUse } from "@/core/effect/service-use"
import { SkillV2 } from "@/core/skill"
import { SkillManagerTool } from "./skill-manager-tool"
import { EventV2 } from "@/core/event"
import { FSUtil } from "@/core/fs-util"
import { SkillCreated, SkillUpdated } from "./events"
import { ReviewResultSchema, type ReviewResult } from "./types"

export interface Interface {
  readonly buildPrompt: (
    messages: Array<{ role: string; content: string }>
  ) => Effect.Effect<string, never, SkillV2.Service>
  readonly review: (
    messages: Array<{ role: string; content: string }>
  ) => Effect.Effect<void, never, SkillV2.Service | SkillManagerTool.Service | EventV2.Service>
  readonly reviewInBackground: (
    messages: Array<{ role: string; content: string }>
  ) => Effect.Effect<void, never, SkillV2.Service | SkillManagerTool.Service | EventV2.Service>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/BackgroundReviewer") {}

export const use = serviceUse(Service)

export const layer: Layer.Layer<Service, never, SkillV2.Service | SkillManagerTool.Service | EventV2.Service> =
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const skillV2 = yield* SkillV2.Service
      const skillManager = yield* SkillManagerTool.Service
      const events = yield* EventV2.Service

      const buildPrompt = Effect.fn("BackgroundReviewer.buildPrompt")(function* (
        messages: Array<{ role: string; content: string }>,
      ): string {
        const skills = yield* skillV2.list()
        const skillNames = skills.map((s) => s.name).join(", ")

        const recentMessages = messages.slice(-10)
        const conversationSummary = recentMessages.map((m) => `${m.role}: ${m.content.slice(0, 200)}`).join("\n\n")

        return `You are a skill evolution reviewer. Analyze the conversation and decide if any skill should be created or updated.

Existing skills: ${skillNames}

Recent conversation:
${conversationSummary}

Your task:
1. Identify repetitive patterns that could become a reusable skill
2. Detect corrections or improvements to existing skills
3. Decide if updates are needed

Respond with JSON:
{
  "shouldUpdate": boolean,
  "confidence": number (0-1),
  "updates": [
    {
      "type": "create" | "update",
      "skillName": string,
      "newPrompt": string,
      "reason": string
    }
  ]
}

Guidelines:
- Create skill only if pattern appears 2+ times with success
- Update skill only if correction significantly improves it
- Set confidence > 0.7 only for clear improvements
- Prefer updating existing skills over creating new ones`
      })

      const review = Effect.fn("BackgroundReviewer.review")(function* (
        messages: Array<{ role: string; content: string }>,
      ): void {
        const prompt = yield* buildPrompt(messages)

        // TODO: LLM Integration Point
        // In production, this would call the LLM with structured output:
        // const result = yield* llm.generateStructured(prompt, { schema: ReviewResultSchema })
        // The LLM would analyze the conversation and decide:
        // - Whether to create/update/delete skills
        // - What changes to make
        // - Confidence level for each decision
        //
        // For now, return a safe default that never creates skills automatically.
        // This prevents unintended skill modifications during testing.

        const result: ReviewResult = {
          shouldUpdate: false,
          confidence: 0,
          updates: [],
        }

        if (result.shouldUpdate && result.confidence > 0.7) {
          for (const update of result.updates) {
            if (update.type === "create" && update.skillName && update.newPrompt) {
              const path = yield* skillManager.create(
                update.skillName,
                update.newPrompt,
                update.reason || "Auto-created from conversation",
              )
              yield* events.publish(SkillCreated, {
                skillName: update.skillName,
                skillPath: path,
                reason: update.reason || "Auto-created",
              })
            } else if (update.type === "update" && update.skillName && update.newPrompt) {
              const oldSkill = yield* skillV2.get(update.skillName)
              const oldPrompt = oldSkill?.content || ""
              
              yield* skillManager.update(
                update.skillName,
                update.newPrompt,
                update.reason || "Auto-updated from conversation",
              )
              yield* events.publish(SkillUpdated, {
                skillName: update.skillName,
                oldPrompt: oldPrompt,
                newPrompt: update.newPrompt,
                reason: update.reason || "Auto-updated",
              })
            }
          }
        }
      })

      const reviewInBackground = Effect.fn("BackgroundReviewer.reviewInBackground")(function* (
        messages: Array<{ role: string; content: string }>,
      ): void {
        yield* review(messages).pipe(
          Effect.catchCause((cause) =>
            Effect.logError("Background skill review failed", { cause })
          ),
          Effect.forkDetach
        )
      })

      return Service.of({
        buildPrompt,
        review,
        reviewInBackground,
      })
    }),
  )

export const defaultLayer = layer.pipe(
  Layer.provide(SkillV2.locationLayer),
  Layer.provide(SkillManagerTool.defaultLayer),
  Layer.provide(EventV2.defaultLayer),
  Layer.provide(FSUtil.defaultLayer),
)

export * as BackgroundReviewer from "./background-reviewer"