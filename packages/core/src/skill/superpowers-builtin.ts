import type { Info } from "./index"

import brainstormingMd from "./superpowers/brainstorming/SKILL.md"
import dispatchingParallelAgentsMd from "./superpowers/dispatching-parallel-agents/SKILL.md"
import executingPlansMd from "./superpowers/executing-plans/SKILL.md"
import finishingADevelopmentBranchMd from "./superpowers/finishing-a-development-branch/SKILL.md"
import receivingCodeReviewMd from "./superpowers/receiving-code-review/SKILL.md"
import requestingCodeReviewMd from "./superpowers/requesting-code-review/SKILL.md"
import subagentDrivenDevelopmentMd from "./superpowers/subagent-driven-development/SKILL.md"
import systematicDebuggingMd from "./superpowers/systematic-debugging/SKILL.md"
import testDrivenDevelopmentMd from "./superpowers/test-driven-development/SKILL.md"
import usingGitWorktreesMd from "./superpowers/using-git-worktrees/SKILL.md"
import usingSuperpowersMd from "./superpowers/using-superpowers/SKILL.md"
import verificationBeforeCompletionMd from "./superpowers/verification-before-completion/SKILL.md"
import writingPlansMd from "./superpowers/writing-plans/SKILL.md"
import writingSkillsMd from "./superpowers/writing-skills/SKILL.md"

type BuiltinSkill = {
  name: string
  description: string
  content: string
}

const SKILLS: BuiltinSkill[] = [
  {
    name: "brainstorming",
    description:
      "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.",
    content: brainstormingMd,
  },
  {
    name: "dispatching-parallel-agents",
    description: "Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies",
    content: dispatchingParallelAgentsMd,
  },
  {
    name: "executing-plans",
    description: "Use when you have a written implementation plan to execute in a separate session with review checkpoints",
    content: executingPlansMd,
  },
  {
    name: "finishing-a-development-branch",
    description:
      "Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup",
    content: finishingADevelopmentBranchMd,
  },
  {
    name: "receiving-code-review",
    description:
      "Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation",
    content: receivingCodeReviewMd,
  },
  {
    name: "requesting-code-review",
    description: "Use when completing tasks, implementing major features, or before merging to verify work meets requirements",
    content: requestingCodeReviewMd,
  },
  {
    name: "subagent-driven-development",
    description: "Use when executing implementation plans with independent tasks in the current session",
    content: subagentDrivenDevelopmentMd,
  },
  {
    name: "systematic-debugging",
    description: "Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes",
    content: systematicDebuggingMd,
  },
  {
    name: "test-driven-development",
    description: "Use when implementing any feature or bugfix, before writing implementation code",
    content: testDrivenDevelopmentMd,
  },
  {
    name: "using-git-worktrees",
    description:
      "Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback",
    content: usingGitWorktreesMd,
  },
  {
    name: "using-superpowers",
    description:
      "Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions",
    content: usingSuperpowersMd,
  },
  {
    name: "verification-before-completion",
    description:
      "Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always",
    content: verificationBeforeCompletionMd,
  },
  {
    name: "writing-plans",
    description: "Use when you have a spec or requirements for a multi-step task, before touching code",
    content: writingPlansMd,
  },
  {
    name: "writing-skills",
    description: "Use when creating new skills, editing existing skills, or verifying skills work before deployment",
    content: writingSkillsMd,
  },
]

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/)
  return match ? match[1] : content
}

export function getSuperpowersSkills(): Info[] {
  return SKILLS.map((skill) => ({
    name: skill.name,
    description: skill.description,
    location: `<builtin:superpowers/${skill.name}>`,
    content: skill.content,
  }))
}

export const SUPERPOWERS_BOOTSTRAP_SKILL = "using-superpowers"

const BOOTSTRAP_CACHE: { content: string | null } = { content: null }

export function getBootstrapContent(): string | null {
  if (BOOTSTRAP_CACHE.content !== null) return BOOTSTRAP_CACHE.content

  const skill = SKILLS.find((s) => s.name === SUPERPOWERS_BOOTSTRAP_SKILL)
  if (!skill) {
    BOOTSTRAP_CACHE.content = ""
    return null
  }

  const content = stripFrontmatter(skill.content)

  const toolMapping = `**Tool Mapping for OpenCode:**
When skills request actions, substitute OpenCode equivalents:
- Create or update todos → \`todowrite\`
- \`Subagent (general-purpose):\` → \`task\` with \`subagent_type: "general"\`
- Invoke a skill → OpenCode's native \`skill\` tool
- Read files → \`read\`
- Create, edit, or delete files → \`edit\` (use \`write\` for new files)
- Run shell commands → \`bash\`
- Search files → \`grep\`, \`glob\`
- Fetch a URL → \`webfetch\`

Use OpenCode's native \`skill\` tool to list and load skills.`

  BOOTSTRAP_CACHE.content = `<EXTREMELY_IMPORTANT>
You have superpowers.

**IMPORTANT: The using-superpowers skill content is included below. It is ALREADY LOADED - you are currently following it. Do NOT use the skill tool to load "using-superpowers" again - that would be redundant.**

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

${content}

${toolMapping}
</EXTREMELY_IMPORTANT>`

  return BOOTSTRAP_CACHE.content
}

export const SUPERPOWERS_SKILL_NAMES = SKILLS.map((s) => s.name)