import Redis from "ioredis";
import { createHash, randomUUID } from "node:crypto";
import { ApiError } from "./responses";
let redis: Redis | undefined;
export function getRedis() {
  if (!process.env.REDIS_URL) return undefined;
  redis ??= new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  return redis;
}
async function connectedRedis() {
  const client = getRedis();
  if (client && client.status === "wait") await client.connect();
  return client;
}
const memory = new Map<string, { data: unknown; expires: number }>();
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = await connectedRedis();
  if (client) {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  }
  const value = memory.get(key);
  if (!value || value.expires < Date.now()) {
    memory.delete(key);
    return null;
  }
  return value.data as T;
}
export async function cacheSet(key: string, data: unknown, seconds: number) {
  const client = await connectedRedis();
  if (client) {
    await client.set(key, JSON.stringify(data), "EX", Math.max(1, Math.ceil(seconds)));
    return;
  }
  if (memory.size > 2000) memory.clear();
  memory.set(key, { data, expires: Date.now() + seconds * 1000 });
}
export async function cacheDelete(key: string) {
  const client = await connectedRedis();
  if (client) await client.del(key);
  else memory.delete(key);
}
export function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
const locks = new Set<string>();
export async function withLock<T>(key: string, task: () => Promise<T>, wait = false): Promise<T> {
  const client = await connectedRedis();
  const id = randomUUID();
  const deadline = Date.now() + 30000;
  while (true) {
    const acquired = client
      ? !!(await client.set("lock:" + key, id, "EX", 60, "NX"))
      : !locks.has(key);
    if (acquired) {
      if (!client) locks.add(key);
      break;
    }
    if (!wait || Date.now() >= deadline)
      throw new ApiError("A refresh is already in progress. Try again shortly.", 429, 2);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  try {
    return await task();
  } finally {
    if (client)
      await client.eval(
        "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
        1,
        "lock:" + key,
        id,
      );
    else locks.delete(key);
  }
}
