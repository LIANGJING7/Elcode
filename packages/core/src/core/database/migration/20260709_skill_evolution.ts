import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20260709_skill_evolution",
  up(tx) {
    return Effect.gen(function* () {
      yield* tx.run(`
        CREATE TABLE skill_usage (
          skill_name TEXT PRIMARY KEY,
          use_count INTEGER DEFAULT 0,
          last_used_at INTEGER,
          first_used_at INTEGER,
          lifecycle_state TEXT DEFAULT 'active',
          time_created INTEGER NOT NULL,
          time_updated INTEGER NOT NULL
        );
      `)
      
      yield* tx.run(`
        CREATE INDEX idx_skill_usage_lifecycle ON skill_usage (lifecycle_state);
      `)
      
      yield* tx.run(`
        CREATE INDEX idx_skill_usage_last_used ON skill_usage (last_used_at);
      `)
    })
  },
} satisfies DatabaseMigration.Migration