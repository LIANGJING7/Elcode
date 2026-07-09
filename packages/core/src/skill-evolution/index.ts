import { Layer } from "effect"
import { BackgroundReviewer } from "./background-reviewer"
import { SkillManagerTool } from "./skill-manager-tool"
import { UsageTracker } from "./usage-tracker"
import { SkillCurator } from "./curator"

export const SkillEvolutionLive = Layer.mergeAll(
  BackgroundReviewer.defaultLayer,
  SkillManagerTool.defaultLayer,
  UsageTracker.defaultLayer,
  SkillCurator.defaultLayer,
)

export { BackgroundReviewer } from "./background-reviewer"
export { SkillManagerTool } from "./skill-manager-tool"
export { UsageTracker } from "./usage-tracker"
export { SkillCurator } from "./curator"
export { LifecycleState, type ReviewResult, type UsageStats } from "./types"
export { SkillCreated, SkillUpdated, SkillDeprecated } from "./events"
