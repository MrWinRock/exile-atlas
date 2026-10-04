import { isIP } from "node:net";
import { completedHour, validateHour } from "../lib/currency";
import { connectedRedis, fingerprint } from "./cache";
import { ApiError } from "./responses";

const visitorLimit = 60;
const globalLimit = 600;
const counters = new Map<string, { count: number; expires: number }>();
const countRequest = `
local visitor = redis.call('INCR', KEYS[1])
if visitor == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
if visitor > tonumber(ARGV[1]) then return {visitor, 0} end
local total = redis.call('INCR', KEYS[2])
if total == 1 then redis.call('PEXPIRE', KEYS[2], ARGV[2]) end
return {visitor, total}
`;

function increment(key: string, expires: number) {
  if (counters.size >= 4096) {
    for (const [name, value] of counters) {
      if (value.expires <= Date.now()) counters.delete(name);
    }
    if (counters.size >= 4096 && !counters.has(key))
      throw new ApiError("Too many data requests. Try again shortly.", 429, 60);
  }
  const value = counters.get(key) ?? { count: 0, expires };
  value.count++;
  counters.set(key, value);
  return value.count;
}

export async function assertPublicRequestLimit(request: Request) {
  // NPM overwrites X-Real-IP with its peer's address. Arbitrary forwarded chains
  // are ignored. Enable this only with the backend behind the trusted proxy.
  const address = request.headers.get("x-real-ip") ?? "";
  const visitor =
    process.env.TRUST_PROXY === "true" && isIP(address) ? fingerprint(address) : "direct";
  const now = Date.now();
  const window = Math.floor(now / 60_000);
  const expires = (window + 1) * 60_000;
  const visitorKey = `ingress:${window}:${visitor}`;
  const globalKey = `ingress:${window}:global`;
  const redis = await connectedRedis();
  let count: number;
  let total: number;
  if (redis) {
    [count, total] = (await redis.eval(
      countRequest,
      2,
      visitorKey,
      globalKey,
      visitorLimit,
      expires - now,
    )) as [number, number];
  } else {
    count = increment(visitorKey, expires);
    total = count <= visitorLimit ? increment(globalKey, expires) : 0;
  }
  if (count > visitorLimit || total > globalLimit)
    throw new ApiError(
      "Too many data requests. Try again shortly.",
      429,
      Math.max(1, Math.ceil((expires - now) / 1000)),
    );
}

export function validatePublicCurrencyHour(hour: number) {
  try {
    validateHour(hour);
  } catch {
    throw new ApiError("Choose a completed UTC hour");
  }
  if (hour < completedHour() - (30 * 24 - 1) * 3600)
    throw new ApiError("Choose an hour within the last 30 days");
}
