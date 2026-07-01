import { $ } from "bun"
import semver from "semver"
import path from "path"

// Find package.json by checking parent directories (handles monorepo and single-project layouts)
const findPackageJson = (startDir: string): string | null => {
  let dir = startDir
  for (let i = 0; i < 5; i++) {
    const pkgPath = path.join(dir, "package.json")
    if (fs.existsSync(pkgPath)) return pkgPath
    dir = path.dirname(dir)
  }
  return null
}
import fs from "fs"
const rootPkgPath = findPackageJson(import.meta.dir)
if (!rootPkgPath) throw new Error("package.json not found")
const rootPkg = await Bun.file(rootPkgPath).json()
const expectedBunVersion = rootPkg.packageManager?.split("@")[1]

if (!expectedBunVersion) {
  throw new Error("packageManager field not found in root package.json")
}

// relax version requirement
const expectedBunVersionRange = `^${expectedBunVersion}`

if (!semver.satisfies(process.versions.bun, expectedBunVersionRange)) {
  throw new Error(`This script requires bun@${expectedBunVersionRange}, but you are using bun@${process.versions.bun}`)
}

const env = {
  LCODE_CHANNEL: process.env["LCODE_CHANNEL"],
  LCODE_BUMP: process.env["LCODE_BUMP"],
  LCODE_VERSION: process.env["LCODE_VERSION"],
  LCODE_RELEASE: process.env["LCODE_RELEASE"],
}
const CHANNEL = await (async () => {
  if (env.LCODE_CHANNEL) return env.LCODE_CHANNEL
  if (env.LCODE_BUMP) return "latest"
  if (env.LCODE_VERSION && !env.LCODE_VERSION.startsWith("0.0.0-")) return "latest"
  return await $`git branch --show-current`.text().then((x) => x.trim())
})()
const IS_PREVIEW = CHANNEL !== "latest"

const VERSION = await (async () => {
  if (env.LCODE_VERSION) return env.LCODE_VERSION
  if (IS_PREVIEW) return `0.0.0-${CHANNEL}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`
  const version = await fetch("https://registry.npmjs.org/opencode-ai/latest")
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText)
      return res.json()
    })
    .then((data: any) => data.version)
  const [major, minor, patch] = version.split(".").map((x: string) => Number(x) || 0)
  const t = env.LCODE_BUMP?.toLowerCase()
  if (t === "major") return `${major + 1}.0.0`
  if (t === "minor") return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
})()

const bot = ["actions-user", "opencode", "opencode-agent[bot]"]
const teamPath = path.join(path.dirname(rootPkgPath), ".github/TEAM_MEMBERS")
const team = [
  ...(await Bun.file(teamPath)
    .text()
    .then((x) => x.split(/\r?\n/).map((x) => x.trim()))
    .then((x) => x.filter((x) => x && !x.startsWith("#")))),
  ...bot,
]

export const Script = {
  get channel() {
    return CHANNEL
  },
  get version() {
    return VERSION
  },
  get preview() {
    return IS_PREVIEW
  },
  get release(): boolean {
    return !!env.LCODE_RELEASE
  },
  get team() {
    return team
  },
}
console.log(`opencode script`, JSON.stringify(Script, null, 2))
