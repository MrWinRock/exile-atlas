import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
export const records = pgTable("atlas_records", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
