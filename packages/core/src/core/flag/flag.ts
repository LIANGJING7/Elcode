import { Config } from "effect"

export function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

const copy = process.env["LCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]

function enabledByExperimental(key: string) {
  return process.env[key] === undefined ? truthy("LCODE_EXPERIMENTAL") : truthy(key)
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  LCODE_AUTO_HEAP_SNAPSHOT: truthy("LCODE_AUTO_HEAP_SNAPSHOT"),
  LCODE_GIT_BASH_PATH: process.env["LCODE_GIT_BASH_PATH"],
  LCODE_CONFIG: process.env["LCODE_CONFIG"],
  LCODE_CONFIG_CONTENT: process.env["LCODE_CONFIG_CONTENT"],
  LCODE_DISABLE_AUTOUPDATE: truthy("LCODE_DISABLE_AUTOUPDATE"),
  LCODE_ALWAYS_NOTIFY_UPDATE: truthy("LCODE_ALWAYS_NOTIFY_UPDATE"),
  LCODE_DISABLE_PRUNE: truthy("LCODE_DISABLE_PRUNE"),
  LCODE_DISABLE_TERMINAL_TITLE: truthy("LCODE_DISABLE_TERMINAL_TITLE"),
  LCODE_SHOW_TTFD: truthy("LCODE_SHOW_TTFD"),
  LCODE_DISABLE_AUTOCOMPACT: truthy("LCODE_DISABLE_AUTOCOMPACT"),
  LCODE_DISABLE_MODELS_FETCH: truthy("LCODE_DISABLE_MODELS_FETCH"),
  LCODE_DISABLE_MOUSE: truthy("LCODE_DISABLE_MOUSE"),
  LCODE_FAKE_VCS: process.env["LCODE_FAKE_VCS"],
  LCODE_SERVER_PASSWORD: process.env["LCODE_SERVER_PASSWORD"],
  LCODE_SERVER_USERNAME: process.env["LCODE_SERVER_USERNAME"],

  // Experimental
  LCODE_EXPERIMENTAL_FILEWATCHER: Config.boolean("LCODE_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  LCODE_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("LCODE_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  LCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("LCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
  LCODE_MODELS_URL: process.env["LCODE_MODELS_URL"],
  LCODE_MODELS_PATH: process.env["LCODE_MODELS_PATH"],
  LCODE_DB: process.env["LCODE_DB"],

  LCODE_WORKSPACE_ID: process.env["LCODE_WORKSPACE_ID"],
  LCODE_EXPERIMENTAL_WORKSPACES: enabledByExperimental("LCODE_EXPERIMENTAL_WORKSPACES"),
  LCODE_EXPERIMENTAL_SESSION_SWITCHER: enabledByExperimental("LCODE_EXPERIMENTAL_SESSION_SWITCHER"),

  // Evaluated at access time (not module load) because tests, the CLI, and
  // external tooling set these env vars at runtime.
  get LCODE_DISABLE_PROJECT_CONFIG() {
    return truthy("LCODE_DISABLE_PROJECT_CONFIG")
  },
  get LCODE_EXPERIMENTAL_REFERENCES() {
    return enabledByExperimental("LCODE_EXPERIMENTAL_REFERENCES")
  },
  get LCODE_TUI_CONFIG() {
    return process.env["LCODE_TUI_CONFIG"]
  },
  get LCODE_CONFIG_DIR() {
    return process.env["LCODE_CONFIG_DIR"]
  },
  get LCODE_PURE() {
    return truthy("LCODE_PURE")
  },
  get LCODE_PERMISSION() {
    return process.env["LCODE_PERMISSION"]
  },
  get LCODE_PLUGIN_META_FILE() {
    return process.env["LCODE_PLUGIN_META_FILE"]
  },
  get LCODE_CLIENT() {
    return process.env["LCODE_CLIENT"] ?? "cli"
  },
}
