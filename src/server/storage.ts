import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import { records } from "./db/schema";
import { ApiError } from "./responses";
let connection: ReturnType<typeof postgres> | undefined;
export function getDatabase() {
  if (!process.env.DATABASE_URL)
    throw new ApiError("Configure PostgreSQL in Settings to connect an account", 503);
  connection ??= postgres(process.env.DATABASE_URL, { max: 5, connect_timeout: 10 });
  return drizzle(connection);
}
export async function setupDatabase() {
  await getDatabase().execute(
    sql`CREATE TABLE IF NOT EXISTS atlas_records (key TEXT PRIMARY KEY, value JSONB NOT NULL, expires_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  );
}
export async function getRecord<T>(key: string): Promise<T | null> {
  const [row] = await getDatabase().select().from(records).where(eq(records.key, key)).limit(1);
  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    await deleteRecord(key);
    return null;
  }
  return row.value as T;
}
export async function putRecord(key: string, value: unknown, ttlSeconds?: number) {
  await getDatabase()
    .insert(records)
    .values({
      key,
      value,
      expiresAt: ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: records.key,
      set: {
        value,
        expiresAt: ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null,
        updatedAt: new Date(),
      },
    });
}
export async function deleteRecord(key: string) {
  await getDatabase().delete(records).where(eq(records.key, key));
}
export async function closeDatabase() {
  await connection?.end();
}
