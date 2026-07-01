// Entry point spawned by the Electron main process to run the @model-agent/core
// HTTP server. Kept as a real source file (not a temp file) so that:
//   - it is version-controlled and linted,
//   - it survives packaging (built into dist/main alongside index.js),
//   - we avoid shell-quoting issues from `bun --eval "<multiline>"`.
//
// Uses the public export from @model-agent/core/server instead of internal path.
import { listen } from "@model-agent/core/server"

listen({ port: 0, hostname: "localhost", mdns: false })
  .then((l) => console.log("PORT:" + l.port))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })