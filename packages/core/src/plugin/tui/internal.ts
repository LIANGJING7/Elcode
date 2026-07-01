import { Flag } from "@/core/flag/flag"
import { createBuiltinPlugins, type BuiltinTuiPlugin } from "@/tui/deps/feature-plugins/builtins"
import type { RuntimeFlags } from "@/effect/runtime-flags"

export type InternalTuiPlugin = BuiltinTuiPlugin

export function internalTuiPlugins(flags: Pick<RuntimeFlags.Info, "experimentalEventSystem">): InternalTuiPlugin[] {
  return createBuiltinPlugins({
    experimentalEventSystem: flags.experimentalEventSystem,
    experimentalSessionSwitcher: Flag.LCODE_EXPERIMENTAL_SESSION_SWITCHER,
  })
}
