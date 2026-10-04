import { z } from "zod";
export const rawMarketSchema = z.object({
  league: z.string(),
  market_id: z.string().optional(),
  market_pair: z.tuple([z.string(), z.string()]),
  volume_traded: z.record(z.string(), z.number()),
  lowest_stock: z.record(z.string(), z.number()),
  highest_stock: z.record(z.string(), z.number()),
  lowest_ratio: z.record(z.string(), z.number()),
  highest_ratio: z.record(z.string(), z.number()),
});
export type RawMarket = z.infer<typeof rawMarketSchema>;
export type Market = {
  id: string;
  league: string;
  baseId: string;
  quoteId: string;
  base: string;
  quote: string;
  baseVolume: number;
  quoteVolume: number;
  low: number | null;
  high: number | null;
  raw: RawMarket;
};
export function completedHour(now = new Date()): number {
  return Math.floor(now.getTime() / 3_600_000) * 3600 - 3600;
}
export function validateHour(hour: number, now = new Date()): number {
  if (!Number.isSafeInteger(hour) || hour < 0 || hour % 3600 !== 0 || hour > completedHour(now))
    throw new Error("Choose a completed UTC hour");
  return hour;
}
export function currencyName(id: string): string {
  return id
    .split("/")
    .pop()!
    .replace(/^Currency/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}
export function normalizeMarket(value: unknown): Market {
  const raw = rawMarketSchema.parse(value),
    [baseId, quoteId] = raw.market_pair;
  return {
    id: raw.market_id ?? raw.market_pair.join("|"),
    league: raw.league,
    baseId,
    quoteId,
    base: currencyName(baseId),
    quote: currencyName(quoteId),
    baseVolume: raw.volume_traded[baseId] ?? 0,
    quoteVolume: raw.volume_traded[quoteId] ?? 0,
    low: raw.lowest_ratio[baseId] ?? null,
    high: raw.highest_ratio[baseId] ?? null,
    raw,
  };
}
