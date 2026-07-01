import { run as runTui, type TuiInput } from "@/tui/deps"
import { Global } from "@/core/global"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(Global.defaultLayer))
}
