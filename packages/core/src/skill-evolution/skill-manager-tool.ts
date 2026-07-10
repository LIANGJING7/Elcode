import { dirname, join } from "path"
import { Context, Effect, Layer } from "effect"
import { serviceUse } from "@/core/effect/service-use"
import { FSUtil } from "@/core/fs-util"
import { SkillV2 } from "@/core/skill"
import { UsageTracker } from "./usage-tracker"
import { Global } from "@/core/global"
import { Clock } from "effect"
import os from "os"

export class SkillNotFoundError {
  readonly _tag = "SkillNotFoundError"
  constructor(readonly name: string) {}
}

export class InvalidSkillNameError {
  readonly _tag = "InvalidSkillNameError"
  constructor(readonly name: string) {}
}

const sanitizeSkillName = (name: string): Effect.Effect<string, InvalidSkillNameError> => {
  if (!name || name.includes('/') || name.includes('..') || name.includes('\\')) {
    return Effect.fail(new InvalidSkillNameError(name))
  }
  return Effect.succeed(name)
}

export interface Interface {
  readonly create: (
    name: string,
    prompt: string,
    reason: string
  ) => Effect.Effect<string, InvalidSkillNameError, FSUtil.Service | UsageTracker.Service | Clock.Clock>
  
  readonly update: (
    name: string,
    newPrompt: string,
    reason: string
  ) => Effect.Effect<void, SkillNotFoundError | InvalidSkillNameError, FSUtil.Service | SkillV2.Service | UsageTracker.Service | Clock.Clock>
  
  readonly delete: (
    name: string
  ) => Effect.Effect<void, SkillNotFoundError | InvalidSkillNameError, FSUtil.Service | SkillV2.Service | UsageTracker.Service | Global.Service>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/SkillManagerTool") {}

export const use = serviceUse(Service)

const getSkillDir = (name: string) => {
  const home = process.env.LCODE_TEST_HOME ?? os.homedir()
  return join(home, ".config", "lcode", "skills", name)
}

export const layer: Layer.Layer<
  Service,
  never,
  FSUtil.Service | SkillV2.Service | UsageTracker.Service | Global.Service | Clock.Clock
> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    const skillV2 = yield* SkillV2.Service
    const usageTracker = yield* UsageTracker.Service
    const global = yield* Global.Service

    const create = Effect.fn("SkillManagerTool.create")(function* (
      name: string,
      prompt: string,
      reason: string,
    ): string {
      const sanitizedName = yield* sanitizeSkillName(name)
      const skillDir = getSkillDir(sanitizedName)
      const skillPath = join(skillDir, "SKILL.md")
      const now = yield* Clock.currentTimeMillis
      const timestamp = new Date(now).toISOString()

      const content = `# ${sanitizedName}

${prompt}

<!-- Created: ${timestamp} -->
<!-- Reason: ${reason} -->`

      yield* Effect.logInfo("[SkillEvolution] SkillManagerTool.create", {
        skillName: sanitizedName,
        path: skillPath,
        reason,
      })
      yield* fs.ensureDir(skillDir)
      yield* fs.writeFileString(skillPath, content)

      yield* usageTracker.recordUse(sanitizedName)

      return skillPath
    })

    const update = Effect.fn("SkillManagerTool.update")(function* (
      name: string,
      newPrompt: string,
      reason: string,
    ): void {
      const sanitizedName = yield* sanitizeSkillName(name)
      const skills = yield* skillV2.list()
      const skill = skills.find((s) => s.name === sanitizedName)

      if (!skill) {
        return yield* Effect.fail(new SkillNotFoundError(sanitizedName))
      }

      const now = yield* Clock.currentTimeMillis
      const timestamp = new Date(now).toISOString()

      const updatedContent = `# ${sanitizedName}

${newPrompt}

<!-- Updated: ${timestamp} -->
<!-- Reason: ${reason} -->`

      yield* Effect.logInfo("[SkillEvolution] SkillManagerTool.update", {
        skillName: sanitizedName,
        reason,
      })
      yield* fs.writeFileString(skill.location, updatedContent)
      yield* usageTracker.recordUse(sanitizedName)
    })

    const delete_ = Effect.fn("SkillManagerTool.delete")(function* (name: string): void {
      const sanitizedName = yield* sanitizeSkillName(name)
      const skills = yield* skillV2.list()
      const skill = skills.find((s) => s.name === sanitizedName)

      if (!skill) {
        return yield* Effect.fail(new SkillNotFoundError(sanitizedName))
      }

      const skillDir = dirname(skill.location)
      const archiveDir = join(global.config, "skills", ".archive")
      const archivePath = join(archiveDir, sanitizedName)

      yield* fs.ensureDir(archiveDir)
      yield* Effect.logInfo("[SkillEvolution] SkillManagerTool.delete", {
        skillName: sanitizedName,
        archivePath,
      })
      yield* Effect.tryPromise({
        try: async () => {
          const { rename } = await import("fs/promises")
          await rename(skillDir, archivePath)
        },
        catch: (error) => error,
      })

      yield* usageTracker.markArchived(sanitizedName)
    })

    return Service.of({
      create,
      update,
      delete: delete_,
    })
  }),
)

export const defaultLayer = layer.pipe(
  Layer.provide(FSUtil.defaultLayer),
  Layer.provide(SkillV2.locationLayer),
  Layer.provide(UsageTracker.defaultLayer),
  Layer.provide(Global.defaultLayer),
)

export * as SkillManagerTool from "./skill-manager-tool"