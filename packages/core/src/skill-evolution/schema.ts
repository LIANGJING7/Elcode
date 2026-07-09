import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { Timestamps } from "@/core/database/schema.sql"

export const skill_usage = sqliteTable("skill_usage", {
  skill_name: text("skill_name").primaryKey(),
  use_count: integer("use_count").default(0),
  last_used_at: integer("last_used_at"),
  first_used_at: integer("first_used_at"),
  lifecycle_state: text("lifecycle_state").default("active"),
  ...Timestamps,
})