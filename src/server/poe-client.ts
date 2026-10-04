import { getConfig } from "./config";
import { ApiError } from "./responses";
import { rateLimitDelay } from "../lib/poe";
import { cacheDelete, cacheGet, cacheSet, fingerprint, withLock } from "./cache";
export async function invalidateJson(url: string, token?: string) {
  await cacheDelete(`http:${token ? fingerprint(token) : "public"}:${fingerprint(url)}`);
}
export async function fetchJson<T>(
  url: string,
  token?: string,
  ttl = 60,
  init: RequestInit = {},
): Promise<T> {
  const config = getConfig(),
    owner = token ? fingerprint(token) : "public",
    key = `http:${owner}:${fingerprint(url)}`,
    bucket = `limit:${fingerprint(config.clientId || "public")}:${new URL(url).host}`;
  const cached = init.method ? null : await cacheGet<T>(key);
  if (cached) return cached;
  return withLock(
    bucket,
    async () => {
      const until = await cacheGet<number>(bucket);
      if (until && until > Date.now())
        throw new ApiError(
          "GGG's request limit is cooling down. Try again shortly.",
          429,
          Math.ceil((until - Date.now()) / 1000),
        );
      const response = await fetch(url, {
        ...init,
        headers: {
          "User-Agent": config.userAgent,
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
      });
      const delay = rateLimitDelay(response.headers);
      if (delay) await cacheSet(bucket, Date.now() + delay, delay / 1000);
      if (!response.ok) {
        if (response.status === 401)
          throw new ApiError("Your GGG connection expired. Reconnect your account.", 401);
        if (response.status === 403)
          throw new ApiError("GGG has not granted this application's required scope.", 403);
        if (response.status === 429)
          throw new ApiError(
            "GGG's API is temporarily rate limited.",
            429,
            Math.ceil(delay / 1000) || 60,
          );
        if (response.status === 404) throw new ApiError("GGG has no data for this request.", 404);
        throw new ApiError("GGG's data service is unavailable. Try again shortly.", 502);
      }
      const data = (await response.json()) as T;
      if (!init.method) await cacheSet(key, data, ttl);
      return data;
    },
    true,
  );
}
