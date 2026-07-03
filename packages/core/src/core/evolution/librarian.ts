import { Effect, Layer, Context, Ref } from "effect"
import * as Schema from "./schema"
import * as fs from "fs/promises"
import * as path from "path"

export interface SkillFile {
  readonly skillId: Schema.SkillId
  readonly skillName: string
  readonly filePath: string
  readonly content: string
  readonly indexedAt: number
  readonly anchors: string[]
}

export interface LibrarianInterface {
  readonly indexSkill: (skillPath: string) => Effect.Effect<SkillFile>
  readonly searchSkills: (query: string) => Effect.Effect<SkillFile[]>
  readonly getSkill: (skillId: Schema.SkillId) => Effect.Effect<SkillFile | null>
  readonly updateSkill: (skillId: Schema.SkillId, content: string) => Effect.Effect<void>
  readonly extractAnchors: (content: string) => string[]
}

export class Librarian extends Context.Service<Librarian, LibrarianInterface>()("@opencode/evolution/Librarian") {}

export const librarianLayer: Layer.Layer<Librarian, never, never> = Layer.effect(
  Librarian,
  Effect.gen(function* () {
    const skillsIndexRef = yield* Ref.make<Map<Schema.SkillId, SkillFile>>(new Map())
    
    const extractAnchorsImpl = (content: string): string[] => {
      const anchorPatterns = [
        /## Key Decisions\n([^\n]+)/g,
        /## Constraints\n([^\n]+)/g,
        /## Patterns\n([^\n]+)/g,
        /CRITICAL: ([^\n]+)/g,
        /IMPORTANT: ([^\n]+)/g,
      ]
      
      const anchors: string[] = []
      for (const pattern of anchorPatterns) {
        const matches = content.matchAll(pattern)
        for (const match of matches) {
          if (match[1]) anchors.push(match[1].trim())
        }
      }
      
      return anchors.slice(0, 10)
    }
    
    const indexSkillImpl = (skillPath: string): Effect.Effect<SkillFile> =>
      Effect.gen(function* () {
        const content = yield* Effect.tryPromise({
          try: () => fs.readFile(skillPath, "utf-8"),
          catch: (e) => new Error(`Failed to read skill file: ${e}`),
        })
        
        const skillName = path.basename(skillPath, ".md")
        const skillId = `skill_${skillName}_${Date.now()}` as Schema.SkillId
        const anchors = extractAnchorsImpl(content)
        
        const skillFile: SkillFile = {
          skillId,
          skillName,
          filePath: skillPath,
          content,
          indexedAt: Date.now(),
          anchors,
        }
        
        yield* Ref.update(skillsIndexRef, map => {
          const newMap = new Map(map)
          newMap.set(skillId, skillFile)
          return newMap
        })
        
        return skillFile
      })
    
    const searchSkillsImpl = (query: string): Effect.Effect<SkillFile[]> =>
      Effect.gen(function* () {
        const skills = yield* Ref.get(skillsIndexRef)
        const queryLower = query.toLowerCase()
        
        return Array.from(skills.values()).filter(skill => 
          skill.skillName.toLowerCase().includes(queryLower) ||
          skill.content.toLowerCase().includes(queryLower) ||
          skill.anchors.some(a => a.toLowerCase().includes(queryLower))
        )
      })
    
    const getSkillImpl = (skillId: Schema.SkillId): Effect.Effect<SkillFile | null> =>
      Effect.gen(function* () {
        const skills = yield* Ref.get(skillsIndexRef)
        return skills.get(skillId) || null
      })
    
    const updateSkillImpl = (skillId: Schema.SkillId, content: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        const skills = yield* Ref.get(skillsIndexRef)
        const existing = skills.get(skillId)
        
        if (!existing) throw new Error(`Skill ${skillId} not found`)
        
        const updated: SkillFile = {
          ...existing,
          content,
          anchors: extractAnchorsImpl(content),
          indexedAt: Date.now(),
        }
        
        yield* Ref.update(skillsIndexRef, map => {
          const newMap = new Map(map)
          newMap.set(skillId, updated)
          return newMap
        })
        
        yield* Effect.tryPromise({
          try: () => fs.writeFile(existing.filePath, content, "utf-8"),
          catch: (e) => new Error(`Failed to write skill file: ${e}`),
        })
      })
    
    return Librarian.of({
      indexSkill: indexSkillImpl,
      searchSkills: searchSkillsImpl,
      getSkill: getSkillImpl,
      updateSkill: updateSkillImpl,
      extractAnchors: extractAnchorsImpl,
    })
  })
)

export const Test = Layer.effect(
  Librarian,
  Effect.gen(function* () {
    const skillsRef = yield* Ref.make<Map<Schema.SkillId, SkillFile>>(new Map())
    
    return Librarian.of({
      indexSkill: (skillPath) =>
        Effect.gen(function* () {
          const skillName = path.basename(skillPath, ".md")
          const skillId = `test_${skillName}` as Schema.SkillId
          const skill: SkillFile = {
            skillId,
            skillName,
            filePath: skillPath,
            content: "Test skill content",
            indexedAt: Date.now(),
            anchors: [],
          }
          yield* Ref.update(skillsRef, m => {
            const n = new Map(m)
            n.set(skillId, skill)
            return n
          })
          return skill
        }),
      searchSkills: (query) =>
        Effect.gen(function* () {
          const skills = yield* Ref.get(skillsRef)
          return Array.from(skills.values()).filter(s => s.skillName.includes(query))
        }),
      getSkill: (skillId) =>
        Effect.gen(function* () {
          const skills = yield* Ref.get(skillsRef)
          return skills.get(skillId) || null
        }),
      updateSkill: (skillId, content) =>
        Effect.gen(function* () {
          const skills = yield* Ref.get(skillsRef)
          const existing = skills.get(skillId)
          if (existing) {
            yield* Ref.update(skillsRef, m => {
              const n = new Map(m)
              n.set(skillId, { ...existing, content })
              return n
            })
          }
        }),
      extractAnchors: (content) => ["test_anchor"],
    })
  })
)